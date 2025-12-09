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
      showError('يجب عليك تسجيل الدخول أولاً.');
      return;
    }

    if (paymentStatus !== 'paid') {
      showError(
        t('travelerCannotInspectBeforePayment') ??
        'لا يمكنك إكمال فحص الطرد قبل تأكيد الدفع من المرسل.'
      );
      return;
    }

    if (inspectionPhotos.length < 1) {
      showError(
        t('atLeastOneInspectionPhoto') ??
        'يرجى رفع صورة واحدة على الأقل للطرد بعد الفحص.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData: { traveler_inspection_photos: string[]; tracking_status?: RequestTrackingStatus } = {
        traveler_inspection_photos: inspectionPhotos
      };
      
      // تحديث حالة التتبع فقط إذا كانت حالياً "تم تحميل صور الطرد من المرسل"
      if (request.tracking_status === 'sender_photos_uploaded') {
        updateData.tracking_status = 'traveler_inspection_complete';
      }
      
      const { error } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', request.id);

      if (error) throw error;

      showSuccess('تم حفظ صور الفحص بنجاح، يمكنك الآن متابعة حالة الطلب.');
      onInspectionComplete();
      onOpenChange(false);
    } catch (error: any) {
      showError(
        error.message ||
        t('inspectionCompleteError') ||
        'حدث خطأ أثناء حفظ الفحص، يرجى المحاولة مرة أخرى.'
      );
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
          <AlertTitle>الدفع قيد المراجعة</AlertTitle>
          <AlertDescription>
            قام المرسل بإرسال إثبات الدفع وهو الآن قيد المراجعة من المسؤول، يرجى الانتظار حتى يتم تأكيد الدفع قبل إكمال الفحص.
          </AlertDescription>
        </Alert>
      );
    }

    if (paymentStatus === 'rejected') {
      return (
        <Alert variant="destructive" className="mb-2">
          <Wallet className="h-4 w-4" />
          <AlertTitle>تم رفض إثبات الدفع</AlertTitle>
          <AlertDescription>
            تم رفض إثبات الدفع من المرسل، يرجى إبلاغه بإعادة إرسال إثبات صحيح قبل المتابعة في فحص الطرد.
          </AlertDescription>
        </Alert>
      );
    }

    // unpaid
    return (
      <Alert variant="destructive" className="mb-2">
        <Wallet className="h-4 w-4" />
        <AlertTitle>الدفع غير مكتمل</AlertTitle>
        <AlertDescription>
          لا يمكنك إكمال فحص الطرد قبل أن يقوم المرسل بالدفع وتأكيد الدفع من قبل المسؤول.
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
            فحص الأمان قبل السفر
          </DialogTitle>
          <DialogDescription>
            قبل أن تحمل الطرد معك في الرحلة، تأكد من تطابق محتوياته مع ما تم الاتفاق عليه، وعدم احتوائه على أي مواد ممنوعة أو خطرة.
          </DialogDescription>
        </DialogHeader>

        {renderPaymentAlert()}

        <Alert variant="default" className="bg-yellow-50/50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>إرشادات مهمة قبل القبول النهائي</AlertTitle>
          <AlertDescription>
            افحص الطرد أمام المرسل قدر الإمكان، تأكد من خلوّه من المواد المحظورة، التقط صوراً واضحة للطرد من الخارج (ومن الداخل إن أمكن) واحتفظ بها كمرجع في حال حدوث أي مشكلة لاحقة.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 mt-2">
          <PhotoUpload
            onPhotosChange={setInspectionPhotos}
            maxPhotos={3}
            minPhotos={1}
            label="صور فحص الطرد من قبل المسافر"
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
                جاري حفظ الفحص...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                إكمال فحص الطرد وتأكيده
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TravelerInspectionModal;