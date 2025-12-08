"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/use-admin-check';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Loader2, Plane } from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';
import { arabicCountries } from '@/lib/countries-ar';
import { showSuccess, showError } from '@/utils/toast';

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
  is_deleted_by_user: boolean;
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

  const { data: pendingTrips, isLoading: isTripsLoading } = useQuery<Trip[], Error>({
    queryKey: ['pendingTrips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(
          `
          *,
          profiles (
            first_name,
            last_name
          )
        `
        )
        .eq('is_approved', false)
        .is('admin_review_notes', null)
        .eq('is_deleted_by_user', false)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return (data || []) as Trip[];
    },
    enabled: isAdmin,
  });

  const { data: reviewedTrips, isLoading: isReviewedTripsLoading } = useQuery<Trip[], Error>({
    queryKey: ['reviewedTrips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(
          `
          *,
          profiles (
            first_name,
            last_name
          )
        `
        )
        .not('admin_review_notes', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []) as Trip[];
    },
    enabled: isAdmin,
  });

  const approveTripMutation = useMutation({
    mutationFn: async ({ tripId, notes }: { tripId: string; notes: string | null }) => {
      const { error } = await supabase
        .from('trips')
        .update({
          is_approved: true,
          admin_review_notes: notes || '',
        })
        .eq('id', tripId);

      if (error) throw error;

      const { data: tripData } = await supabase
        .from('trips')
        .select('user_id, from_country, to_country')
        .eq('id', tripId)
        .single();

      if (tripData) {
        const fromCountryName = arabicCountries[tripData.from_country] || tripData.from_country;
        const toCountryName = arabicCountries[tripData.to_country] || tripData.to_country;

        await supabase.from('notifications').insert({
          user_id: tripData.user_id,
          message: `تمت الموافقة على رحلتك من ${fromCountryName} إلى ${toCountryName}`,
          link: '/my-flights',
        });
      }
    },
    onSuccess: async (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: ['pendingTrips'] });
      queryClient.invalidateQueries({ queryKey: ['reviewedTrips'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      showSuccess(t('tripApprovedSuccess'));

      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', tripId)
        .single();

      if (tripError && tripError.code !== 'PGRST116') {
        console.error('Error fetching trip data for invalidation:', tripError);
      }

      if (tripData?.user_id) {
        queryClient.invalidateQueries({ queryKey: ['receivedRequests', tripData.user_id] });
      }
    },
    onError: (error: any) => {
      showError(error.message);
    },
  });

  const rejectTripMutation = useMutation({
    mutationFn: async ({ tripId, notes }: { tripId: string; notes: string | null }) => {
      const { error } = await supabase
        .from('trips')
        .update({
          is_approved: false,
          admin_review_notes: notes || 'تم رفض الرحلة',
        })
        .eq('id', tripId);

      if (error) throw error;

      const { data: tripData } = await supabase
        .from('trips')
        .select('user_id, from_country, to_country')
        .eq('id', tripId)
        .single();

      if (tripData) {
        const fromCountryName = arabicCountries[tripData.from_country] || tripData.from_country;
        const toCountryName = arabicCountries[tripData.to_country] || tripData.to_country;

        await supabase.from('notifications').insert({
          user_id: tripData.user_id,
          message: `تم رفض رحلتك من ${fromCountryName} إلى ${toCountryName}`,
          link: '/my-flights',
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
    },
  });

  if (isAdminLoading) {
    return (
      <div className="container p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
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

  const getArabicCountryName = (country: string) => arabicCountries[country] || country;

  const renderTicketLink = (url: string | null) => {
    if (!url) return null;
    // Only render if it looks like a real URL (http/https)
    if (!/^https?:\/\//.test(url)) return null;

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-blue-600 hover:underline break-all"
      >
        {t('viewTicket')}
      </a>
    );
  };

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)]">
      <h1 className="text-3xl font-bold mb-6">{t('adminDashboard')}</h1>

      <Tabs defaultValue="trips-pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-2xl">
          <TabsTrigger value="trips-pending">
            <Plane className="h-4 w-4 mr-2" />
            {t('pendingTrips')}
          </TabsTrigger>
          <TabsTrigger value="achievements">
            {t('tripsReviewedSection')}
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
                pendingTrips.map((trip) => (
                  <Card key={trip.id} className="p-4 border">
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
                      <div className="flex flex-col items-end gap-2 text-sm">
                        <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                          {t('pendingApproval')}
                        </span>
                        {renderTicketLink(trip.ticket_file_url)}
                      </div>
                    </div>
                    <AdminTripApproval
                      trip={trip}
                      onApprove={(notes) =>
                        approveTripMutation.mutate({ tripId: trip.id, notes })
                      }
                      onReject={(notes) =>
                        rejectTripMutation.mutate({ tripId: trip.id, notes })
                      }
                    />
                  </Card>
                ))
              ) : (
                <p className="text-muted-foreground">{t('noPendingTrips')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('tripsReviewedSection')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isReviewedTripsLoading ? (
                <p>{t('loading')}</p>
              ) : reviewedTrips && reviewedTrips.length > 0 ? (
                <div className="space-y-4">
                  {reviewedTrips.map((trip) => (
                    <div key={trip.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            <CountryFlag country={trip.from_country} showName={false} />
                            {getArabicCountryName(trip.from_country)}
                            <span className="text-lg">→</span>
                            <CountryFlag country={trip.to_country} showName={false} />
                            {getArabicCountryName(trip.to_country)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t('traveler')}: {trip.profiles?.first_name}{' '}
                            {trip.profiles?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('tripDate')}: {new Date(trip.trip_date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('availableWeight')}: {trip.free_kg} kg
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              trip.is_approved
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {trip.is_approved ? t('approved') : t('rejected')}
                          </span>
                          {trip.is_deleted_by_user && (
                            <span className="text-xs text-muted-foreground">
                              {t('deletedByUser')}
                            </span>
                          )}
                          {renderTicketLink(trip.ticket_file_url)}
                        </div>
                      </div>
                      {trip.admin_review_notes && (
                        <p className="text-sm text-muted-foreground pt-3 border-t mt-3">
                          {t('adminReviewNotes')}: {trip.admin_review_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
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