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
import { ShieldAlert, Loader2, Plane, Package } from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';
import { arabicCountries } from '@/lib/countries-ar';
import { showSuccess, showError } from '@/utils/toast';
import { fetchAdminEmails } from '@/utils/admin';

interface VerificationRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  id_front_url: string;
  id_back_url: string;
  face_with_id_url: string;
  residential_card_url?: string;
  created_at: string;
  profiles: { first_name: string; last_name: string; email: string; phone: string; };
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
  is_deleted_by_user: boolean;
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null; } | null;
}

interface GeneralOrder {
  id: string;
  user_id: string;
  from_country: string;
  to_country: string;
  description: string;
  is_valuable: boolean;
  insurance_requested: boolean;
  status: 'new' | 'matched' | 'claimed' | 'completed' | 'cancelled';
  claimed_by: string | null;
  created_at: string;
  updated_at: string;
  insurance_percentage: number;
  weight_kg: number;
  profiles: { first_name: string | null; last_name: string | null; } | null;
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
        .select(` *, profiles ( first_name, last_name, phone ) `)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      
      const requests = data as VerificationRequest[];
      // Collect user IDs
      const userIds = requests.map(req => req.user_id);
      // Fetch emails using the Edge Function
      const emailMap = await fetchAdminEmails(userIds);
      
