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
  // حقول الدفع المتوقعة في الـ request على مستوى الواجهة
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

/**
 * حوار بسيط يسمح للمرسل برفع لقطة شاشة لإثبات الدفع
 * واختيار طريقة الدفع، وإدخال رقم الإيصال. الرفع هنا
 * سيتم كـ object URL (مثل باقي أجزاء المشروع التي لا تستخدم
 * التخزين بعد)، وعلى مستوى الباك إند يمكن استبدال هذا بسوبابيز ستورج.
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
  const [proofUrl, setProofUrl] = useState<string>('');
  const [reference, setReference] = useState<string>('');

  const price = calculateShippingCost(
    request.trips.from_country,
    request.trips.to_country,
    request.weight_kg
  );

  const expectedAmountIQD = price.error ? 0 : price.totalPriceIQD;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError(t('invalidFileType'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showError(t('fileTooLarge'));
      return;
    }
    const url = URL.createObjectURL(file);
    setProofUrl(url);
  };

  const handleSubmit = () => {
    if (!proofUrl) {
      showError(t('uploadRequired'));
      return;
    }
    if (expectedAmountIQD <= 0) {
      showError(t('orderSubmittedError'));
      return;
    }

    onSubmit({
      request,
      payment_method: method,
      payment_proof_url: proofUrl,
      payment_reference: reference,
      payment_amount_iqd: expectedAmountIQD,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {t('placeOrder')} – الدفع اليدوي
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            استخدم زين كاش أو كي كارد للدفع، ثم أرسل لنا لقطة شاشة للإيصال ليقوم المسؤول بتأكيد الدفع.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* المبلغ المتوقع */}
          <Card className="bg-primary/5 border-primary/30">
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div className="text-sm">
                  <p className="font-semibold">المبلغ المستحق تقريباً</p>
                  {!price.error ? (
                    <>
                      <p>
                        {price.totalPriceUSD.toFixed(2)} USD
                      </p>
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

          {/* اختيار طريقة الدفع */}
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
                <RadioGroupItem value="zaincash" id="zaincash" />
                <Label htmlFor="zaincash" className="text-sm cursor-pointer">
                  ZainCash
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="qicard" id="qicard" />
                <Label htmlFor="qicard" className="text-sm cursor-pointer">
                  Qi Card
                </Label>
              </div>
            </RadioGroup>

            <p className="text-xs text-muted-foreground">
              بعد الدفع من خلال التطبيق، خذ لقطة شاشة لنجاح العملية ثم قم برفعها هنا.
            </p>
          </div>

          {/* رفع لقطة شاشة */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <ImageIcon className="h-4 w-4" />
              لقطة شاشة لإثبات الدفع
              <span className="text-destructive">*</span>
            </Label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            {proofUrl && (
              <div className="mt-2">
                <img
                  src={proofUrl}
                  alt="Payment proof"
                  className="w-full max-h-40 object-contain rounded border"
                />
              </div>
            )}
          </div>

          {/* رقم الإيصال / ملاحظات */}
          <div className="space-y-1">
            <Label className="text-sm">رقم الإيصال / ملاحظات (اختياري)</Label>
            <Textarea
              rows={2}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="مثال: رقم العملية من تطبيق زين كاش أو كي كارد"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? t('loading') : 'إرسال إثبات الدفع'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentProofDialog;