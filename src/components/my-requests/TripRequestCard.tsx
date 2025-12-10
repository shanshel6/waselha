"use client";

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Plane,
  Trash2,
  MessageSquare,
  BadgeCheck,
  CalendarDays,
  MapPin,
  User,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Pencil,
  Camera,
  PackageCheck,
  Weight,
  DollarSign,
  Wallet,
  AlertTriangle,
  ImageIcon,
} from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';
import RequestTracking from '@/components/RequestTracking';
import { RequestTrackingStatus, TRACKING_STAGES } from '@/lib/tracking-stages';
import { cn } from '@/lib/utils';
import { calculateShippingCost } from '@/lib/pricing';
import { useChatReadStatus } from '@/hooks/use-chat-read-status';
import VerifiedBadge from '@/components/VerifiedBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSession } from '@/integrations/supabase/SessionContextProvider';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_verified?: boolean;
}

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
  sender_item_photos: string[] | null;
  traveler_inspection_photos?: string[] | null;
  tracking_status: RequestTrackingStatus;
  general_order_id: string | null;
  type: 'trip_request';
  traveler_profile?: Profile | null;
  payment_status?: 'unpaid' | 'pending_review' | 'paid' | 'rejected' | null;
  payment_method?: 'zaincash' | 'qicard' | 'other' | null;
  payment_amount_iqd?: number | null;
  payment_proof_url?: string | null;
  payment_reference?: string | null;
}

interface TripRequestCardProps {
  req: RequestWithPayment;
  priceCalculation: ReturnType<typeof calculateShippingCost> | null;
  onCancelRequest: (request: RequestWithPayment) => void;
  deleteRequestMutation: any;
  onCancelAcceptedRequest: (request: RequestWithPayment) => void;
  onEditRequest: (request: RequestWithPayment) => void;
  onUploadSenderPhotos: (request: RequestWithPayment) => void;
  onTrackingUpdate: (request: RequestWithPayment, newStatus: RequestTrackingStatus) => void;
  trackingUpdateMutation: any;
  onOpenPaymentDialog: (request: RequestWithPayment) => void;
  t: (key: string, options?: any) => string;
}

const REPORT_BUCKET = 'report-photos';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'accepted':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-yellow-500" />;
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'accepted':
      return 'default';
    case 'rejected':
      return 'destructive';
    default:
      return 'secondary';
  }
};

const getStatusCardClass = (status: string) => {
  switch (status) {
    case 'accepted':
      return 'border-green-500/30 bg-green-50 dark:bg-green-900/20';
    case 'rejected':
      return 'border-red-500/30 bg-red-50 dark:bg-red-900/20';
    default:
      return 'border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/20';
  }
};

const TripRequestCard: React.FC<TripRequestCardProps> = ({
  req,
  priceCalculation,
  onCancelRequest,
  deleteRequestMutation,
  onCancelAcceptedRequest,
  onEditRequest,
  onUploadSenderPhotos,
  onTrackingUpdate,
  trackingUpdateMutation,
  onOpenPaymentDialog,
  t,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const { data: chatStatus } = useChatReadStatus(req.id);
  const { user } = useSession();
  const hasNewMessage = req.status === 'accepted' && chatStatus?.hasUnread;

  const travelerName =
    `${req.traveler_profile?.first_name || ''} ${req.traveler_profile?.last_name || ''}`.trim() ||
    t('traveler');
  const travelerIsVerified = !!req.traveler_profile?.is_verified;
  const fromCountry = req.trips?.from_country || 'N/A';
  const toCountry = req.trips?.to_country || 'N/A';
  const tripDate = req.trips?.trip_date;
  const isRejected = req.status === 'rejected';
  const currentTrackingStatus = req.tracking_status;
  const hasPendingChanges = !!req.proposed_changes;
  const isGeneralOrderMatch = !!req.general_order_id;

  const paymentStatus = req.payment_status || 'unpaid';
  const showPayButton =
    req.status === 'accepted' && (paymentStatus === 'unpaid' || paymentStatus === 'rejected');

  const paymentDoneStage = TRACKING_STAGES.find((s) => s.key === 'payment_done');
  const travelerInspectionStage = TRACKING_STAGES.find(
    (s) => s.key === 'traveler_inspection_complete'
  );
  const currentStage = TRACKING_STAGES.find((s) => s.key === currentTrackingStatus);

  const canShowSenderUploadButton =
    req.status === 'accepted' &&
    !!paymentDoneStage &&
    !!travelerInspectionStage &&
    !!currentStage &&
    currentStage.order >= paymentDoneStage.order &&
    currentStage.order < travelerInspectionStage.order &&
    (!req.sender_item_photos || req.sender_item_photos.length === 0);

  const canUpdateToCompleted =
    req.status === 'accepted' && currentTrackingStatus === 'delivered';

  // === إلغاء مشترك: هل الطرف الآخر هو الذي طلب الإلغاء؟ ===
  const otherPartyRequestedCancellation =
    req.status === 'accepted' &&
    !!req.cancellation_requested_by &&
    user?.id &&
    req.cancellation_requested_by !== user.id;

  // === Reporting state (كما في الكود السابق) ===
  const isCompleted = currentTrackingStatus === 'completed';
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportPreviewUrl, setReportPreviewUrl] = useState<string | null>(null);
  const [sendingReport, setSendingReport] = useState(false);

  const renderPaymentBadge = () => {
    switch (paymentStatus) {
      case 'paid':
        return (
          <Badge variant="outline" className="border-green-500 text-green-600 text-[11px]">
            تم الدفع
          </Badge>
        );
      case 'pending_review':
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-600 text-[11px]">
            بانتظار مراجعة الدفع
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="border-red-500 text-red-600 text-[11px]">
            تم رفض إثبات الدفع
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[11px]">
            غير مدفوع
          </Badge>
        );
    }
  };

  const handleOpenChat = () => {
    window.location.href = `/chat/${req.id}`;
  };

  const handleEdit = () => onEditRequest(req);
  const handleCancel = () => onCancelRequest(req);
  const handleCancelAccepted = () => onCancelAcceptedRequest(req);
  const handleUploadPhotos = () => onUploadSenderPhotos(req);

  const handleReportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError(t('invalidFileType'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showError(t('fileTooLarge'));
      return;
    }

    if (reportPreviewUrl) {
      URL.revokeObjectURL(reportPreviewUrl);
    }

    const url = URL.createObjectURL(file);
    setReportPreviewUrl(url);
    setReportFile(file);
  };

  const ensureReportBucket = async () => {
    const { data, error } = await supabase.functions.invoke('create-report-photos-bucket');
    if (error) {
      console.error('Error ensuring report-photos bucket:', error);
      throw new Error(error.message || 'Failed to prepare storage for report photos.');
    }
    if (!data?.success) {
      console.error('create-report-photos-bucket returned non-success payload:', data);
      throw new Error('Failed to prepare storage for report photos.');
    }
  };

  const uploadReportPhoto = async (): Promise<string | null> => {
    if (!reportFile) return null;

    await ensureReportBucket();

    const ext = reportFile.name.split('.').pop() || 'jpg';
    const path = `${req.id}/${Date.now()}-problem.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(REPORT_BUCKET)
      .upload(path, reportFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Report photo upload error:', uploadError);
      throw new Error(uploadError.message || 'Failed to upload report photo.');
    }

    const { data: publicUrlData } = supabase.storage
      .from(REPORT_BUCKET)
      .getPublicUrl(path);

    return publicUrlData.publicUrl;
  };

  const submitReport = async () => {
    if (!reportText.trim()) {
      showError(t('requiredField'));
      return;
    }

    setSendingReport(true);
    try {
      const photoUrl = await uploadReportPhoto();

      const { error: insertError } = await supabase
        .from('reports')
        .insert({
          request_id: req.id,
          description: reportText.trim(),
          problem_photo_url: photoUrl ?? null,
        });

      if (insertError) {
        console.error('Insert report RLS error:', insertError);
        showError(insertError.message || 'تعذر حفظ البلاغ في قاعدة البيانات.');
        setSendingReport(false);
        return;
      }

      const { error: fnError } = await supabase.functions.invoke('report-order-issue', {
        body: {
          request_id: req.id,
          description: reportText.trim(),
          problem_photo_url: photoUrl ?? null,
        },
      });

      if (fnError) {
        console.error('report-order-issue function error:', fnError);
        showError('تم حفظ البلاغ، ولكن حدث خطأ في إرسال الإشعار للمسؤول.');
      } else {
        showSuccess('تم إرسال البلاغ، سنراجع مشكلتك قريباً.');
      }

      setReportOpen(false);
      setReportText('');
      if (reportPreviewUrl) {
        URL.revokeObjectURL(reportPreviewUrl);
      }
      setReportPreviewUrl(null);
      setReportFile(null);
    } catch (e: any) {
      console.error('Error in report flow:', e);
      showError(e?.message || 'تعذر إرسال البلاغ، حاول مرة أخرى.');
    } finally {
      setSendingReport(false);
    }
  };

  return (
    <>
      <Card
        className={cn(
          getStatusCardClass(req.status),
          isGeneralOrderMatch &&
            'border-2 border-dashed border-blue-500 bg-blue-50 dark:bg-blue-900/20',
          hasNewMessage && 'border-primary shadow-md'
        )}
      >
        <CardHeader className="p-4 pb-2 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(req.status)}
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span>
                    {t('requestTo')} {travelerName}
                  </span>
                  {travelerIsVerified && <VerifiedBadge className="mt-[1px]" />}
                  {isGeneralOrderMatch && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">
                      ({t('generalOrderTitle')})
                    </span>
                  )}
                  {hasNewMessage && <span className="text-primary text-xs">•</span>}
                </CardTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Plane className="h-3 w-3" />
                  <CountryFlag country={fromCountry} showName={false} />
                  <span className="text-xs">←</span>
                  <CountryFlag country={toCountry} showName={false} />
                  {tripDate && ` • ${format(new Date(tripDate), 'MMM d')}`}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={getStatusVariant(req.status)} className="text-xs">
                {hasPendingChanges ? t('pendingChanges') : t(req.status)}
              </Badge>
              {renderPaymentBadge()}
              {hasNewMessage && (
                <Badge variant="destructive" className="text-xs h-5 px-2">
                  {t('newMessage')}
                </Badge>
              )}
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="p-4 pt-0 space-y-4">
            {/* تنبيه أن الطرف الآخر طلب الإلغاء */}
            {otherPartyRequestedCancellation && (
              <Alert variant="default" className="bg-amber-50 border-amber-200 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('otherPartyRequestedCancellation')}</AlertTitle>
                <AlertDescription>
                  {t('confirmMutualCancellationDescription')}
                </AlertDescription>
              </Alert>
            )}

            {req.status !== 'pending' && (
              <div className="pt-2">
                <RequestTracking currentStatus={currentTrackingStatus} isRejected={isRejected} />
              </div>
            )}

            {isCompleted && (
              <>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-md flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>تم إكمال الطلب بنجاح.</span>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReportOpen(true)}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    الإبلاغ عن مشكلة
                  </Button>
                </div>
              </>
            )}

            {!isCompleted && (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Weight className="h-4 w-4 text-muted-foreground" />
                    <span>{req.weight_kg} kg</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{req.destination_city}</span>
                  </div>
                </div>

                {hasPendingChanges && (
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-md space-y-2">
                    <p className="font-semibold text-sm">{t('proposedChanges')}:</p>
                    <p className="text-xs text-muted-foreground">
                      {t('packageWeightKg')}: {req.proposed_changes?.weight_kg} kg
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('packageContents')}: {req.proposed_changes?.description}
                    </p>
                  </div>
                )}

                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-xs"
                    onClick={() => setDetailsExpanded((v) => !v)}
                  >
                    <span>{t('viewDetails')}</span>
                    {detailsExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>

                  {detailsExpanded && (
                    <div className="mt-2 p-3 bg-muted rounded-md space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{travelerName}</span>
                      </div>
                      {req.traveler_profile?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{req.traveler_profile.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(req.created_at), 'PPP')}</span>
                      </div>
                      <div>
                        <p className="font-medium text-xs mt-2">{t('packageContents')}:</p>
                        <p className="text-xs text-muted-foreground">{req.description}</p>
                      </div>
                      <div>
                        <p className="font-medium text-xs mt-2">{t('receiverDetails')}:</p>
                        <p className="text-xs text-muted-foreground">{req.receiver_details}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenChat}
                    className={cn(hasNewMessage && 'border-red-500 text-red-500')}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t('viewChat')}
                  </Button>

                  <div className="flex flex-wrap gap-2 justify-end">
                    {showPayButton && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onOpenPaymentDialog(req)}
                      >
                        <Wallet className="mr-2 h-4 w-4" />
                        إرسال إثبات الدفع
                      </Button>
                    )}

                    {canShowSenderUploadButton && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleUploadPhotos}
                        disabled={trackingUpdateMutation.isPending}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        {t('uploadItemPhotos')}
                      </Button>
                    )}

                    {canUpdateToCompleted && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onTrackingUpdate(req, 'completed')}
                        disabled={trackingUpdateMutation.isPending}
                      >
                        <PackageCheck className="mr-2 h-4 w-4" />
                        {t('markAsCompleted')}
                      </Button>
                    )}

                    {req.status === 'pending' && !hasPendingChanges && (
                      <Button size="sm" variant="secondary" onClick={handleEdit}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {t('editRequest')}
                      </Button>
                    )}

                    {req.status === 'accepted' ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleCancelAccepted}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('requestCancellation')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={deleteRequestMutation.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('cancelRequest')}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              الإبلاغ عن مشكلة في الطلب
            </DialogTitle>
            <DialogDescription>
              صف المشكلة التي واجهتها مع هذا الطلب بالتفصيل، ويمكنك أيضاً إرفاق صورة توضّح المشكلة (مثلاً صورة الطرد عند الاستلام).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium">وصف المشكلة</p>
              <Textarea
                rows={5}
                placeholder="اكتب وصفاً كاملاً للمشكلة، مثلاً: لم يصل الطرد، أو حدث خلاف مع المسافر، أو حالة الطرد سيئة عند الاستلام..."
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                صورة توضح المشكلة (اختياري)
              </p>
              <Input type="file" accept="image/*" onChange={handleReportFileChange} />
              {reportPreviewUrl && (
                <div className="mt-2">
                  <img
                    src={reportPreviewUrl}
                    alt="Problem preview"
                    className="w-full max-h-48 object-contain rounded border"
                  />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                يدعم صور JPG/PNG حتى 10MB. هذه الصورة ستظهر فقط للمسؤول في لوحة التقارير.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={submitReport} disabled={sendingReport}>
              {sendingReport ? t('loading') : 'إرسال البلاغ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TripRequestCard;