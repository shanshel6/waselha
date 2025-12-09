"use client";

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Plane, MapPin, User, Weight, MessageSquare, Phone, CalendarDays, BadgeCheck, CheckCircle, XCircle, Clock, Trash2, Inbox, Camera } from 'lucide-react';
import { calculateShippingCost } from '@/lib/pricing';
import CountryFlag from '@/components/CountryFlag';
import RequestTracking from '@/components/RequestTracking';
import { RequestTrackingStatus } from '@/lib/tracking-stages';
import { cn } from '@/lib/utils';
import { useChatReadStatus } from '@/hooks/use-chat-read-status';
import VerifiedBadge from '@/components/VerifiedBadge';

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
}

interface RequestWithProfiles extends Request {
  sender_profile: Profile | null;
}

interface ReceivedRequestCardProps {
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
    case 'accepted': return 'default';
    case 'rejected': return 'destructive';
    default: return 'secondary';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'accepted': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <Clock className="h-4 w-4 text-yellow-500" />;
  }
};

const ReceivedRequestCard: React.FC<ReceivedRequestCardProps> = ({ 
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
  t 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const { data: chatStatus } = useChatReadStatus(req.id);
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
  const senderIsVerified = false; // profiles table has is_verified, but sender_profile in this component does not include it by schema; keep false unless extended

  let travelerAction: { status: RequestTrackingStatus, tKey: string, icon: React.ElementType } | null = null;
  let secondaryAction: { tKey: string, onClick: () => void, icon: React.ElementType } | null = null;

  if (req.status === 'accepted') {
    const hasInspectionPhotos = req.traveler_inspection_photos && req.traveler_inspection_photos.length > 0;

    if (currentTrackingStatus === 'item_accepted' || currentTrackingStatus === 'sender_photos_uploaded') {
      if (currentTrackingStatus === 'sender_photos_uploaded') {
        secondaryAction = { 
          tKey: hasInspectionPhotos ? 'updateInspectionPhotos' : 'uploadInspectionPhotos', 
          onClick: () => onUploadInspectionPhotos && onUploadInspectionPhotos(req), 
          icon: Camera 
        };
      }
    } 
    
    if (currentTrackingStatus === 'traveler_inspection_complete') {
      travelerAction = { status: 'traveler_on_the_way', tKey: 'markAsOnTheWay', icon: Plane };
    } else if (currentTrackingStatus === 'traveler_on_the_way') {
      travelerAction = { status: 'delivered', tKey: 'markAsDelivered', icon: MapPin };
    }
  }

  return (
    <Card className={cn(isGeneralOrderMatch ? "border-2 border-dashed border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-border")}>
      <CardHeader className="p-4 pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(req.status)}
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span>
                  {t('requestFrom')} {senderName}
                </span>
                {/* If you later extend sender_profile with is_verified, replace senderIsVerified with that flag */}
                {senderIsVerified && <VerifiedBadge className="mt-[1px]" />}
                {isGeneralOrderMatch && <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">({t('generalOrderTitle')})</span>}
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
        <CardContent className="p-4 pt-0 space-y-3">
          {req.status !== 'pending' && (
            <div className="pt-2">
              <RequestTracking 
                currentStatus={currentTrackingStatus} 
                isRejected={isRejected} 
              />
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

          {priceCalculation && (
            <div className="bg-primary/10 p-2 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t('estimatedCost')}:</span>
                <span className="font-bold text-green-700">${priceCalculation.totalPriceUSD.toFixed(2)}</span>
              </div>
            </div>
          )}
          
          {hasPendingChanges && (
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-md space-y-2">
              <p className="font-semibold text-sm">{t('proposedChanges')}:</p>
              <p className="text-xs text-muted-foreground">
                {t('packageWeightKg')}: {req.proposed_changes?.weight_kg} kg
              </p>
              <p className="text-xs text-muted-foreground">
                {t('packageContents')}: {req.proposed_changes?.description}
              </p>
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={() => onReviewChanges({ request: req, accept: true })}
                  disabled={reviewChangesMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {t('acceptChanges')}
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => onReviewChanges({ request: req, accept: false })}
                  disabled={reviewChangesMutation.isPending}
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
              className="w-full justify-between text-xs" 
              onClick={() => setDetailsExpanded(!detailsExpanded)}
            >
              <span>{t('viewDetails')}</span>
              {detailsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
            
            {detailsExpanded && (
              <div className="mt-2 p-3 bg-muted rounded-md space-y-2 text-sm">
                <div>
                  <p className="font-medium">{t('packageContents')}:</p>
                  <p className="text-muted-foreground">{req.description}</p>
                </div>
                <div>
                  <p className="font-medium">{t('receiverDetails')}:</p>
                  <p className="text-muted-foreground">{req.receiver_details}</p>
                </div>
                {req.sender_item_photos && req.sender_item_photos.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="font-medium">{t('senderItemPhotos')}:</p>
                    <div className="flex gap-2 overflow-x-auto pt-1">
                      {req.sender_item_photos.map((url, index) => (
                        <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                          <img src={url} alt={`Item ${index}`} className="h-12 w-12 object-cover rounded-md" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {req.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                onClick={() => onUpdateRequest(req, 'accepted')}
                disabled={updateRequestMutation.isPending}
                className="flex-1"
              >
                {t('accept')}
              </Button>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => onUpdateRequest(req, 'rejected')}
                disabled={updateRequestMutation.isPending}
                className="flex-1"
              >
                {t('reject')}
              </Button>
            </div>
          )}

          {req.status === 'accepted' && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Link to={`/chat/${req.id}`}>
                <Button size="sm" variant="outline" className={cn(hasNewMessage && "border-red-500 text-red-500")}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t('viewChat')}
                  {hasNewMessage && <Badge variant="destructive" className="ml-2 h-4 w-4 p-0 flex items-center justify-center text-xs">!</Badge>}
                </Button>
              </Link>
              
              {secondaryAction && (
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={secondaryAction.onClick}
                >
                  <secondaryAction.icon className="mr-2 h-4 w-4" />
                  {t(secondaryAction.tKey)}
                </Button>
              )}
              
              {travelerAction && (
                <Button 
                  size="sm" 
                  onClick={() => onTrackingUpdate(req, travelerAction!.status)}
                  disabled={trackingUpdateMutation.isPending}
                >
                  <travelerAction.icon className="mr-2 h-4 w-4" />
                  {t(travelerAction.tKey)}
                </Button>
              )}
              
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => onCancelAcceptedRequest(req)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('cancelRequest')}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default ReceivedRequestCard;