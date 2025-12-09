"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateShippingCost } from '@/lib/pricing';
import { RequestTrackingStatus } from '@/lib/tracking-stages';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, ImageIcon, Smartphone } from 'lucide-react';
import { showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

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

export interface RequestWithPayment {
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

interface PaymentProofDialogProps {
  request: RequestWithPayment;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (args: {
    request: RequestWithPayment;
    payment_method: 'zaincash' | 'qicard';
    payment_proof_url: string;
    payment_reference: string;
    payment_amount_iqd: number;
  }) => void;
  isSubmitting: boolean;
}

const PAYMENT_BUCKET = 'payment-proofs';

/**
 * حوار يسمح للمرسل برفع لقطة شاشة لإثبات الدفع.
 * الآن يدعم طريقتين بالعربية:
 * - "سوبر كي" (qi card سابقاً) مع إظهار QR ورقم الهاتف.
 * - "زين كاش" للدفع عبر زين كاش.
 */
const PaymentProofDialog: React.FC<PaymentProofDialogProps> = ({
  request,
  isOpen,
  onOpenChange,
  onSubmit,
  isSubmitting,
}) => {
  const { t } = useTranslation();
  const [method, setMethod] = useState<'zaincash' | 'qicard'>('zaincash');
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const price = calculateShippingCost(
    request.trips.from_country,
    request.trips.to_country,
    request.weight_kg
  );

  const expectedAmountIQD = price.error ? 0 : price.totalPriceIQD;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.type.startsWith('image/')) {
      showError(t('invalidFileType'));
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      showError(t('fileTooLarge'));
      return;
    }

    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }

    const url = URL.createObjectURL(f);
    setLocalPreviewUrl(url);
    setFile(f);
  };

  const ensurePaymentBucket = async () => {
    const { data, error } = await supabase.functions.invoke('create-payment-proofs-bucket');
    if (error) {
      console.error('Error ensuring payment-proofs bucket:', error);
      throw new Error(error.message || 'Failed to prepare storage for payment proofs.');
    }
    if (!data?.success) {
      console.error('create-payment-proofs-bucket returned non-success payload:', data);
      throw new Error('Failed to prepare storage for payment proofs.');
    }
  };

  const uploadProofAndGetUrl = async (f: File, requestId: string) => {
    await ensurePaymentBucket();

    const ext = f.name.split('.').pop() || 'jpg';
    const path = `${requestId}/${Date.now()}-proof.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(PAYMENT_BUCKET)
      .upload(path, f, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Payment proof upload error:', uploadError);
      throw new Error(uploadError.message || 'Failed to upload payment proof.');
    }

    const { data: publicUrlData } = supabase.storage
      .from(PAYMENT_BUCKET)
      .getPublicUrl(path);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!file) {
      showError(t('uploadRequired'));
      return;
    }
    if (expectedAmountIQD <= 0 || price.error) {
      showError(t('orderSubmittedError'));
      return;
    }

    setUploading(true);
    try {
      const publicUrl = await uploadProofAndGetUrl(file, request.id);

      onSubmit({
        request,
        payment_method: method,
        payment_proof_url: publicUrl,
        payment_reference: reference,
        payment_amount_iqd: expectedAmountIQD,
      });
    } catch (e: any) {
      console.error('Error in payment proof flow:', e);
      showError(e?.message || 'Failed to submit payment proof');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open && localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    onOpenChange(open);
  };

  const isSuperK = method === 'qicard';
  const phoneNumber = '+9647779786420';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {t('placeOrder')} – الدفع اليدوي
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            اختر وسيلة الدفع المناسبة (سوبر كي أو زين كاش)، ادفع من التطبيق، ثم قم برفع لقطة شاشة لإثبات الدفع.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* amount */}
          <Card className="bg-primary/5 border-primary/30">
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div className="text-sm">
                  <p className="font-semibold">المبلغ المستحق تقريباً</p>
                  {!price.error ? (
                    <>
                      <p>{price.totalPriceUSD.toFixed(2)} USD</p>
                      <p className="text-xs text-muted-foreground">
                        ≈ {expectedAmountIQD.toLocaleString('ar-IQ')} IQD
                      </p>
                    </>
                  ) : (
                    <p className="text-destructive text-xs">
                      {price.error}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* method */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              اختر تطبيق الدفع
            </Label>
            <RadioGroup
              value={method}
              onValueChange={(val) => setMethod(val as 'zaincash' | 'qicard')}
              className="flex gap-3"
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="qicard" id="qicard" />
                <Label htmlFor="qicard" className="text-sm cursor-pointer">
                  سوبر كي
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="zaincash" id="zaincash" />
                <Label htmlFor="zaincash" className="text-sm cursor-pointer">
                  زين كاش
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              بعد الدفع من خلال التطبيق، خذ لقطة شاشة لنجاح العملية ثم قم برفعها هنا.
            </p>
          </div>

          {/* Super K QR + phone */}
          {isSuperK && (
            <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
              <CardContent className="p-3 space-y-2 text-center">
                <p className="text-xs sm:text-sm font-semibold mb-1">
                  امسح هذا الـ QR في تطبيق سوبر كي للدفع إلى نفس الحساب:
                </p>
                <div className="flex justify-center">
                  <img
                    src="/superk-qr.jpg"
                    alt="Super K payment QR"
                    className="w-40 h-auto rounded-md border bg-white"
                  />
                </div>
                <p className="text-xs mt-2">
                  رقم الهاتف للدفع:{" "}
                  <span className="font-mono font-semibold">{phoneNumber}</span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* proof file */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <ImageIcon className="h-4 w-4" />
              لقطة شاشة لإثبات الدفع
              <span className="text-destructive">*</span>
            </Label>
            <Input type="file" accept="image/*" onChange={handleFileChange} />
            {localPreviewUrl && (
              <div className="mt-2">
                <img
                  src={localPreviewUrl}
                  alt="Payment proof preview"
                  className="w-full max-h-40 object-contain rounded border"
                />
              </div>
            )}
          </div>

          {/* reference */}
          <div className="space-y-1">
            <Label className="text-sm">رقم الإيصال / ملاحظات (اختياري)</Label>
            <Textarea
              rows={2}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="مثال: رقم العملية من تطبيق سوبر كي أو زين كاش"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || uploading}
          >
            {isSubmitting || uploading ? t('loading') : 'إرسال إثبات الدفع'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentProofDialog;