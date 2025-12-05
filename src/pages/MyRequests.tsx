import React, { useState } from 'react';
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
import { Plane, Package, Trash2, MapPin, User, Weight, MessageSquare } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from 'react-router-dom';

const MyRequests = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [requestToCancel, setRequestToCancel] = useState<any | null>(null);

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

      // 1. Get the IDs of trips belonging to the current user
      const { data: userTrips, error: tripsError } = await supabase
        .from('trips')
        .select('id')
        .eq('user_id', user.id);

      if (tripsError) {
        throw new Error(tripsError.message);
      }

      if (!userTrips || userTrips.length === 0) {
        return []; // User has no trips, so no received requests.
      }

      const tripIds = userTrips.map(trip => trip.id);

      // 2. Fetch requests that are for one of the user's trips
      const { data, error } = await supabase
        .from('requests')
        .select(`*, trips(*), profiles:sender_id(first_name, last_name)`)
        .in('trip_id', tripIds)
        .order('created_at', { ascending: false });

      if (error) {
        // Log the error for debugging but don't throw, to avoid crashing the UI
        console.error("Error fetching received requests:", error);
        // Try a simpler query without the profile join as a fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('requests')
          .select(`*, trips(*)`)
          .in('trip_id', tripIds)
          .order('created_at', { ascending: false });
        
        if (fallbackError) {
          throw new Error(fallbackError.message);
        }
        return fallbackData;
      }
      
      return data;
    },
    enabled: !!user,
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const { error: updateError } = await supabase.from('requests').update({ status }).eq('id', requestId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
      showSuccess(t('requestUpdatedSuccess'));
    },
    onError: (err: any) => showError(err.message),
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (request: any) => {
      const { error } = await supabase.from('requests').delete().eq('id', request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
      showSuccess(t('requestCancelledSuccess'));
    },
    onError: (err: any) => {
      console.error("Error deleting request:", err);
      showError(t('requestCancelledError'));
    },
  });

  const handleUpdateRequest = (request: any, status: string) => {
    updateRequestMutation.mutate({
      requestId: request.id,
      status,
    });
  };

  const getStatusVariant = (status: string) => {
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
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-2"><Package className="h-4 w-4" />{t('packageContents')}:</p>
                      <p className="text-sm text-muted-foreground pl-6">{req.description}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <p className="flex items-center gap-2"><Weight className="h-4 w-4" /> <span className="font-semibold">{t('packageWeightKg')}:</span> {req.weight_kg} kg</p>
                      <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> <span className="font-semibold">{t('destinationCity')}:</span> {req.destination_city}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-2"><User className="h-4 w-4" />{t('receiverDetails')}:</p>
                      <p className="text-sm text-muted-foreground pl-6">{req.receiver_details}</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      {req.status === 'pending' && (
                        <>
                          <Button size="sm" onClick={() => handleUpdateRequest(req, 'accepted')} disabled={updateRequestMutation.isPending}>{t('accept')}</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleUpdateRequest(req, 'rejected')} disabled={updateRequestMutation.isPending}>{t('reject')}</Button>
                        </>
                      )}
                      {req.status === 'accepted' && (
                        <Link to={`/chat/${req.id}`}>
                          <Button size="sm" variant="outline">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            {t('viewChat')}
                          </Button>
                        </Link>
                      )}
                    </div>
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
                    <div className="flex gap-2 mt-4">
                      {req.status === 'pending' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setRequestToCancel(req)}
                          disabled={deleteRequestMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('cancelRequest')}
                        </Button>
                      )}
                      {req.status === 'accepted' && (
                        <Link to={`/chat/${req.id}`}>
                          <Button size="sm" variant="outline">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            {t('viewChat')}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )) : <p>{t('noSentRequests')}</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!requestToCancel} onOpenChange={(open) => !open && setRequestToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('areYouSureCancel')}</AlertDialogTitle>
            <AlertDialogDescription>{t('cannotBeUndone')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRequestToCancel(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (requestToCancel) {
                  deleteRequestMutation.mutate(requestToCancel);
                }
                setRequestToCancel(null);
              }}
              disabled={deleteRequestMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyRequests;