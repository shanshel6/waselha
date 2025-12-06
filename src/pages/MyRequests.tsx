"use client";
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { showSuccess, showError } from '@/utils/toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { ReceivedRequestsTab } from '@/components/my-requests/ReceivedRequestsTab';
import { SentRequestsTab } from '@/components/my-requests/SentRequestsTab';
import { EditRequestModal } from '@/components/my-requests/EditRequestModal';

// Define types for our data
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
}

interface Request {
  id: string;
  trip_id: string;
  sender_id: string;
  description: string;
  weight_kg: number;
  destination_city: string;
  receiver_details: string;
  handover_location: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  trips: Trip;
  cancellation_requested_by: string | null;
  proposed_changes: { weight_kg: number; description: string } | null;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface RequestWithProfiles extends Request {
  sender_profile: Profile | null;
  traveler_profile: Profile | null;
}

const MyRequests = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [itemToCancel, setItemToCancel] = useState<any | null>(null);
  const [requestToEdit, setRequestToEdit] = useState<Request | null>(null);

  // --- Mutations ---
  const updateRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const { error: updateError } = await supabase
        .from('requests')
        .update({ status })
        .eq('id', requestId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentTripRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
      showSuccess(t('requestUpdatedSuccess'));
    },
    onError: (err: any) => showError(err.message),
  });

  const mutualCancelMutation = useMutation({
    mutationFn: async (request: Request) => {
      if (!user) throw new Error(t('mustBeLoggedIn'));
      
      const isCurrentUserSender = user.id === request.sender_id;
      const travelerId = request.trips.user_id;
      const isCurrentUserTraveler = user.id === travelerId;
      
      if (!isCurrentUserSender && !isCurrentUserTraveler) {
        throw new Error("Unauthorized action.");
      }

      if (request.cancellation_requested_by) {
        if (request.cancellation_requested_by !== user.id) {
          const { error } = await supabase.from('requests').delete().eq('id', request.id);
          if (error) throw error;
          return 'deleted';
        } else {
          throw new Error(t('alreadyRequestedCancellation'));
        }
      } else {
        const { error } = await supabase.from('requests').update({ cancellation_requested_by: user.id }).eq('id', request.id);
        if (error) throw error;
        return 'requested';
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sentTripRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
      if (result === 'deleted') showSuccess(t('requestCancelledSuccess'));
      else if (result === 'requested') showSuccess(t('cancellationRequestedSuccess'));
    },
    onError: (err: any) => showError(err.message),
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (item: any) => {
      const fromTable = item.type === 'trip_request' ? 'requests' : 'general_orders';
      const { error } = await supabase.from(fromTable).delete().eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentTripRequests'] });
      queryClient.invalidateQueries({ queryKey: ['generalOrders'] });
      showSuccess(t('requestCancelledSuccess'));
    },
    onError: (err: any) => showError(t('requestCancelledError')),
  });

  const editRequestMutation = useMutation({
    mutationFn: async ({ requestId, values }: { requestId: string; values: { weight_kg: number; description: string } }) => {
      const { error } = await supabase
        .from('requests')
        .update({ proposed_changes: values })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentTripRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
      showSuccess(t('changesSubmittedSuccess'));
      setRequestToEdit(null);
    },
    onError: (err: any) => showError(err.message),
  });

  const reviewChangesMutation = useMutation({
    mutationFn: async ({ request, accept }: { request: Request; accept: boolean }) => {
      if (accept) {
        const { error } = await supabase
          .from('requests')
          .update({
            weight_kg: request.proposed_changes?.weight_kg,
            description: request.proposed_changes?.description,
            proposed_changes: null,
          })
          .eq('id', request.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('requests')
          .update({ proposed_changes: null })
          .eq('id', request.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, { accept }) => {
      queryClient.invalidateQueries({ queryKey: ['sentTripRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
      showSuccess(accept ? t('changesAcceptedSuccess') : t('changesRejectedSuccess'));
    },
    onError: (err: any) => showError(err.message),
  });

  const handleUpdateRequest = (request: any, status: string) => {
    updateRequestMutation.mutate({ requestId: request.id, status });
  };
  
  const handleAcceptedRequestCancel = (request: Request) => {
    setItemToCancel({ ...request, type: 'accepted_trip_request' });
  };

  const handleConfirmCancellation = () => {
    if (!itemToCancel) return;
    if (itemToCancel.type === 'accepted_trip_request') mutualCancelMutation.mutate(itemToCancel);
    else deleteRequestMutation.mutate(itemToCancel);
    setItemToCancel(null);
  };

  const handleEditRequest = (values: { weight_kg: number; description: string }) => {
    if (requestToEdit) {
      editRequestMutation.mutate({ requestId: requestToEdit.id, values });
    }
  };

  const isAcceptedRequest = itemToCancel?.type === 'accepted_trip_request';
  const isFirstPartyRequesting = isAcceptedRequest && itemToCancel.cancellation_requested_by && itemToCancel.cancellation_requested_by === user?.id;
  const isSecondPartyConfirming = isAcceptedRequest && itemToCancel.cancellation_requested_by && itemToCancel.cancellation_requested_by !== user?.id;

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('myRequests')}</h1>
      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">{t('receivedRequests')}</TabsTrigger>
          <TabsTrigger value="sent">{t('sentRequests')}</TabsTrigger>
        </TabsList>
        <TabsContent value="received">
          <ReceivedRequestsTab 
            user={user}
            onUpdateRequest={handleUpdateRequest}
            updateRequestMutation={updateRequestMutation}
            onCancelAcceptedRequest={handleAcceptedRequestCancel}
            onReviewChanges={reviewChangesMutation.mutate}
            reviewChangesMutation={reviewChangesMutation}
          />
        </TabsContent>
        <TabsContent value="sent">
          <SentRequestsTab 
            user={user}
            onCancelRequest={setItemToCancel}
            deleteRequestMutation={deleteRequestMutation}
            onCancelAcceptedRequest={handleAcceptedRequestCancel}
            onEditRequest={setRequestToEdit}
          />
        </TabsContent>
      </Tabs>
      <AlertDialog open={!!itemToCancel} onOpenChange={(open) => !open && setItemToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAcceptedRequest 
                ? isSecondPartyConfirming ? t('confirmMutualCancellation') : t('requestCancellationTitle')
                : t('areYouSureCancel')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAcceptedRequest 
                ? isSecondPartyConfirming ? t('confirmMutualCancellationDescription') : t('requestCancellationDescription')
                : t('cannotBeUndone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToCancel(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCancellation} 
              disabled={deleteRequestMutation.isPending || mutualCancelMutation.isPending || isFirstPartyRequesting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isAcceptedRequest 
                ? isSecondPartyConfirming ? t('confirmCancellation') : t('requestCancellation')
                : t('confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {requestToEdit && (
        <EditRequestModal
          isOpen={!!requestToEdit}
          onOpenChange={() => setRequestToEdit(null)}
          request={requestToEdit}
          onSubmit={handleEditRequest}
          isSubmitting={editRequestMutation.isPending}
        />
      )}
    </div>
  );
};

export default MyRequests;