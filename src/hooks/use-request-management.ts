"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { RequestTrackingStatus, TRACKING_STAGES } from '@/lib/tracking-stages';

// ... existing types remain unchanged ...

export const useRequestManagement = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const queryClient = useQueryClient();

  // state declarations stay as they are ...

  // all previous mutations unchanged up to submitPaymentProofMutation

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
      const updates: any = {
        payment_status: args.status,
        payment_reviewed_at: new Date().toISOString(),
      };

      // If payment is confirmed, move tracking to payment_done
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

  // handlers and return object stay same; omitted here for brevity
  // (keep the rest of the file exactly as in previous version)
};