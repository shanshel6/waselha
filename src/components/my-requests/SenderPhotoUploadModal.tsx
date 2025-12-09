"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Package, Wallet } from 'lucide-react';
import PhotoUpload from '@/components/PhotoUpload';
import { RequestTrackingStatus } from '@/lib/tracking-stages';

interface SenderPhotoUploadModalProps {
  request: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const SenderPhotoUploadModal: React.FC<SenderPhotoUploadModalProps> = ({ 
  request, 
  isOpen, 
  onOpenChange
}) => {
  const { t } = useTranslation();
  const { user } = useSession();
  const queryClient = useQueryClient();
  
  // Initialize photos state with existing photos from the request
  const [itemPhotos, setItemPhotos] = useState<string[]>(request?.sender_item_photos || []);

  React.useEffect(() => {
    if (request) {
      setItemPhotos(request.sender_item_photos || []);
    }
  }, [request]);

  const paymentStatus: 'unpaid' | 'pending_review' | 'paid' | 'rejected' | null =
    request?.payment_status ?? 'unpaid';

  const uploadPhotosMutation = useMutation({
    mutationFn: async (photos: string[]) => {
      if (!user) throw new Error(t('mustBeLoggedIn'));

      // Hard gate: payment must be fully confirmed before photos
      if (paymentStatus !== 'paid') {
        throw new Error(
          t('senderCannotUploadBeforePayment') ??
          'You must complete payment before uploading item photos.'
        );
      }

      // Directly move tracking to traveler_inspection_complete
      const updateData: { sender_item_photos: string[]; tracking_status: RequestTrackingStatus } = {
        sender_item_photos: photos,
        tracking_status: 'traveler_inspection_complete',
      };

      const { error } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', request.id)
        .eq('sender_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess(t('photosUploadedSuccess'));
      // Invalidate both tabs so status & button visibility refresh
      queryClient.invalidateQueries({ queryKey: ['sentRequests', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests', user?.id] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      showError(err.message || t('photosUploadedError'));
    }
  });

  const handleUpload = () => {
    if (paymentStatus !== 'paid') {
      showError(
        t('senderCannotUploadBeforePayment') ??
        'You must complete payment before uploading item photos.'
      );
      return;
    }

    if (itemPhotos.length < 2) {
      showError(t('atLeastTwoPhotos'));
      return;
    }
    uploadPhotosMutation.mutate(itemPhotos);
  };

  const renderPaymentAlert = () => {
    if (paymentStatus === 'paid') return null;

    if (paymentStatus === 'pending_review') {
      return (
        <Alert className="mb-2">
          <Wallet className="h-4 w-4" />
          <AlertTitle>{t('pendingVerification')}</AlertTitle>
          <AlertDescription>
            {t('paymentPendingReview') ??
              'Your payment proof is under review. You will be able to upload photos once payment is approved by admin.'}
          </AlertDescription>
        </Alert>
      );
    }

    if (paymentStatus === 'rejected') {
      return (
        <Alert variant="destructive" className="mb-2">
          <Wallet className="h-4 w-4" />
          <AlertTitle>{t('verificationRejected')}</AlertTitle>
          <AlertDescription>
            {t('paymentRejectedMessage') ??
              'Your previous payment proof was rejected. Please resend a valid payment proof before uploading photos.'}
          </AlertDescription>
        </Alert>
      );
    }

    // unpaid
    return (
      <Alert variant="destructive" className="mb-2">
        <Wallet className="h-4 w-4" />
        <AlertTitle>{t('paymentRequired') ?? 'Payment required'}</AlertTitle>
        <AlertDescription>
          {t('senderCannotUploadBeforePayment') ??
            'You must complete the payment for this shipment before uploading item photos.'}
        </AlertDescription>
      </Alert>
    );
  };

  const isUploadDisabled = 
    paymentStatus !== 'paid' || 
    uploadPhotosMutation.isPending || 
    itemPhotos.length < 2;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            {t('senderItemPhotos')}
          </DialogTitle>
          <DialogDescription>
            {t('senderItemPhotosDescription')}
          </DialogDescription>
        </DialogHeader>

        {renderPaymentAlert()}

        <Alert variant="default" className="bg-blue-50/50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300">
          <Package className="h-4 w-4" />
          <AlertTitle>{t('packageDetails')}</AlertTitle>
          <AlertDescription>
            {t('packageContents')}: {request?.description}
          </AlertDescription>
        </Alert>

        <div className="space-y-4 mt-2">
          <PhotoUpload
            onPhotosChange={setItemPhotos}
            maxPhotos={4}
            minPhotos={2}
            label={t('itemPhotos')}
            existingPhotos={itemPhotos}
          />
          
          <DialogFooter>
            <Button 
              onClick={handleUpload}
              disabled={isUploadDisabled}
              className="w-full"
            >
              {uploadPhotosMutation.isPending ? t('loading') : t('submitChanges')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SenderPhotoUploadModal;