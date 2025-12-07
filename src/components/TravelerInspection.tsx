"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import PhotoUpload from '@/components/PhotoUpload';

interface TravelerInspectionProps {
  requestId: string;
  senderItemPhotos: string[];
  onInspectionComplete: () => void;
}

const TravelerInspection: React.FC<TravelerInspectionProps> = ({ 
  requestId, 
  senderItemPhotos,
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
          traveler_inspection_photos: inspectionPhotos,
          status: 'accepted' // Confirm the acceptance after inspection
        })
        .eq('id', requestId);

      if (error) throw error;

      showSuccess(t('inspectionCompleteSuccess'));
      onInspectionComplete();
    } catch (error: any) {
      showError(error.message || t('inspectionCompleteError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert variant="default" className="bg-yellow-50/50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('important')}</AlertTitle>
        <AlertDescription>
          {t('inspectionInstructions')}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            {t('senderItemPhotos')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t('senderItemPhotosDescription')}
          </p>
          
          {senderItemPhotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {senderItemPhotos.map((photo, index) => (
                <div key={index} className="relative aspect-square">
                  <img 
                    src={photo} 
                    alt={`Sender item photo ${index + 1}`} 
                    className="w-full h-full object-cover rounded-md border"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {t('beforeHandoff')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              {t('noSenderItemPhotos')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            {t('travelerInspection')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('inspectionDescription')}
          </p>
          
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
        </CardContent>
      </Card>
    </div>
  );
};

export default TravelerInspection;