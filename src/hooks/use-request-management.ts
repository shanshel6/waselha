"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { RequestTrackingStatus, TRACKING_STAGES } from '@/lib/tracking-stages';

// --- Type Definitions (Copied from MyRequests.tsx) ---
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
  payment_status?: 'unpaid' | 'pending_review' | 'paid' | 'rejected' | null;
  payment_method?: 'zaincash' | 'qicard' | 'other' | null;
  payment_amount_iqd?: number | null;
  payment_proof_url?: string | null;
  payment_reference?: string | null;
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
  type: 'general_order';
}

type SentItem = Request | GeneralOrder;

// --- Hook Definition ---

export const useRequestManagement = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const queryClient = useQueryClient();

  // State for Modals/Dialogs
  const [itemToCancel, setItemToCancel] = useState<any | null>(null);
  const [requestToEdit, setRequestToEdit] = useState<Request | null>(null);
  const [requestForInspection, setRequestForInspection] = useState<Request | null>(null);
  const [requestForSenderPhotos, setRequestForSenderPhotos] = useState<Request | null>(null);
  const [requestForTrackingUpdate, setRequestForTrackingUpdate] = useState<{ request: Request; newStatus: RequestTrackingStatus } | null>(null);
  // Payment dialog (sender-side)
  const [requestForPayment, setRequestForPayment] = useState<Request | null>(null);

  // --- Mutations ---

  const updateRequestMutation = useMutation({
    mutationFn: async ({ request, status }: { request: Request; status: 'accepted' | 'rejected' }) => {
      if (status === 'accepted') {
        if (request.trips.free_kg < request.weight_kg) {
          throw new Error(t('notEnoughWeightError'));
        }

        const { error } = await supabase.rpc('accept_request_and_update_trip_weight', {
          request_id_param: request.id,
        });

        if (error) throw error;
        
        const { error: trackingError } = await supabase
          .from('requests')
          .update({ tracking_status: 'item_accepted' as RequestTrackingStatus })
          .eq('id', request.id);
          
        if (trackingError) console.error("Failed to set tracking status to item_accepted:", trackingError);

      } else {
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
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip'] });
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
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip'] });

      if (result === 'deleted') showSuccess(t('requestCancelledSuccess'));
      else if (result === 'requested') showSuccess(t('cancellationRequestedSuccess'));
    },
    onError: (err: any) => showError(err.message),
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (item: SentItem) => {
      if (item.type === 'general_order') {
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
        const { error } = await supabase
          .from('requests')
          .delete()
          .eq('id', item.id)
          .eq('sender_id', user?.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
      showSuccess(t('requestCancelledSuccess'));
    },
    onError: () => showError(t('requestCancelledError')),
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
      
      const currentStage = TRACKING_STAGES.find(s => s.key === request.tracking_status);
      const nextStage = TRACKING_STAGES.find(s => s.key === newStatus);
      
      if (!currentStage || !nextStage || nextStage.order !== currentStage.order + 1) {
        throw new Error(t('cannotUpdateTrackingStatus'));
      }
      
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

  // Sender: submit payment proof (already in place)
  const submitPaymentProofMutation = useMutation({
    mutationFn: async (args: {
      request: Request;
      payment_method: 'zaincash' | 'qicard';
      payment_proof_url: string;
      payment_reference: string;
      payment_amount_iqd: number;
    }) => {
      if (!user) throw new Error(t('mustBeLoggedIn'));

      const { error } = await supabase
        .from('requests')
        .update({
          payment_status: 'pending_review',
          payment_method: args.payment_method,
          payment_proof_url: args.payment_proof_url,
          payment_reference: args.payment_reference,
          payment_amount_iqd: args.payment_amount_iqd,
          payment_updated_at: new Date().toISOString(),
        })
        .eq('id', args.request.id)
        .eq('sender_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
      showSuccess('تم إرسال إثبات الدفع، بانتظار مراجعة المسؤول.');
      setRequestForPayment(null);
    },
    onError: (err: any) => showError(err.message),
  });

  // Admin: confirm / reject payment (for future admin UI)
  const adminUpdatePaymentStatusMutation = useMutation({
    mutationFn: async (args: { requestId: string; status: 'paid' | 'rejected' }) => {
      const { error } = await supabase
        .from('requests')
        .update({
          payment_status: args.status,
          payment_reviewed_at: new Date().toISOString(),
        })
        .eq('id', args.requestId);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
      showSuccess(
        status === 'paid'
          ? 'تم تأكيد الدفع بنجاح.'
          : 'تم رفض إثبات الدفع.'
      );
    },
    onError: (err: any) => showError(err.message),
  });

  // --- Handlers ---

  const handleUpdateRequest = (request: Request, status: 'accepted' | 'rejected') => {
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

  const handleOpenPaymentDialog = (request: Request) => {
    setRequestForPayment(request);
  };
  
  const handleSubmitPaymentProof = (args: {
    request: Request;
    payment_method: 'zaincash' | 'qicard';
    payment_proof_url: string;
    payment_reference: string;
    payment_amount_iqd: number;
  }) => {
    submitPaymentProofMutation.mutate(args);
  };
  
  // --- Dialog/Modal Content Helpers ---
  
  const isAcceptedRequest = itemToCancel?.type === 'accepted_trip_request';
  const isFirstPartyRequesting = isAcceptedRequest && itemToCancel.cancellation_requested_by && itemToCancel.cancellation_requested_by === user?.id;
  const isSecondPartyConfirming = isAcceptedRequest && itemToCancel.cancellation_requested_by && itemToCancel.cancellation_requested_by !== user?.id;
  
  const trackingUpdateStatus = requestForTrackingUpdate?.newStatus;
  const trackingUpdateStage = trackingUpdateStatus ? TRACKING_STAGES.find(s => s.key === trackingUpdateStatus) : null;
  
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

  return {
    // State
    itemToCancel,
    requestToEdit,
    requestForInspection,
    requestForSenderPhotos,
    requestForTrackingUpdate,
    requestForPayment,
    isAcceptedRequest,
    isFirstPartyRequesting,
    isSecondPartyConfirming,
    trackingUpdateStage,
    dialogTitleKey,
    dialogDescriptionKey,

    // Setters
    setItemToCancel,
    setRequestToEdit,
    setRequestForInspection,
    setRequestForSenderPhotos,
    setRequestForTrackingUpdate,
    setRequestForPayment,

    // Mutations
    updateRequestMutation,
    deleteRequestMutation,
    mutualCancelMutation,
    editRequestMutation,
    reviewChangesMutation,
    trackingUpdateMutation,
    submitPaymentProofMutation,
    adminUpdatePaymentStatusMutation,

    // Handlers
    handleUpdateRequest,
    handleAcceptedRequestCancel,
    handleConfirmCancellation,
    handleEditRequest,
    handleInspectionComplete,
    handleSenderPhotoUpload,
    handleTrackingUpdate,
    handleConfirmTrackingUpdate,
    handleOpenPaymentDialog,
    handleSubmitPaymentProof,
  };
};