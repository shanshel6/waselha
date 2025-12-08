"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plane, Package, CalendarDays, Link as LinkIcon, User, BadgeCheck, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CountryFlag from '@/components/CountryFlag';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { showSuccess, showError } from '@/utils/toast';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface Trip {
  id: string;
  user_id: string;
  from_country: string;
  to_country: string;
  trip_date: string;
  free_kg: number;
  charge_per_kg: number | null;
  traveler_location: string | null;
  notes: string | null;
  created_at: string;
  is_approved: boolean;
  admin_review_notes: string | null;
  is_deleted_by_user: boolean; // Added new field
  profiles: {
    first_name: string | null;
    last_name: string | null;
    is_verified: boolean;
  } | null;
}

const TRIPS_PER_PAGE = 9;

const MyTripsPage = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const offset = (currentPage - 1) * TRIPS_PER_PAGE;

  const { data: queryResult, isLoading, error } = useQuery<{ trips: Trip[], count: number } | null, Error>({
    queryKey: ['userTrips', user?.id, currentPage],
    queryFn: async () => {
      if (!user?.id) return { trips: [], count: 0 };
      
      let query = supabase
        .from('trips')
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            is_verified
          )
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_deleted_by_user', false)
        .order('trip_date', { ascending: true })
        .range(offset, offset + TRIPS_PER_PAGE - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching user trips:", error);
        throw new Error(error.message);
      }
      
      return { trips: data as Trip[], count: count || 0 };
    },
    enabled: !!user?.id,
  });

  const trips = queryResult?.trips || [];
  const totalTrips = queryResult?.count || 0;
  const totalPages = Math.ceil(totalTrips / TRIPS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const deleteTripMutation = useMutation({
    mutationFn: async (trip: Trip) => {
      if (!user) throw new Error(t('mustBeLoggedIn'));

      if (trip.admin_review_notes) {
        // If the trip has been reviewed by an admin, mark it as deleted by user
        const { error } = await supabase
          .from('trips')
          .update({ is_deleted_by_user: true })
          .eq('id', trip.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // If the trip has NOT been reviewed by an admin, permanently delete it
        const { error } = await supabase
          .from('trips')
          .delete()
          .eq('id', trip.id)
          .eq('user_id', user.id);

        if (error) throw error;
      }
    },
    onSuccess: (_, trip) => {
      showSuccess(t('tripDeletedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['userTrips', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] }); // Invalidate public trips list too
      queryClient.invalidateQueries({ queryKey: ['pendingTrips'] }); // Invalidate admin pending trips
      queryClient.invalidateQueries({ queryKey: ['reviewedTrips'] }); // Invalidate admin reviewed trips
      
      // After deletion, check if the current page is now empty and move back if necessary
      if (trips.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    },
    onError: (err: any) => {
      showError(t('tripDeletedError'));
      console.error("Error deleting trip:", err);
    },
  });

  const handleDeleteConfirm = () => {
    if (tripToDelete) {
      deleteTripMutation.mutate(tripToDelete);
      setTripToDelete(null);
    }
  };

  if (!user) {
    return <div className="container p-4 text-center">{t('mustBeLoggedIn')}</div>;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">{t('loadingTrips')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)]">
        <p className="text-red-500">{t('errorLoadingTrips')}: {error.message}</p>
      </div>
    );
  }

  // Get status badge component
  const getStatusBadge = (trip: Trip) => {
    // If trip is approved, show approved status
    if (trip.is_approved === true) {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-500/90">
          <CheckCircle className="h-3 w-3 mr-1" />
          {t('approved')}
        </Badge>
      );
    }
    // If trip is not approved but has admin review notes, it's rejected
    else if (trip.is_approved === false && trip.admin_review_notes) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          {t('rejected')}
        </Badge>
      );
    }
    // If trip is not approved and has no admin review notes, it's pending
    else if (trip.is_approved === false && !trip.admin_review_notes) {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          {t('waitingForConfirmation')}
        </Badge>
      );
    }
    // Default case (shouldn't happen with the current schema)
    else {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          {t('waitingForConfirmation')}
        </Badge>
      );
    }
  };
  
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <Pagination className="mt-8">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => handlePageChange(currentPage - 1)} 
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          
          {startPage > 1 && (
            <>
              <PaginationItem><PaginationLink onClick={() => handlePageChange(1)} className="cursor-pointer">1</PaginationLink></PaginationItem>
              {startPage > 2 && <PaginationItem><span className="px-2 py-1 text-sm">...</span></PaginationItem>}
            </>
          )}

          {pageNumbers.map(page => (
            <PaginationItem key={page}>
              <PaginationLink 
                onClick={() => handlePageChange(page)}
                isActive={page === currentPage}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <PaginationItem><span className="px-2 py-1 text-sm">...</span></PaginationItem>}
              <PaginationItem><PaginationLink onClick={() => handlePageChange(totalPages)} className="cursor-pointer">{totalPages}</PaginationLink></PaginationItem>
            </>
          )}

          <PaginationItem>
            <PaginationNext 
              onClick={() => handlePageChange(currentPage + 1)} 
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };


  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('myFlights')}</h1>
      
      <div className="max-w-4xl mx-auto">
        {trips && trips.length > 0 ? (
          <>
            <div className="space-y-4">
              {trips.map((trip) => (
                <Card key={trip.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Plane className="h-6 w-6 text-primary" />
                        <CountryFlag country={trip.from_country} showName />
                        <span className="text-xl">→</span>
                        <CountryFlag country={trip.to_country} showName />
                      </CardTitle>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(trip)}
                        <Badge variant="secondary" className="text-sm">
                          {trip.free_kg} kg {t('availableWeight')}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        {t('tripDate')}: {format(new Date(trip.trip_date), 'PPP')}
                      </p>
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Package className="h-4 w-4" />
                        {t('pricePerKg')}: ${trip.charge_per_kg?.toFixed(2) || 'N/A'}
                      </p>
                      <div className="flex items-center gap-2 text-muted-foreground col-span-full">
                        <User className="h-4 w-4" />
                        <span>{trip.profiles?.first_name || t('you')}</span>
                        {trip.profiles?.is_verified && 
                          <Badge variant="secondary" className="text-green-600 border-green-600">
                            <BadgeCheck className="h-3 w-3 mr-1" />
                            {t('verified')}
                          </Badge>
                        }
                      </div>
                    </div>
                    
                    {trip.admin_review_notes && (
                      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                        <p className="text-sm font-medium mb-1">{t('adminReviewNotes')}:</p>
                        <p className="text-sm">{trip.admin_review_notes}</p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Link to={`/trips/${trip.id}`}>
                        <Button variant="outline" size="sm">
                          <LinkIcon className="h-4 w-4 mr-2" />
                          {t('viewTripAndRequest')}
                        </Button>
                      </Link>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => setTripToDelete(trip)}
                        disabled={deleteTripMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('deleteTrip')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {renderPagination()}
          </>
        ) : (
          <Card className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">{t('noTripsYet')}</h3>
            <p className="text-muted-foreground mb-4">{t('travelersEarnMoney')}</p>
            <Link to="/add-trip">
              <Button>{t('addTrip')}</Button>
            </Link>
            {user && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg text-left">
                <p className="text-sm text-muted-foreground font-semibold">
                  Debug Info:
                </p>
                <p className="text-xs break-all">User ID: {user.id}</p>
                <p className="text-xs">Session: {user ? 'Active' : 'None'}</p>
              </div>
            )}
          </Card>
        )}
      </div>
      
      {/* Deletion Confirmation Dialog */}
      <AlertDialog 
        open={!!tripToDelete} 
        onOpenChange={(open) => !open && setTripToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('areYouSureDeleteTrip')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteTripWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTripToDelete(null)}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              disabled={deleteTripMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('confirmDeleteTrip')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyTripsPage;