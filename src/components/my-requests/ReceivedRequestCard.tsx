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
  MapPin,
  User,
  Weight,
  MessageSquare,
  Phone,
  CalendarDays,
  CheckCircle,
  XCircle,
  Clock,
  Camera,
  Trash2,
} from 'lucide-react';
import { calculateShippingCost } from '@/lib/pricing';
import CountryFlag from '@/components/CountryFlag';
import RequestTracking from '@/components/RequestTracking';
import { RequestTrackingStatus } from '@/lib/tracking-stages';
import { cn } from '@/lib/utils';
import { useChatReadStatus } from '@/hooks/use-chat-read-status';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSession } from '@/integrations/supabase/SessionContextProvider';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
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

interface Request {
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
}

interface RequestWithProfiles extends Request {
  sender_profile: Profile | null;
}

interface ReceivedRequestsTabProps {
  req: RequestWithProfiles;
  priceCalculation: ReturnType<typeof calculateShippingCost> | null;
  onUpdateRequest: (request: Request, status: 'accepted' | 'rejected') => void;
  updateRequestMutation: any;
  onCancelAcceptedRequest: (request: Request) => void;
  onReviewChanges: (args: { request: Request; accept: boolean }) => void;
  reviewChangesMutation: any;
  onUploadInspectionPhotos?: (request: Request) => void;
  onTrackingUpdate: (request: Request, newStatus: RequestTrackingStatus) => void;
  trackingUpdateMutation: any;
  t: (key: string, options?: any) => string;
}

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

const ReceivedRequestCard: React.FC<ReceivedRequestsTabProps> = ({
  req,
  priceCalculation,
  onUpdateRequest,
  updateRequestMutation,
  onCancelAcceptedRequest,
  onReviewChanges,
  reviewChangesMutation,
  onUploadInspectionPhotos,
  onTrackingUpdate,
  trackingUpdateMutation,
  t,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const { data: chatStatus } = useChatReadStatus(req.id);
  const { user } = useSession();
  const hasNewMessage = req.status === 'accepted' && chatStatus?.hasUnread;

  const senderFirstName = req.sender_profile?.first_name || '';
  const senderLastName = req.sender_profile?.last_name || '';
  const senderName = `${senderFirstName} ${senderLastName}`.trim() || t('user');

  const fromCountry = req.trips?.from_country || 'N/A';
  const toCountry = req.trips?.to_country || 'N/A';
  const tripDate = req.trips?.trip_date;
  const isRejected = req.status === 'rejected';
  const currentTrackingStatus = req.tracking_status;
  const hasPendingChanges = !!req.proposed_changes;
  const isGeneralOrderMatch = !!req.general_order_id;

  // هل الطرف الآخر (المرسل) هو من طلب الإلغاء؟
  const otherPartyRequestedCancellation =
    req.status === 'accepted' &&
    !!req.cancellation_requested_by &&
    user?.id &&
    req.cancellation_requested_by !== user.id;

  const handleAccept = () => onUpdateRequest(req, 'accepted');
  const handleReject = () => onUpdateRequest(req, 'rejected');
  const handleReviewAccept = () => onReviewChanges({ request: req, accept: true });
  const handleReviewReject = () => onReviewChanges({ request: req, accept: false });
  const handleOpenChat = () => {
    window.location.href = `/chat/${req.id}`;
  };

  const canShowInspectionButton =
    req.status === 'accepted' &&
    currentTrackingStatus === 'sender_photos_uploaded' &&
    !!onUploadInspectionPhotos;

  const canUpdateTrackingToOnTheWay =
    req.status === 'accepted' && currentTrackingStatus === 'traveler_inspection_complete';

  const canUpdateTrackingToDelivered =
    req.status === 'accepted' && currentTrackingStatus === 'traveler_on_the_way';

  return (
    <Card
      className={cn(
        getStatusCardClass(req.status),
        isGeneralOrderMatch && 'border-2 border-dashed border-blue-500 bg-blue-50 dark:bg-blue-900/20',
        hasNewMessage && 'border-primary shadow-md'
      )}
    >
      <CardHeader className="p-4 pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify_between">
          <div className="flex items-center gap-3">
            {getStatusIcon(req.status)}
            <div>
              <CardTitle className="text-base font-semibold">
                {t('requestFrom')} {senderName}
                {isGeneralOrderMatch && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">
                    ({t('generalOrderTitle')})
                  </span>
                )}
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
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(req.status)} className="text-xs">
              {hasPendingChanges ? t('pendingChanges') : t(req.status)}
            </Badge>
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
              <div className="flex gap-2 mt-2">
                <Button
                  size="xs"
                  variant="default"
                  disabled={reviewChangesMutation.isPending}
                  onClick={handleReviewAccept}
                >
                  {t('acceptChanges')}
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={reviewChangesMutation.isPending}
                  onClick={handleReviewReject}
                >
                  {t('rejectChanges')}
                </Button>
              </div>
            </div>
          )}

          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify_between text-xs"
              onClick={() => setDetailsExpanded(!detailsExpanded)}
            >
              <span>{t('viewDetails')}</span>
              {detailsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>

            {detailsExpanded && (
              <div className="mt-2 p-3 bg-muted rounded-md space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{senderName}</span>
                </div>
                {req.sender_profile?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{req.sender_profile.phone}</span>
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

          <div className="flex flex-wrap gap-2 justify_between items-center pt-2">
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
              {req.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleAccept}
                    disabled={updateRequestMutation.isPending}
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    {t('accept')}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleReject}
                    disabled={updateRequestMutation.isPending}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    {t('reject')}
                  </Button>
                </>
              )}

              {req.status === 'accepted' && (
                <>
                  {canShowInspectionButton && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onUploadInspectionPhotos && onUploadInspectionPhotos(req)}
                      disabled={trackingUpdateMutation.isPending}
                    >
                      <Camera className="mr-1 h-4 w-4" />
                      ارفع صور للاغراض
                    </Button>
                  )}

                  {canUpdateTrackingToOnTheWay && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onTrackingUpdate(req, 'traveler_on_the_way')}
                      disabled={trackingUpdateMutation.isPending}
                    >
                      <Plane className="mr-1 h-4 w-4" />
                      {t('markAsOnTheWay')}
                    </Button>
                  )}

                  {canUpdateTrackingToDelivered && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onTrackingUpdate(req, 'delivered')}
                      disabled={trackingUpdateMutation.isPending}
                    >
                      <MapPin className="mr-1 h-4 w-4" />
                      {t('markAsDelivered')}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onCancelAcceptedRequest(req)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('requestCancellation')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ReceivedRequestCard;