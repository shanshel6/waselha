"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/use-admin-check';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VerificationRequestCard from '@/components/VerificationRequestCard';
import AdminTripApproval from '@/components/AdminTripApproval';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Loader2, Plane } from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';
import { arabicCountries } from '@/lib/countries-ar';
import { showSuccess, showError } from '@/utils/toast';

interface VerificationRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  id_front_url: string;
  id_back_url: string;
  face_with_id_url: string;
  residential_card_url?: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

interface Trip {
  id: string;
  user_id: string;
  from_country: string;
  to_country: string;
  trip_date: string;
  free_kg: number;
  ticket_file_url: string | null;
  is_approved: boolean;
  admin_review_notes: string | null;
  is_deleted_by_user: boolean; // Added new field
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { isAdmin, isLoading: isAdminLoading } = useAdminCheck();
  const queryClient = useQueryClient();

  const { data: verificationRequests, isLoading: isRequestsLoading, error: verificationError } = useQuery<VerificationRequest[], Error>({
    queryKey: ['verificationRequests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            phone
          )
        `)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      
      return data.map(req => ({
        ...req,
        profiles: {
          ...req.profiles,
          email: 'Email (Admin access required to fetch)',
        }
      })) as VerificationRequest[];
    },
    enabled: isAdmin,
  });

  const { data: pendingTrips, isLoading: isTripsLoading, error: tripsError } = useQuery<Trip[], Error>({
    queryKey: ['pendingTrips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          profiles (
            first_name,
            last_name
          )
        `)
        .eq('is_approved', false)
        .is('admin_review_notes', null)
        .eq('is_deleted_by_user', false) // Exclude trips marked as deleted by user
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return data as Trip[];
    },
    enabled: isAdmin,
  });

  const { data: reviewedTrips, isLoading: isReviewedTripsLoading } = useQuery<Trip[], Error>({
    queryKey: ['reviewedTrips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          profiles (
            first_name,
            last_name
          )
        `)
        .not('admin_review_notes', 'is', null) // Reviewed trips have admin_review_notes
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data as Trip[];
    },
    enabled: isAdmin,
  });

  // Mutation for approving trips
  const approveTripMutation = useMutation({
    mutationFn: async ({ tripId, notes }: { tripId: string; notes: string | null }) => {
      const { error } = await supabase
        .from('trips')
        .update({ 
          is_approved: true, 
          admin_review_notes: notes || null 
        })
        .eq('id', tripId);

      if (error) throw error;

      // Create notification for the user
      const { data: tripData } = await supabase
        .from('trips')
        .select('user_id, from_country, to_country')
        .eq('id', tripId)
        .single();

      if (tripData) {
        const fromCountryName = arabicCountries[tripData.from_country] || tripData.from_country;
        const toCountryName = arabicCountries[tripData.to_country] || tripData.to_country;
        
        await supabase
          .from('notifications')
          .insert({
            user_id: tripData.user_id,
            message: `تمت الموافقة على رحلتك من ${fromCountryName} إلى ${toCountryName}`,
            link: '/my-flights'
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingTrips'] });
      queryClient.invalidateQueries({ queryKey: ['reviewedTrips'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      showSuccess(t('tripApprovedSuccess'));
    },
    onError: (error: any) => {
      showError(error.message);
    }
  });

  // Mutation for rejecting trips
  const rejectTripMutation = useMutation({
    mutationFn: async ({ tripId, notes }: { tripId: string; notes: string | null }) => {
      // Update trip status to rejected (is_approved stays false, but we add notes)
      const { error } = await supabase
        .from('trips')
        .update({ 
          is_approved: false, 
          admin_review_notes: notes || 'تم رفض الرحلة' 
        })
        .eq('id', tripId);

      if (error) throw error;

      // Create notification for the user
      const { data: tripData } = await supabase
        .from('trips')
        .select('user_id, from_country, to_country')
        .eq('id', tripId)
        .single();

      if (tripData) {
        const fromCountryName = arabicCountries[tripData.from_country] || tripData.from_country;
        const toCountryName = arabicCountries[tripData.to_country] || tripData.to_country;
        
        await supabase
          .from('notifications')
          .insert({
            user_id: tripData.user_id,
            message: `تم رفض رحلتك من ${fromCountryName} إلى ${toCountryName}`,
            link: '/my-flights'
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingTrips'] });
      queryClient.invalidateQueries({ queryKey: ['reviewedTrips'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      showSuccess(t('tripRejectedSuccess'));
    },
    onError: (error: any) => {
      showError(error.message);
    }
  });

  if (isAdminLoading) {
    return <div className="container p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-8 min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Alert variant="destructive" className="max-w-lg">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{t('accessDenied')}</AlertTitle>
          <AlertDescription>{t('adminAccessRequired')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const pendingVerificationRequests = verificationRequests?.filter(r => r.status === 'pending') || [];
  const reviewedVerificationRequests = verificationRequests?.filter(r => r.status !== 'pending') || [];

  // Function to get Arabic country name
  const getArabicCountryName = (country: string) => {
    return arabicCountries[country] || country;
  };

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)]">
      <h1 className="text-3xl font-bold mb-6">{t('adminDashboard')}</h1>
      
      <Tabs defaultValue="trips-pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="trips-pending">
            <Plane className="h-4 w-4 mr-2" />
            {t('pendingTrips')} ({pendingTrips?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="trips-reviewed">
            {t('reviewedRequests')} ({reviewedTrips?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="verification-pending">
            {t('pendingVerification')} ({pendingVerificationRequests.length})
          </TabsTrigger>
          <TabsTrigger value="verification-reviewed">
            {t('reviewedRequests')} ({reviewedVerificationRequests.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="trips-pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('pendingTripApprovals')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isTripsLoading ? (
                <p>{t('loading')}</p>
              ) : pendingTrips && pendingTrips.length > 0 ? (
                pendingTrips.map(trip => (
                  <Card key={trip.id} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <CountryFlag country={trip.from_country} showName={false} />
                          {getArabicCountryName(trip.from_country)} 
                          <span className="text-lg">→</span>
                          <CountryFlag country={trip.to_country} showName={false} />
                          {getArabicCountryName(trip.to_country)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t('traveler')}: {trip.profiles?.first_name} {trip.profiles?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('tripDate')}: {new Date(trip.trip_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('availableWeight')}: {trip.free_kg} kg
                        </p>
                      </div>
                    </div>
                    <AdminTripApproval 
                      trip={trip} 
                      onApprove={(notes) => approveTripMutation.mutate({ tripId: trip.id, notes })}
                      onReject={(notes) => rejectTripMutation.mutate({ tripId: trip.id, notes })}
                    />
                  </Card>
                ))
              ) : (
                <p className="text-muted-foreground">{t('noPendingTrips')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trips-reviewed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('reviewedRequests')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isReviewedTripsLoading ? (
                <p>{t('loading')}</p>
              ) : reviewedTrips && reviewedTrips.length > 0 ? (
                reviewedTrips.map(trip => (
                  <Card key={trip.id} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <CountryFlag country={trip.from_country} showName={false} />
                          {getArabicCountryName(trip.from_country)} 
                          <span className="text-lg">→</span>
                          <CountryFlag country={trip.to_country} showName={false} />
                          {getArabicCountryName(trip.to_country)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t('traveler')}: {trip.profiles?.first_name} {trip.profiles?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('tripDate')}: {new Date(trip.trip_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('availableWeight')}: {trip.free_kg} kg
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        {trip.is_approved ? (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {t('approved')}
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {t('rejected')}
                          </span>
                        )}
                        {trip.is_deleted_by_user && (
                          <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full mt-1">
                            {t('deletedByUser')}
                          </span>
                        )}
                      </div>
                    </div>
                    {trip.admin_review_notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium">{t('adminReviewNotes')}:</p>
                        <p className="text-sm">{trip.admin_review_notes}</p>
                      </div>
                    )}
                  </Card>
                ))
              ) : (
                <p className="text-muted-foreground">{t('noReviewedRequests')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="verification-pending" className="mt-6">
          <Card>
            <CardHeader><CardTitle>{t('pendingVerification')}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {isRequestsLoading ? (
                <p>{t('loading')}</p>
              ) : pendingVerificationRequests.length > 0 ? (
                pendingVerificationRequests.map(req => (
                  <VerificationRequestCard key={req.id} request={req} />
                ))
              ) : (
                <p className="text-muted-foreground">{t('noPendingRequests')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="verification-reviewed" className="mt-6">
          <Card>
            <CardHeader><CardTitle>{t('reviewedRequests')}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {isRequestsLoading ? (
                <p>{t('loading')}</p>
              ) : reviewedVerificationRequests.length > 0 ? (
                reviewedVerificationRequests.map(req => (
                  <VerificationRequestCard key={req.id} request={req} />
                ))
              ) : (
                <p className="text-muted-foreground">{t('noReviewedRequests')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;