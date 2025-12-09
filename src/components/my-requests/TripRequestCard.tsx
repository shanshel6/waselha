"use client";

import React, { useState } from 'react';
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
} from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';
import RequestTracking from '@/components/RequestTracking';
import { RequestTrackingStatus, TRACKING_STAGES } from '@/lib/tracking-stages';
import { cn } from '@/lib/utils';
import { calculateShippingCost } from '@/lib/pricing';
import { useChatReadStatus } from '@/hooks/use-chat-read-status';
import VerifiedBadge from '@/components/VerifiedBadge';

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

  // Payment state
  const paymentStatus = req.payment_status || 'unpaid';
  const showPayButton =
    req.status === 'accepted' && (paymentStatus === 'unpaid' || paymentStatus === 'rejected');

  // Only allow sender photo upload once tracking >= payment_done
  const paymentDoneStage = TRACKING_STAGES.find((s) => s.key === 'payment_done');
  const currentStage = TRACKING_STAGES.find((s) => s.key === currentTrackingStatus);
  const isPaymentStepReached =
    !!paymentDoneStage && !!currentStage && currentStage.order >= paymentDoneStage.order;

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

  const canUpdateToCompleted =
    req.status === 'accepted' && currentTrackingStatus === 'delivered';

  return (
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
          {/* Tracking status */}
          {req.status !== 'pending' && (
            <div className="pt-2">
              <RequestTracking currentStatus={currentTrackingStatus} isRejected={isRejected} />
            </div>
          )}

          {/* Quick overview */}
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

          {/* Pending changes */}
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

          {/* Details toggle */}
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

          {/* Action buttons */}
          <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
            {/* Chat button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenChat}
              className={cn(hasNewMessage && 'border-red-500 text-red-500')}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {t('viewChat')}
            </Button>

            {/* Right side actions */}
            <div className="flex flex-wrap gap-2 justify-end">
              {/* Payment proof */}
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

              {/* Upload item photos: ONLY after payment step is reached */}
              {req.status === 'accepted' && isPaymentStepReached && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleUploadPhotos}
                  disabled={trackingUpdateMutation.isPending}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {req.sender_item_photos && req.sender_item_photos.length > 0
                    ? t('updateItemPhotos')
                    : t('uploadItemPhotos')}
                </Button>
              )}

              {/* Mark as completed (after delivered) */}
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

              {/* Edit pending request */}
              {req.status === 'pending' && !hasPendingChanges && (
                <Button size="sm" variant="secondary" onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('editRequest')}
                </Button>
              )}

              {/* Cancel / delete */}
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
        </CardContent>
      )}
    </Card>
  );
};

export default TripRequestCard;