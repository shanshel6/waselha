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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ReceivedRequestsTab } from '@/components/my-requests/ReceivedRequestsTab';
import { SentRequestsTab } from '@/components/my-requests/SentRequestsTab';
import { EditRequestModal } from '@/components/my-requests/EditRequestModal';
import TravelerInspectionModal from '@/components/my-requests/TravelerInspectionModal';
import SenderPhotoUploadModal from '@/components/my-requests/SenderPhotoUploadModal';
import { RequestTrackingStatus, TRACKING_STAGES } from '@/lib/tracking-stages';
import { Link } from 'react-router-dom';
import { Package, PlusCircle } from 'lucide-react';

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
  updated_at: string | null;
  trips: Trip;
  cancellation_requested_by: string | null;
  proposed_changes: { weight_kg: number; description: string } | null;
  traveler_inspection_photos?: string[] | null;
  sender_item_photos?: string[] | null;
  tracking_status: RequestTrackingStatus;
  general_order_id: string | null;
  type: 'trip_request';
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
  type: 'general_order';
}

type SentItem = Request | GeneralOrder;

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
  const [requestForInspection, setRequestForInspection] = useState<Request | null>(null);
  const [requestForSenderPhotos, setRequestForSenderPhotos] = useState<Request | null>(null);
  const [requestForTrackingUpdate, setRequestForTrackingUpdate] = useState<{ request: Request; newStatus: RequestTrackingStatus } | null>(null);

  // --- Mutations ---
  const updateRequestMutation = useMutation({
    mutationFn: async ({ request, status }: { request: Request; status: 'accepted' | 'rejected' }) => {
      if (status === 'accepted') {
        // Client-side check for immediate feedback
        if (request.trips.free_kg < request.weight_kg) {
          throw new Error(t('notEnoughWeightError'));
        }

        const { error } = await supabase.rpc('accept_request_and_update_trip_weight', {
          request_id_param: request.id,
        });

        if (error) throw error;
        
        // Manually update tracking status for accepted requests
        const { error: trackingError } = await supabase
          .from('requests')
          .update({ tracking_status: 'item_accepted' as RequestTrackingStatus })
          .eq('id', request.id);
          
        if (trackingError) console.error("Failed to set tracking status to item_accepted:", trackingError);

      } else {
        // For 'rejected' status, also set tracking status to waiting_approval (or keep it, as it's the default for pending/rejected)
        const { error: updateError } = await supabase
          .from('requests')
          .update({ status, tracking_status: 'waiting_approval' as RequestTrackingStatus })
          .eq('id', request.id);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] }); // Invalidate public trips list
      queryClient.invalidateQueries({ queryKey: ['trip'] }); // Invalidate specific trip details
      showSuccess(t('requestUpdatedSuccess'));
    },
    onError: (err: any) => showError(err.message),
  });

  const mutualCancelMutation = useMutation({
    mutationFn: async (request: Request) => {
      if (!user) throw new Error(t('mustBeLoggedIn'));

      if (request.cancellation_requested_by) {
        if (request.cancellation_requested_by !== user.id) {
          const { error } = await supabase
            .from('requests')
            .delete()
            .eq('id', request.id);

          if (error) throw error;
          return 'deleted';
        } else {
          throw new Error(t('alreadyRequestedCancellation'));
        }
      } else {
        const { error } = await supabase
          .from('requests')
          .update({ cancellation_requested_by: user.id })
          .eq('id', request.id);

        if (error) throw error;
        return 'requested';
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] }); // Invalidate public trips list
      queryClient.invalidateQueries({ queryKey: ['trip'] }); // Invalidate specific trip details

      if (result === 'deleted') showSuccess(t('requestCancelledSuccess'));
      else if (result === 'requested') showSuccess(t('cancellationRequestedSuccess'));
    },
    onError: (err: any) => showError(err.message),
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (item: SentItem) => {
      // Handle both trip requests and general orders
      if (item.type === 'general_order') {
        // Only allow deletion if status is 'new' or 'matched' (before acceptance/claiming)
        if (item.status !== 'new' && item.status !== 'matched') {
          throw new Error(t('cannotDeleteClaimedOrder'));
        }
        const { error } = await supabase
          .from('general_orders')
          .delete()
          .eq('id', item.id)
          .eq('user_id', user?.id);
        if (error) throw error;
      } else {
        // Trip request deletion (only allowed if pending or mutually agreed accepted)
        const { error } = await supabase
          .from('requests')
          .delete()
          .eq('id', item.id)
          .eq('sender_id', user?.id);

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
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
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
      showSuccess(t('changesSubmittedSuccess'));
      setRequestToEdit(null);
    },
    onError: (err: any) => showError(err.message),
  });

  const reviewChangesMutation = useMutation({
    mutationFn: async ({ request, accept }: { request: Request; accept: boolean }) => {
      const updateData = accept 
        ? { 
            weight_kg: request.proposed_changes?.weight_kg,
            description: request.proposed_changes?.description,
            proposed_changes: null 
          } 
        : { proposed_changes: null };

      const { error } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', request.id);

      if (error) throw error;
    },
    onSuccess: (_, { accept }) => {
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
      showSuccess(accept ? t('changesAcceptedSuccess') : t('changesRejectedSuccess'));
    },
    onError: (err: any) => showError(err.message),
  });
  
  const trackingUpdateMutation = useMutation({
    mutationFn: async ({ request, newStatus }: { request: Request; newStatus: RequestTrackingStatus }) => {
      if (!user) throw new Error(t('mustBeLoggedIn'));
      
      // Validation based on current status
      const currentStage = TRACKING_STAGES.find(s => s.key === request.tracking_status);
      const nextStage = TRACKING_STAGES.find(s => s.key === newStatus);
      
      if (!currentStage || !nextStage || nextStage.order !== currentStage.order + 1) {
        throw new Error(t('cannotUpdateTrackingStatus'));
      }
      
      // Specific checks before moving forward
      if (newStatus === 'traveler_on_the_way' && (!request.traveler_inspection_photos || request.traveler_inspection_photos.length === 0)) {
        throw new Error(t('inspectionRequiredBeforeTravel'));
      }
      if (newStatus === 'completed' && request.tracking_status !== 'delivered') {
        throw new Error(t('deliveryRequiredBeforeComplete'));
      }

      const { error } = await supabase
        .from('requests')
        .update({ tracking_status: newStatus })
        .eq('id', request.id);

      if (error) throw error;
    },
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
      
      let successMessageKey = 'requestUpdatedSuccess';
      if (newStatus === 'traveler_on_the_way') successMessageKey = 'travelerOnTheWaySuccess';
      if (newStatus === 'delivered') successMessageKey = 'deliveredSuccess';
      if (newStatus === 'completed') successMessageKey = 'completedSuccess';
      
      showSuccess(t(successMessageKey));
    },
    onError: (err: any) => showError(err.message),
  });

  const handleUpdateRequest = (request: any, status: string) => {
    updateRequestMutation.mutate({ request, status });
  };

  const handleAcceptedRequestCancel = (request: Request) => {
    setItemToCancel({ ...request, type: 'accepted_trip_request' });
  };

  const handleConfirmCancellation = () => {
    if (!itemToCancel) return;

    if (itemToCancel.type === 'accepted_trip_request') {
      mutualCancelMutation.mutate(itemToCancel);
    } else {
      // Handle deletion of GeneralOrder or pending TripRequest
      deleteRequestMutation.mutate(itemToCancel);
    }

    setItemToCancel(null);
  };

  const handleEditRequest = (values: { weight_kg: number; description: string }) => {
    if (requestToEdit) {
      editRequestMutation.mutate({ requestId: requestToEdit.id, values });
    }
  };

  const handleInspectionComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
    queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
  };
  
  const handleSenderPhotoUpload = (request: Request) => {
    setRequestForSenderPhotos(request);
  };
  
  const handleTrackingUpdate = (request: Request, newStatus: RequestTrackingStatus) => {
    setRequestForTrackingUpdate({ request, newStatus });
  };

  const handleConfirmTrackingUpdate = () => {
    if (requestForTrackingUpdate) {
      trackingUpdateMutation.mutate(requestForTrackingUpdate);
      setRequestForTrackingUpdate(null);
    }
  };

  const isAcceptedRequest = itemToCancel?.type === 'accepted_trip_request';
  const isFirstPartyRequesting = isAcceptedRequest && itemToCancel.cancellation_requested_by && itemToCancel.cancellation_requested_by === user?.id;
  const isSecondPartyConfirming = isAcceptedRequest && itemToCancel.cancellation_requested_by && itemToCancel.cancellation_requested_by !== user?.id;
  
  const trackingUpdateStatus = requestForTrackingUpdate?.newStatus;
  const trackingUpdateStage = trackingUpdateStatus ? TRACKING_STAGES.find(s => s.key === trackingUpdateStatus) : null;
  
  // Determine dialog content based on status
  let dialogTitleKey = '';
  let dialogDescriptionKey = '';
  
  if (trackingUpdateStatus === 'traveler_on_the_way') {
    dialogTitleKey = 'confirmOnTheWayTitle';
    dialogDescriptionKey = 'confirmOnTheWayDescription';
  } else if (trackingUpdateStatus === 'delivered') {
    dialogTitleKey = 'confirmDeliveredTitle';
    dialogDescriptionKey = 'confirmDeliveredDescription';
  } else if (trackingUpdateStatus === 'completed') {
    dialogTitleKey = 'confirmCompletedTitle';
    dialogDescriptionKey = 'confirmCompletedDescription';
  }

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('myRequests')}</h1>
        <Link to="/place-order">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('placeOrder')}
          </Button>
        </Link>
      </div>
      
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
            onUploadInspectionPhotos={setRequestForInspection}
            onTrackingUpdate={handleTrackingUpdate}
            trackingUpdateMutation={trackingUpdateMutation}
          />
        </TabsContent>
        
        <TabsContent value="sent">
          <SentRequestsTab 
            user={user} 
            onCancelRequest={setItemToCancel} 
            deleteRequestMutation={deleteRequestMutation} 
            onCancelAcceptedRequest={handleAcceptedRequestCancel}
            onEditRequest={setRequestToEdit}
            onUploadSenderPhotos={handleSenderPhotoUpload}
            onTrackingUpdate={handleTrackingUpdate}
            trackingUpdateMutation={trackingUpdateMutation}
          />
        </TabsContent>
      </Tabs>
      
      <AlertDialog open={!!itemToCancel} onOpenChange={(open) => !open && setItemToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAcceptedRequest 
                ? (isSecondPartyConfirming 
                    ? t('confirmMutualCancellation') 
                    : t('requestCancellationTitle'))
                : t('areYouSureCancel')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAcceptedRequest 
                ? (isSecondPartyConfirming 
                    ? t('confirmMutualCancellationDescription') 
                    : t('requestCancellationDescription'))
                : t('cannotBeUndone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToCancel(null)}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCancellation} 
              disabled={deleteRequestMutation.isPending || mutualCancelMutation.isPending || isFirstPartyRequesting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isAcceptedRequest 
                ? (isSecondPartyConfirming 
                    ? t('confirmCancellation') 
                    : t('requestCancellation'))
                : t('confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Tracking Update Confirmation Dialog */}
      <AlertDialog open={!!requestForTrackingUpdate} onOpenChange={(open) => !open && setRequestForTrackingUpdate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(dialogTitleKey)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(dialogDescriptionKey)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRequestForTrackingUpdate(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmTrackingUpdate} 
              disabled={trackingUpdateMutation.isPending}
            >
              {t(trackingUpdateStage?.tKey || 'confirm')}
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
      
      {requestForInspection && (
        <TravelerInspectionModal
          request={requestForInspection}
          isOpen={!!requestForInspection}
          onOpenChange={() => setRequestForInspection(null)}
          onInspectionComplete={handleInspectionComplete}
        />
      )}
      
      {requestForSenderPhotos && (
        <SenderPhotoUploadModal
          request={requestForSenderPhotos}
          isOpen={!!requestForSenderPhotos}
          onOpenChange={() => setRequestForSenderPhotos(null)}
        />
      )}
    </div>
  );
};

export default MyRequests;