      return requests.map(req => ({
        ...req,
        profiles: {
          ...req.profiles,
          email: emailMap[req.user_id] || 'N/A',
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
        .select(` *, profiles ( first_name, last_name ) `)
        .eq('is_approved', false)
        .is('admin_review_notes', null)
        .eq('is_deleted_by_user', false)
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
        .select(` *, profiles ( first_name, last_name ) `)
        .not('admin_review_notes', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data as Trip[];
    },
    enabled: isAdmin,
  });

  const { data: pendingOrders, isLoading: isOrdersLoading, error: ordersError } = useQuery<GeneralOrder[], Error>({
    queryKey: ['pendingOrders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('general_orders')
        .select(` *, profiles ( first_name, last_name ) `)
        .eq('status', 'new')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return data as GeneralOrder[];
    },
    enabled: isAdmin,
  });

  const { data: reviewedOrders, isLoading: isReviewedOrdersLoading } = useQuery<GeneralOrder[], Error>({
    queryKey: ['reviewedOrders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('general_orders')
        .select(` *, profiles ( first_name, last_name ) `)
        .neq('status', 'new')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data as GeneralOrder[];
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
          admin_review_notes: notes || ''
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
    onSuccess: async (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: ['pendingTrips'] });
      queryClient.invalidateQueries({ queryKey: ['reviewedTrips'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      showSuccess(t('tripApprovedSuccess'));

      // Fetch the trip again to get the user_id (traveler_id)
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('user_id, from_country, to_country')
        .eq('id', tripId)
        .single();
      
      if (tripError) {
        console.error("Error fetching trip data for invalidation:", tripError);
        return;
      }
      
      if (tripData?.user_id) {
        // Invalidate the traveler's received requests query
        queryClient.invalidateQueries({ queryKey: ['receivedRequests', tripData.user_id] });
      }

      // Also, if a general order was matched, invalidate the sender's sent requests
      // This is done by checking if a request linked to this trip has a general_order_id
      const { data: matchedRequest, error: requestError } = await supabase
        .from('requests')
        .select('sender_id')
        .eq('trip_id', tripId)
        .not('general_order_id', 'is', null)
        .single();
      
      if (requestError && requestError.code !== 'PGRST116') {
        console.error("Error checking for matched general order:", requestError);
      }
      
      if (matchedRequest?.sender_id) {
        queryClient.invalidateQueries({ queryKey: ['sentRequests', matchedRequest.sender_id] });
      }
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

  // Mutation for approving orders
  const approveOrderMutation = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes: string | null }) => {
      const { error } = await supabase
        .from('general_orders')
        .update({
          status: 'approved',
          admin_review_notes: notes || ''
        })
        .eq('id', orderId);
      if (error) throw error;

      // Create notification for the user
      const { data: orderData } = await supabase
        .from('general_orders')
        .select('user_id, from_country, to_country')
        .eq('id', orderId)
        .single();
      
      if (orderData) {
        const fromCountryName = arabicCountries[orderData.from_country] || orderData.from_country;
        const toCountryName = arabicCountries[orderData.to_country] || orderData.to_country;
        
        await supabase
          .from('notifications')
          .insert({
            user_id: orderData.user_id,
            message: `تمت الموافقة على طلب الشحن العام من ${fromCountryName} إلى ${toCountryName}`,
            link: '/my-requests'
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['reviewedOrders'] });
      queryClient.invalidateQueries({ queryKey: ['general_orders'] });
      showSuccess(t('orderApprovedSuccess'));
    },
    onError: (error: any) => {
      showError(error.message);
    }
  });

  // Mutation for rejecting orders
  const rejectOrderMutation = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes: string | null }) => {
      const { error } = await supabase
        .from('general_orders')
        .update({
          status: 'rejected',
          admin_review_notes: notes || 'تم رفض الطلب'
        })
        .eq('id', orderId);
      if (error) throw error;

      // Create notification for the user
      const { data: orderData } = await supabase
        .from('general_orders')
        .select('user_id, from_country, to_country')
        .eq('id', orderId)
        .single();
      
      if (orderData) {
        const fromCountryName = arabicCountries[orderData.from_country] || orderData.from_country;
        const toCountryName = arabicCountries[orderData.to_country] || orderData.to_country;
        
        await supabase
          .from('notifications')
          .insert({
            user_id: orderData.user_id,
            message: `تم رفض طلب الشحن العام من ${fromCountryName} إلى ${toCountryName}`,
            link: '/my-requests'
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['reviewedOrders'] });
      queryClient.invalidateQueries({ queryKey: ['general_orders'] });
      showSuccess(t('orderRejectedSuccess'));
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
        <TabsList className="grid w-full grid-cols-6 max-w-4xl">
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
          <TabsTrigger value="orders-pending">
            <Package className="h-4 w-4 mr-2" />
            {t('pendingOrders')} ({pendingOrders?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="orders-reviewed">
            {t('reviewedOrders')} ({reviewedOrders?.length || 0})
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
                          {getArabicCountryName(trip.from_country)} <span className="text-lg">→</span>
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
                          {getArabicCountryName(trip.from_country)} <span className="text-lg">→</span>
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
        
        <TabsContent value="orders-pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('pendingOrderApprovals')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isOrdersLoading ? (
                <p>{t('loading')}</p>
              ) : pendingOrders && pendingOrders.length > 0 ? (
                pendingOrders.map(order => (
                  <Card key={order.id} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <CountryFlag country={order.from_country} showName={false} />
                          {getArabicCountryName(order.from_country)} <span className="text-lg">→</span>
                          <CountryFlag country={order.to_country} showName={false} />
                          {getArabicCountryName(order.to_country)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t('sender')}: {order.profiles?.first_name} {order.profiles?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('packageWeightKg')}: {order.weight_kg} kg
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('packageContents')}: {order.description}
                        </p>
                        {order.insurance_requested && (
                          <p className="text-sm text-muted-foreground">
                            {t('insuranceCoverage')}: {order.insurance_percentage}%
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{t('adminApproval')}</h4>
                          <Badge variant="secondary" className="mt-1">
                            {t('pendingApproval')}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => approveOrderMutation.mutate({ orderId: order.id, notes: '' })}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={approveOrderMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t('approve')}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => rejectOrderMutation.mutate({ orderId: order.id, notes: '' })}
                            disabled={rejectOrderMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            {t('reject')}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          {t('reviewNotes')}
                        </label>
                        <Textarea 
                          placeholder={t('reviewNotesPlaceholder')} 
                          className="min-h-[80px]"
                        />
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <p className="text-muted-foreground">{t('noPendingOrders')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="orders-reviewed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('reviewedOrders')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isReviewedOrdersLoading ? (
                <p>{t('loading')}</p>
              ) : reviewedOrders && reviewedOrders.length > 0 ? (
                reviewedOrders.map(order => (
                  <Card key={order.id} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <CountryFlag country={order.from_country} showName={false} />
                          {getArabicCountryName(order.from_country)} <span className="text-lg">→</span>
                          <CountryFlag country={order.to_country} showName={false} />
                          {getArabicCountryName(order.to_country)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t('sender')}: {order.profiles?.first_name} {order.profiles?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('packageWeightKg')}: {order.weight_kg} kg
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('packageContents')}: {order.description}
                        </p>
                        {order.insurance_requested && (
                          <p className="text-sm text-muted-foreground">
                            {t('insuranceCoverage')}: {order.insurance_percentage}%
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        {order.status === 'approved' ? (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {t('approved')}
                          </span>
                        ) : order.status === 'rejected' ? (
                          <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {t('rejected')}
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {t(order.status)}
                          </span>
                        )}
                      </div>
                    </div>
                    {order.admin_review_notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium">{t('adminReviewNotes')}:</p>
                        <p className="text-sm">{order.admin_review_notes}</p>
                      </div>
                    )}
                  </Card>
                ))
              ) : (
                <p className="text-muted-foreground">{t('noReviewedOrders')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;