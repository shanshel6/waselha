"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronUp, 
  Plane, 
  Weight, 
  MapPin, 
  User,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';
import RequestTracking from '@/components/RequestTracking';
import { cn } from '@/lib/utils';
import { RequestTrackingStatus } from '@/lib/tracking-stages';

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
  sender_item_photos: string[] | null;
  tracking_status: RequestTrackingStatus;
  general_order_id: string | null;
  type: 'trip_request';
}

interface RequestCardProps {
  request: Request;
  senderProfile: Profile | null;
  travelerProfile: Profile | null;
  isSenderView: boolean;
  hasNewMessage: boolean;
  onChatClick: () => void;
  onCancelRequest: () => void;
  onEditRequest: () => void;
  onUploadSenderPhotos: () => void;
  onUploadInspectionPhotos: () => void;
  onTrackingUpdate: (newStatus: RequestTrackingStatus) => void;
  onViewDetails: () => void;
  isMutating: boolean;
}

const RequestCard: React.FC<RequestCardProps> = ({
  request,
  senderProfile,
  travelerProfile,
  isSenderView,
  hasNewMessage,
  onChatClick,
  onCancelRequest,
  onEditRequest,
  onUploadSenderPhotos,
  onUploadInspectionPhotos,
  onTrackingUpdate,
  onViewDetails,
  isMutating
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

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

  const getPartyName = (profile: Profile | null) => {
    if (!profile) return t('user');
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || t('user');
  };

  const senderName = getPartyName(senderProfile);
  const travelerName = getPartyName(travelerProfile);
  const otherPartyName = isSenderView ? travelerName : senderName;

  const fromCountry = request.trips?.from_country || 'N/A';
  const toCountry = request.trips?.to_country || 'N/A';
  const tripDate = request.trips?.trip_date;

  const isRejected = request.status === 'rejected';
  const currentTrackingStatus = request.tracking_status;
  const hasPendingChanges = !!request.proposed_changes;
  const isGeneralOrderMatch = !!request.general_order_id;

  return (
    <Card className={cn(
      getStatusCardClass(request.status),
      isGeneralOrderMatch && "border-2 border-dashed border-blue-500 bg-blue-50 dark:bg-blue-900/20"
    )}>
      <CardHeader className="p-4 pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(request.status)}
            <div>
              <h3 className="text-base font-semibold">
                {isSenderView 
                  ? `${t('requestTo')} ${travelerName}` 
                  : `${t('requestFrom')} ${senderName}`}
                {isGeneralOrderMatch && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                    ({t('generalOrderTitle')})
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Plane className="h-3 w-3" />
                <CountryFlag country={fromCountry} showName={false} />
                <span className="text-xs">→</span>
                <CountryFlag country={toCountry} showName={false} />
                {tripDate && ` • ${format(new Date(tripDate), 'MMM d')}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(request.status)} className="text-xs">
              {hasPendingChanges ? t('pendingChanges') : t(request.status)}
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
          {/* Tracking Status */}
          {request.status !== 'pending' && (
            <div className="pt-2">
              <RequestTracking 
                currentStatus={currentTrackingStatus} 
                isRejected={isRejected} 
              />
            </div>
          )}

          {/* Quick Overview */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Weight className="h-4 w-4 text-muted-foreground" />
              <span>{request.weight_kg} kg</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{request.destination_city}</span>
            </div>
          </div>

          {/* Pending Changes Alert */}
          {hasPendingChanges && (
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-md space-y-2">
              <p className="font-semibold text-sm">{t('proposedChanges')}:</p>
              <p className="text-xs text-muted-foreground">
                {t('packageWeightKg')}: {request.proposed_changes?.weight_kg} kg
              </p>
              <p className="text-xs text-muted-foreground">
                {t('packageContents')}: {request.proposed_changes?.description}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onViewDetails}
            >
              {t('viewDetails')}
            </Button>
            
            {/* Action buttons would go here in a real implementation */}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default RequestCard;