"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import PhotoUpload from '@/components/PhotoUpload';

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
  const [inspectionPhotos, setInspectionPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCompleteInspection = async () => {
    if (!user) {
      showError(t('mustBeLoggedIn'));
      return;
    }

    if (inspectionPhotos.length < 1) {
      showError(t('atLeastOneInspectionPhoto'));
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('requests')
        .update({
          traveler_inspection_photos: inspectionPhotos
        })
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

        <Alert variant="default" className="bg-yellow-50/50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('important')}</AlertTitle>
          <AlertDescription>
            {t('inspectionInstructions')}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <PhotoUpload
            onPhotosChange={setInspectionPhotos}
            maxPhotos={3}
            minPhotos={1}
            label={t('inspectionPhotos')}
          />
          
          <Button 
            onClick={handleCompleteInspection}
            disabled={isSubmitting || inspectionPhotos.length < 1}
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