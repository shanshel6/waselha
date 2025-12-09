"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Wallet } from 'lucide-react';
import PhotoUpload from '@/components/PhotoUpload';
import { RequestTrackingStatus } from '@/lib/tracking-stages';

interface TravelerInspectionModalProps {
  request: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onInspectionComplete: () => void;
}

const TravelerInspectionModal: React.FC<TravelerInspectionModalProps> = ({ 
  request, 
  isOpen, 
  onOpenChange,
  onInspectionComplete
}) => {
  const { t } = useTranslation();
  const { user } = useSession();
  const [inspectionPhotos, setInspectionPhotos] = useState<string[]>(request?.traveler_inspection_photos || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  React.useEffect(() => {
    if (request) {
      setInspectionPhotos(request.traveler_inspection_photos || []);
    }
  }, [request]);

  const paymentStatus: 'unpaid' | 'pending_review' | 'paid' | 'rejected' | null =
    request?.payment_status ?? 'unpaid';

  const handleCompleteInspection = async () => {
    if (!user) {
      showError(t('mustBeLoggedIn'));
      return;
    }

    if (paymentStatus !== 'paid') {
      showError(t('travelerCannotInspectBeforePayment') ?? 'You cannot complete inspection until payment has been confirmed.');
      return;
    }

    if (inspectionPhotos.length < 1) {
      showError(t('atLeastOneInspectionPhoto'));
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData: { traveler_inspection_photos: string[], tracking_status?: RequestTrackingStatus } = {
        traveler_inspection_photos: inspectionPhotos
      };
      
      // Only update tracking status if it's currently 'sender_photos_uploaded'
      if (request.tracking_status === 'sender_photos_uploaded') {
        updateData.tracking_status = 'traveler_inspection_complete';
      }
      
      const { error } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', request.id);

      if (error) throw error;

      showSuccess(t('inspectionCompleteSuccess'));
      onInspectionComplete();
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message || t('inspectionCompleteError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPaymentAlert = () => {
    if (paymentStatus === 'paid') return null;

    if (paymentStatus === 'pending_review') {
      return (
        <Alert className="mb-2">
          <Wallet className="h-4 w-4" />
          <AlertTitle>{t('pendingVerification')}</AlertTitle>
          <AlertDescription>
            {t('paymentPendingReviewTraveler') ?? 'Sender payment is under review. Please wait until it is approved before completing inspection.'}
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
            {t('paymentRejectedTravelerMessage') ?? 'Payment proof was rejected. Please ask the sender to resolve payment before proceeding.'}
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
          {t('travelerCannotInspectBeforePayment') ?? 'You cannot complete inspection until the sender has paid and payment is confirmed.'}
        </AlertDescription>
      </Alert>
    );
  };

  const isActionDisabled =
    paymentStatus !== 'paid' || isSubmitting || inspectionPhotos.length < 1;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            {t('safetyVerification')}
          </DialogTitle>
          <DialogDescription>
            {t('safetyVerificationDescription')}
          </DialogDescription>
        </DialogHeader>

        {renderPaymentAlert()}

        <Alert variant="default" className="bg-yellow-50/50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('important')}</AlertTitle>
          <AlertDescription>
            {t('inspectionInstructions')}
          </AlertDescription>
        </Alert>

        <div className="space-y-4 mt-2">
          <PhotoUpload
            onPhotosChange={setInspectionPhotos}
            maxPhotos={3}
            minPhotos={1}
            label={t('inspectionPhotos')}
            existingPhotos={inspectionPhotos}
          />
          
          <Button 
            onClick={handleCompleteInspection}
            disabled={isActionDisabled}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin">⏳</span>
                {t('completingInspection')}
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('completeInspection')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TravelerInspectionModal;