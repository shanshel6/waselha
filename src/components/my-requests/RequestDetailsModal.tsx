"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Weight, 
  Plane, 
  Package, 
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';
import RequestTracking from '@/components/RequestTracking';
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

interface RequestDetailsModalProps {
  request: Request;
  senderProfile: Profile | null;
  travelerProfile: Profile | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isSenderView: boolean;
}

const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({
  request,
  senderProfile,
  travelerProfile,
  isOpen,
  onOpenChange,
  isSenderView
}) => {
  const { t } = useTranslation();

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPartyName = (profile: Profile | null) => {
    if (!profile) return t('user');
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || t('user');
  };

  const senderName = getPartyName(senderProfile);
  const travelerName = getPartyName(travelerProfile);
  const otherPartyName = isSenderView ? travelerName : senderName;
  const otherPartyPhone = isSenderView ? travelerProfile?.phone : senderProfile?.phone;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('requestDetails')}</span>
            <Badge variant={getStatusVariant(request.status)}>
              {t(request.status)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trip Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                {t('tripInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CountryFlag country={request.trips.from_country} showName />
                  <span>→</span>
                  <CountryFlag country={request.trips.to_country} showName />
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(request.trips.trip_date), 'PPP')}
                </span>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Weight className="h-4 w-4 text-muted-foreground" />
                  <span>{request.trips.free_kg} kg {t('available')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>{request.weight_kg} kg {t('requested')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tracking Status */}
          {request.status !== 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t('trackingStatus')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RequestTracking 
                  currentStatus={request.tracking_status} 
                  isRejected={request.status === 'rejected'} 
                />
              </CardContent>
            </Card>
          )}

          {/* Party Information */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isSenderView ? t('travelerInformation') : t('senderInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{otherPartyName}</span>
              </div>
              {otherPartyPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{otherPartyPhone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Package Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t('packageDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium">{t('packageContents')}</h4>
                <p className="text-muted-foreground">{request.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">{t('destinationCity')}</h4>
                  <p className="text-muted-foreground">{request.destination_city}</p>
                </div>
                <div>
                  <h4 className="font-medium">{t('receiverDetails')}</h4>
                  <p className="text-muted-foreground">{request.receiver_details}</p>
                </div>
              </div>
              
              {request.handover_location && (
                <div>
                  <h4 className="font-medium">{t('handoverLocation')}</h4>
                  <p className="text-muted-foreground">{request.handover_location}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photos */}
          {request.sender_item_photos && request.sender_item_photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('senderItemPhotos')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {request.sender_item_photos.map((url, index) => (
                    <a 
                      key={index} 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img 
                        src={url} 
                        alt={`Item ${index + 1}`} 
                        className="w-full h-24 object-cover rounded-md border"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Proposed Changes */}
          {request.proposed_changes && (
            <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
              <CardHeader>
                <CardTitle className="text-yellow-800 dark:text-yellow-200">
                  {t('proposedChanges')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <h4 className="font-medium">{t('packageWeightKg')}</h4>
                  <p className="text-muted-foreground">{request.proposed_changes.weight_kg} kg</p>
                </div>
                <div>
                  <h4 className="font-medium">{t('packageContents')}</h4>
                  <p className="text-muted-foreground">{request.proposed_changes.description}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequestDetailsModal;