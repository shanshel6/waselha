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
import { Camera, Package } from 'lucide-react';
import PhotoUpload from '@/components/PhotoUpload';

interface SenderPhotoUploadModalProps {
  request: any;
  isOpen: boolean;
  onOpenChange: (open: (open: boolean) => void) => void;
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

  const uploadPhotosMutation = useMutation({
    mutationFn: async (photos: string[]) => {
      if (!user) throw new Error(t('mustBeLoggedIn'));
      
      const { error } = await supabase
        .from('requests')
        .update({
          sender_item_photos: photos
        })
        .eq('id', request.id)
        .eq('sender_id', user.id); // Ensure only sender can update their photos

      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess(t('photosUploadedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['sentTripRequests', user?.id] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      showError(err.message || t('photosUploadedError'));
    }
  });

  const handleUpload = () => {
    if (itemPhotos.length < 2) {
      showError(t('atLeastTwoPhotos'));
      return;
    }
    uploadPhotosMutation.mutate(itemPhotos);
  };

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

        <Alert variant="default" className="bg-blue-50/50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300">
          <Package className="h-4 w-4" />
          <AlertTitle>{t('packageDetails')}</AlertTitle>
          <AlertDescription>
            {t('packageContents')}: {request?.description}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
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
              disabled={uploadPhotosMutation.isPending || itemPhotos.length < 2}
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