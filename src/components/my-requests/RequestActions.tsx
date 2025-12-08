"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Trash2, 
  Pencil, 
  Camera, 
  Plane, 
  MapPin, 
  PackageCheck,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { RequestTrackingStatus } from '@/lib/tracking-stages';
import { cn } from '@/lib/utils';

interface Request {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  tracking_status: RequestTrackingStatus;
  proposed_changes: { weight_kg: number; description: string } | null;
  sender_item_photos: string[] | null;
  traveler_inspection_photos: string[] | null;
  cancellation_requested_by: string | null;
  updated_at: string | null;
}

interface RequestActionsProps {
  request: Request;
  isSenderView: boolean;
  hasNewMessage: boolean;
  onChatClick: () => void;
  onCancelRequest: () => void;
  onEditRequest: () => void;
  onUploadSenderPhotos: () => void;
  onUploadInspectionPhotos: () => void;
  onTrackingUpdate: (newStatus: RequestTrackingStatus) => void;
  isMutating: boolean;
  className?: string;
}

const RequestActions: React.FC<RequestActionsProps> = ({
  request,
  isSenderView,
  hasNewMessage,
  onChatClick,
  onCancelRequest,
  onEditRequest,
  onUploadSenderPhotos,
  onUploadInspectionPhotos,
  onTrackingUpdate,
  isMutating,
  className
}) => {
  const { t } = useTranslation();

  const isCompleted = request.tracking_status === 'completed';
  const isChatExpired = isCompleted && 
    request.updated_at && 
    (new Date().getTime() - new Date(request.updated_at).getTime()) / (1000 * 60 * 60 * 24) >= 7;

  // Sender actions
  let senderAction: { 
    status: RequestTrackingStatus, 
    tKey: string, 
    icon: React.ElementType,
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined
  } | null = null;

  if (isSenderView && request.status === 'accepted') {
    if (request.tracking_status === 'delivered') {
      senderAction = { 
        status: 'completed', 
        tKey: 'markAsCompleted', 
        icon: PackageCheck,
        variant: "default"
      };
    }
  }

  // Traveler actions
  let travelerAction: { 
    status: RequestTrackingStatus, 
    tKey: string, 
    icon: React.ElementType,
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined
  } | null = null;
  
  let secondaryAction: { 
    tKey: string, 
    onClick: () => void, 
    icon: React.ElementType,
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined
  } | null = null;

  if (!isSenderView && request.status === 'accepted') {
    const hasInspectionPhotos = request.traveler_inspection_photos && request.traveler_inspection_photos.length > 0;
    
    if (request.tracking_status === 'item_accepted' || request.tracking_status === 'sender_photos_uploaded') {
      if (request.tracking_status === 'sender_photos_uploaded') {
        secondaryAction = { 
          tKey: hasInspectionPhotos ? 'updateInspectionPhotos' : 'uploadInspectionPhotos',
          onClick: onUploadInspectionPhotos,
          icon: Camera,
          variant: "secondary"
        };
      }
    }
    
    if (request.tracking_status === 'traveler_inspection_complete') {
      travelerAction = { 
        status: 'traveler_on_the_way', 
        tKey: 'markAsOnTheWay', 
        icon: Plane,
        variant: "default"
      };
    } else if (request.tracking_status === 'traveler_on_the_way') {
      travelerAction = { 
        status: 'delivered', 
        tKey: 'markAsDelivered', 
        icon: MapPin,
        variant: "default"
      };
    }
  }

  // Cancellation states
  const cancellationRequested = request.cancellation_requested_by;
  const isCurrentUserRequester = cancellationRequested && cancellationRequested === 'current-user-id'; // This would be passed in real implementation
  const isOtherUserRequester = cancellationRequested && cancellationRequested !== 'current-user-id';

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {/* Chat Button */}
      {request.status === 'accepted' && !isChatExpired && (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onChatClick}
          className={cn(hasNewMessage && "border-red-500 text-red-500")}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          {t('viewChat')}
          {hasNewMessage && (
            <Badge variant="destructive" className="ml-2 h-4 w-4 p-0 flex items-center justify-center text-xs">
              !
            </Badge>
          )}
        </Button>
      )}

      {/* Secondary Action (Photos) */}
      {secondaryAction && (
        <Button 
          size="sm" 
          variant={secondaryAction.variant || "secondary"}
          onClick={secondaryAction.onClick}
          disabled={isMutating}
        >
          <secondaryAction.icon className="mr-2 h-4 w-4" />
          {t(secondaryAction.tKey)}
        </Button>
      )}

      {/* Primary Tracking Action */}
      {senderAction && (
        <Button 
          size="sm" 
          variant={senderAction.variant || "default"}
          onClick={() => onTrackingUpdate(senderAction!.status)}
          disabled={isMutating}
        >
          <senderAction.icon className="mr-2 h-4 w-4" />
          {t(senderAction.tKey)}
        </Button>
      )}

      {travelerAction && (
        <Button 
          size="sm" 
          variant={travelerAction.variant || "default"}
          onClick={() => onTrackingUpdate(travelerAction!.status)}
          disabled={isMutating}
        >
          <travelerAction.icon className="mr-2 h-4 w-4" />
          {t(travelerAction.tKey)}
        </Button>
      )}

      {/* Upload Photos Button */}
      {isSenderView && request.status === 'accepted' && 
       (request.tracking_status === 'item_accepted' || request.tracking_status === 'sender_photos_uploaded') && (
        <Button 
          size="sm" 
          variant="secondary"
          onClick={onUploadSenderPhotos}
          disabled={isMutating}
        >
          <Camera className="mr-2 h-4 w-4" />
          {request.sender_item_photos && request.sender_item_photos.length > 0 
            ? t('updateItemPhotos') 
            : t('uploadItemPhotos')}
        </Button>
      )}

      {/* Edit Button (Pending Requests) */}
      {request.status === 'pending' && !request.proposed_changes && (
        <Button 
          size="sm" 
          variant="secondary"
          onClick={onEditRequest}
          disabled={isMutating}
        >
          <Pencil className="mr-2 h-4 w-4" />
          {t('editRequest')}
        </Button>
      )}

      {/* Cancel Button */}
      {request.status !== 'rejected' && (
        <Button 
          size="sm" 
          variant="destructive"
          onClick={onCancelRequest}
          disabled={isMutating || (isCurrentUserRequester && request.status === 'accepted')}
        >
          {isOtherUserRequester && request.status === 'accepted' ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              {t('confirmCancellation')}
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              {t('cancelRequest')}
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default RequestActions;