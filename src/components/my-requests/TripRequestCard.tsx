"use client";

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Plane, Trash2, MessageSquare, BadgeCheck, CalendarDays, MapPin, User, Phone, CheckCircle, XCircle, Clock, Pencil, Camera, PackageCheck, Weight, DollarSign } from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';
import RequestTracking from '@/components/RequestTracking';
import { RequestTrackingStatus } from '@/lib/tracking-stages';
import { cn } from '@/lib/utils';
import { calculateShippingCost } from '@/lib/pricing';
import { useChatReadStatus } from '@/hooks/use-chat-read-status';
import VerifiedBadge from '@/components/VerifiedBadge';

interface Profile { id: string; first_name: string | null; last_name: string | null; phone: string | null; /* is_verified?: boolean */ }
interface Trip { id: string; user_id: string; from_country: string; to_country: string; trip_date: string; free_kg: number; charge_per_kg: number | null; traveler_location: string | null; notes: string | null; created_at: string; }
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
  sender_item_photos: string[] | null; 
  tracking_status: RequestTrackingStatus;
  general_order_id: string | null;
  type: 'trip_request';
}
interface RequestWithProfiles extends Request { sender_profile: Profile | null; traveler_profile: Profile | null; }

interface TripRequestCardProps {
  req: RequestWithProfiles;
  priceCalculation: ReturnType<typeof calculateShippingCost> | null;
  onCancelRequest: (request: Request) => void;
  deleteRequestMutation: any;
  onCancelAcceptedRequest: (request: Request) => void;
  onEditRequest: (request: Request) => void;
  onUploadSenderPhotos: (request: Request) => void;
  onTrackingUpdate: (request: Request, newStatus: RequestTrackingStatus) => void;
  trackingUpdateMutation: any;
  t: (key: string, options?: any) => string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'accepted': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <Clock className="h-4 w-4 text-yellow-500" />;
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'accepted': return 'default';
    case 'rejected': return 'destructive';
    default: return 'secondary';
  }
};

const getStatusCardClass = (status: string) => {
  switch (status) {
    case 'accepted': return 'border-green-500/30 bg-green-50 dark:bg-green-900/20';
    case 'rejected': return 'border-red-500/30 bg-red-50 dark:bg-red-900/20';
    default: return 'border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/20';
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
  t
}) => {
  const [expanded, setExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const { data: chatStatus } = useChatReadStatus(req.id);
  const hasNewMessage = req.status === 'accepted' && chatStatus?.hasUnread;

  const travelerName = req.traveler_profile?.first_name || t('traveler');
  const travelerIsVerified = false;
  const fromCountry = req.trips?.from_country || 'N/A';
  const toCountry = req.trips?.to_country || 'N/A';
  const tripDate = req.trips?.trip_date;
  const isRejected = req.status === 'rejected';
  const currentTrackingStatus = req.tracking_status;
  const hasPendingChanges = !!req.proposed_changes;
  const isGeneralOrderMatch = !!req.general_order_id;

  // الباقي كما كان، مع استخدام hasNewMessage في الـ Card

  return (
    <Card
      className={cn(
        getStatusCardClass(req.status),
        isGeneralOrderMatch && "border-2 border-dashed border-blue-500 bg-blue-50 dark:bg-blue-900/20",
        hasNewMessage && "border-primary shadow-md"
      )}
    >
      <CardHeader className="p-4 pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(req.status)}
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span>
                  {t('requestTo')} {travelerName}
                </span>
                {travelerIsVerified && <VerifiedBadge className="mt-[1px]" />}
                {isGeneralOrderMatch && <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">({t('generalOrderTitle')})</span>}
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

      {/* باقي الكود كما هو (التتبع، التفاصيل، الأزرار) */}
      {/* ... */}
    </Card>
  );
};

export default TripRequestCard;