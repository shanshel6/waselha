import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { format } from 'date-fns';
import { Plane, Package, User, Calendar } from 'lucide-react';

const MyRequests = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const queryClient = useQueryClient();

  // Fetch requests sent by the current user
  const { data: sentRequests, isLoading: isLoadingSent } = useQuery({
    queryKey: ['sentRequests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('requests')
        .select(`*, trips(*, profiles(first_name, last_name))`)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  // Fetch requests received for the current user's trips
  const { data: receivedRequests, isLoading: isLoadingReceived } = useQuery({
    queryKey: ['receivedRequests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: userTrips, error: tripsError } = await supabase.from('trips').select('id').eq('user_id', user.id);
      if (tripsError) throw new Error(tripsError.message);
      if (userTrips.length === 0) return [];
      
      const tripIds = userTrips.map(trip => trip.id);
      const { data, error } = await supabase
        .from('requests')
        .select(`*, trips(*), profiles:sender_id(first_name, last_name)`)
        .in('trip_id', tripIds)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, senderId, tripDetails }) => {
      const { error: updateError } = await supabase.from('requests').update({ status }).eq('id', requestId);
      if (updateError) throw updateError;

      const message = `Your request for the trip from ${tripDetails.from_country} to ${tripDetails.to_country} has been ${status}.`;
      const { error: notificationError } = await supabase.from('notifications').insert({ user_id: senderId, message, link: '/my-requests' });
      if (notificationError) console.error("Failed to create notification", notificationError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
      showSuccess(t('requestUpdatedSuccess'));
    },
    onError: (err) => showError(err.message),
  });

  const handleUpdateRequest = (request, status) => {
    updateRequestMutation.mutate({
      requestId: request.id,
      status,
      senderId: request.sender_id,
      tripDetails: request.trips,
    });
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('myRequests')}</h1>
      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">{t('receivedRequests')}</TabsTrigger>
          <TabsTrigger value="sent">{t('sentRequests')}</TabsTrigger>
        </TabsList>
        <TabsContent value="received">
          <Card>
            <CardHeader><CardTitle>{t('receivedRequests')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {isLoadingReceived && <p>{t('loading')}</p>}
              {receivedRequests && receivedRequests.length > 0 ? receivedRequests.map(req => (
                <Card key={req.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{t('requestFrom')} {req.profiles?.first_name || 'User'}</span>
                      <Badge variant={getStatusVariant(req.status)}>{t(req.status)}</Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 pt-2">
                      <Plane className="h-4 w-4" /> {req.trips.from_country} → {req.trips.to_country} on {format(new Date(req.trips.trip_date), 'PPP')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">{t('packageContents')}:</p>
                    <p className="text-sm text-muted-foreground mb-2">{req.description}</p>
                    <p><span className="font-semibold">{t('packageWeightKg')}:</span> {req.weight_kg} kg</p>
                    {req.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <Button onClick={() => handleUpdateRequest(req, 'accepted')} disabled={updateRequestMutation.isPending}>{t('accept')}</Button>
                        <Button variant="destructive" onClick={() => handleUpdateRequest(req, 'rejected')} disabled={updateRequestMutation.isPending}>{t('reject')}</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )) : <p>{t('noReceivedRequests')}</p>}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sent">
          <Card>
            <CardHeader><CardTitle>{t('sentRequests')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {isLoadingSent && <p>{t('loading')}</p>}
              {sentRequests && sentRequests.length > 0 ? sentRequests.map(req => (
                <Card key={req.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{t('requestTo')} {req.trips.profiles?.first_name || 'Traveler'}</span>
                      <Badge variant={getStatusVariant(req.status)}>{t(req.status)}</Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 pt-2">
                      <Plane className="h-4 w-4" /> {req.trips.from_country} → {req.trips.to_country} on {format(new Date(req.trips.trip_date), 'PPP')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p><span className="font-semibold">{t('packageWeightKg')}:</span> {req.weight_kg} kg</p>
                  </CardContent>
                </Card>
              )) : <p>{t('noSentRequests')}</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyRequests;