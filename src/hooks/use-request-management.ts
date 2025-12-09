"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { RequestTrackingStatus, TRACKING_STAGES } from '@/lib/tracking-stages';

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

export interface ManagedRequest {
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
  payment_proof_url?: string | null;
  payment_reference?: string | null;
  payment_amount_iqd?: number | null;
  payment_updated_at?: string | null;
  payment_reviewed_at?: string | null;
}

export interface ManagedGeneralOrder {
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

type SentItem = ManagedRequest | ManagedGeneralOrder;

export const useRequestManagement = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const [itemToCancel, setItemToCancel] = useState<SentItem | (ManagedRequest & { type: 'accepted_trip_request' }) | null>(null);
  const [requestToEdit, setRequestToEdit] = useState<ManagedRequest | null>(null);
  const [requestForInspection, setRequestForInspection] = useState<ManagedRequest | null>(null);
  const [requestForSenderPhotos, setRequestForSenderPhotos] = useState<ManagedRequest | null>(null);
  const [requestForTrackingUpdate, setRequestForTrackingUpdate] = useState<{ request: ManagedRequest; newStatus: RequestTrackingStatus } | null>(null);
  const [requestForPayment, setRequestForPayment] = useState<ManagedRequest | null>(null);

  // Accept / reject
  const updateRequestMutation = useMutation({
    mutationFn: async ({ request, status }: { request: ManagedRequest; status: 'accepted' | 'rejected' }) => {
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

        if (trackingError) {
          console.error('Failed to set tracking status to item_accepted:', trackingError);
        }
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

  // Mutual cancellation
  const mutualCancelMutation = useMutation({
    mutationFn: async (request: ManagedRequest) => {
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

  // Delete
  const deleteRequestMutation = useMutation({
    mutationFn: async (item: SentItem) => {
      if (!user) throw new Error(t('mustBeLoggedIn'));

      if (item.type === 'general_order') {
        const order = item as ManagedGeneralOrder;
        if (order.status !== 'new' && order.status !== 'matched') {
          throw new Error(t('cannotDeleteClaimedOrder'));
        }

        const { error } = await supabase
          .from('general_orders')
          .delete()
          .eq('id', order.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const req = item as ManagedRequest;
        const { error } = await supabase
          .from('requests')
          .delete()
          .eq('id', req.id)
          .eq('sender_id', user.id);

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

  // Sender edits
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

  // Traveler reviews changes
  const reviewChangesMutation = useMutation({
    mutationFn: async ({ request, accept }: { request: ManagedRequest; accept: boolean }) => {
      const updateData = accept
        ? {
            weight_kg: request.proposed_changes?.weight_kg,
            description: request.proposed_changes?.description,
            proposed_changes: null,
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

  // Tracking updates
  const trackingUpdateMutation = useMutation({
    mutationFn: async ({ request, newStatus }: { request: ManagedRequest; newStatus: RequestTrackingStatus }) => {
      if (!user) throw new Error(t('mustBeLoggedIn'));

      const currentStage = TRACKING_STAGES.find((s) => s.key === request.tracking_status);
      const nextStage = TRACKING_STAGES.find((s) => s.key === newStatus);

      if (!currentStage || !nextStage || nextStage.order !== currentStage.order + 1) {
        throw new Error(t('cannotUpdateTrackingStatus'));
      }

      if (newStatus === 'traveler_on_the_way' &&
        (!request.traveler_inspection_photos || request.traveler_inspection_photos.length === 0)) {
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

      let msgKey = 'requestUpdatedSuccess';
      if (newStatus === 'traveler_on_the_way') msgKey = 'travelerOnTheWaySuccess';
      if (newStatus === 'delivered') msgKey = 'deliveredSuccess';
      if (newStatus === 'completed') msgKey = 'completedSuccess';

      showSuccess(t(msgKey));
    },
    onError: (err: any) => showError(err.message),
  });

  // Sender submits payment proof
  const submitPaymentProofMutation = useMutation({
    mutationFn: async (args: {
      request: ManagedRequest;
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

      // Show a clear "waiting for confirmation" message, not full success
      showSuccess(
        t('paymentPendingReview') ??
          'تم إرسال إثبات الدفع، بانتظار تأكيد الدفع من المسؤول.'
      );

      setRequestForPayment(null);
    },
    onError: (err: any) => showError(err.message),
  });

  // Admin confirms / rejects payment
  const adminUpdatePaymentStatusMutation = useMutation({
    mutationFn: async (args: { requestId: string; status: 'paid' | 'rejected' }) => {
      const updates: any = {
        payment_status: args.status,
        payment_reviewed_at: new Date().toISOString(),
      };

      if (args.status === 'paid') {
        updates.tracking_status = 'payment_done' as RequestTrackingStatus;
      }

      const { error } = await supabase
        .from('requests')
        .update(updates)
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

  // Handlers...

  const handleUpdateRequest = (request: ManagedRequest, status: 'accepted' | 'rejected') => {
    updateRequestMutation.mutate({ request, status });
  };

  const handleAcceptedRequestCancel = (request: ManagedRequest) => {
    setItemToCancel({ ...request, type: 'accepted_trip_request' });
  };

  const handleConfirmCancellation = () => {
    if (!itemToCancel) return;

    if (itemToCancel.type === 'accepted_trip_request') {
      mutualCancelMutation.mutate(itemToCancel as ManagedRequest);
    } else {
      deleteRequestMutation.mutate(itemToCancel as SentItem);
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

  const handleSenderPhotoUpload = (request: ManagedRequest) => {
    setRequestForSenderPhotos(request);
  };

  const handleTrackingUpdate = (request: ManagedRequest, newStatus: RequestTrackingStatus) => {
    setRequestForTrackingUpdate({ request, newStatus });
  };

  const handleConfirmTrackingUpdate = () => {
    if (requestForTrackingUpdate) {
      trackingUpdateMutation.mutate(requestForTrackingUpdate);
      setRequestForTrackingUpdate(null);
    }
  };

  const handleOpenPaymentDialog = (request: ManagedRequest) => {
    setRequestForPayment(request);
  };

  const handleSubmitPaymentProof = (args: {
    request: ManagedRequest;
    payment_method: 'zaincash' | 'qicard';
    payment_proof_url: string;
    payment_reference: string;
    payment_amount_iqd: number;
  }) => {
    submitPaymentProofMutation.mutate(args);
  };

  // Dialog helpers
  const isAcceptedRequest =
    !!itemToCancel && (itemToCancel as any).type === 'accepted_trip_request';
  const isFirstPartyRequesting =
    isAcceptedRequest &&
    (itemToCancel as any).cancellation_requested_by &&
    (itemToCancel as any).cancellation_requested_by === user?.id;
  const isSecondPartyConfirming =
    isAcceptedRequest &&
    (itemToCancel as any).cancellation_requested_by &&
    (itemToCancel as any).cancellation_requested_by !== user?.id;

  const trackingUpdateStatus = requestForTrackingUpdate?.newStatus;
  const trackingUpdateStage = trackingUpdateStatus
    ? TRACKING_STAGES.find((s) => s.key === trackingUpdateStatus)
    : null;

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

    setItemToCancel,
    setRequestToEdit,
    setRequestForInspection,
    setRequestForSenderPhotos,
    setRequestForTrackingUpdate,
    setRequestForPayment,

    updateRequestMutation,
    deleteRequestMutation,
    mutualCancelMutation,
    editRequestMutation,
    reviewChangesMutation,
    trackingUpdateMutation,
    submitPaymentProofMutation,
    adminUpdatePaymentStatusMutation,

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