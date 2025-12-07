"use client";
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Plane, Package, Trash2, MessageSquare, BadgeCheck, DollarSign, CalendarDays, MapPin, User, Phone, CheckCircle, XCircle, Clock, Pencil, Camera, PackageCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { calculateShippingCost } from '@/lib/pricing';
import CountryFlag from '@/components/CountryFlag';
import RequestTracking from '@/components/RequestTracking';
import { RequestTrackingStatus } from '@/lib/tracking-stages';

interface Profile { id: string; first_name: string | null; last_name: string | null; phone: string | null; }
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
}
interface RequestWithProfiles extends Request { sender_profile: Profile | null; traveler_profile: Profile | null; }

interface SentRequestsTabProps {
  user: any;
  onCancelRequest: (request: any) => void;
  deleteRequestMutation: any;
  onCancelAcceptedRequest: (request: Request) => void;
  onEditRequest: (request: Request) => void;
  onUploadSenderPhotos: (request: Request) => void;
  onTrackingUpdate: (request: Request, newStatus: RequestTrackingStatus) => void;
  trackingUpdateMutation: any;
}

const CompactSentRequestCard: React.FC<{ 
  req: RequestWithProfiles; 
  priceCalculation: ReturnType<typeof calculateShippingCost>;
  onCancelRequest: (request: any) => void;
  deleteRequestMutation: any;
  onCancelAcceptedRequest: (request: Request) => void;
  onEditRequest: (request: Request) => void;
  onUploadSenderPhotos: (request: Request) => void;
  onTrackingUpdate: (request: Request, newStatus: RequestTrackingStatus) => void;
  trackingUpdateMutation: any;
  t: any;
}> = ({ 
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

  const travelerName = req.traveler_profile?.first_name || t('traveler');
  const fromCountry = req.trips?.from_country || 'N/A';
  const toCountry = req.trips?.to_country || 'N/A';
  const tripDate = req.trips?.trip_date;
  const isRejected = req.status === 'rejected';
  const currentTrackingStatus = req.tracking_status;
  const hasPendingChanges = !!req.proposed_changes;

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

  const renderAcceptedDetails = (req: RequestWithProfiles) => {
    if (req.status !== 'accepted') return null;

    const otherParty = req.traveler_profile;
    const trip = req.trips;
    const otherPartyName = `${otherParty?.first_name || ''} ${otherParty?.last_name || ''}`.trim() || t('user');
    const otherPartyPhone = otherParty?.phone || t('noPhoneProvided');
    const cancellationRequested = req.cancellation_requested_by;
    const isCurrentUserRequester = cancellationRequested === req.sender_id;
    const isOtherUserRequester = cancellationRequested && cancellationRequested !== req.sender_id;
    const currentTrackingStatus = req.tracking_status;
    const isCompleted = currentTrackingStatus === 'completed';
    const isChatExpired = isCompleted && req.updated_at && differenceInDays(new Date(), new Date(req.updated_at)) >= 7;

    let senderAction: { status: RequestTrackingStatus, tKey: string, icon: React.ElementType } | null = null;
    if (currentTrackingStatus === 'delivered') {
      senderAction = { status: 'completed', tKey: 'markAsCompleted', icon: PackageCheck };
    }

    return (
      <div className="mt-4 p-4 border rounded-lg bg-green-100 dark:bg-green-900/30 space-y-3">
        <h4 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
          <BadgeCheck className="h-5 w-5" />
          {t('requestAcceptedTitle')}
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <p className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span className="font-semibold">{t('traveler')}:</span>
            {otherPartyName}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            <span className="font-semibold">{t('phone')}:</span>
            {otherPartyPhone}
          </p>
        </div>
        
        <div className="border-t pt-3 space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            <span className="font-semibold">{t('tripRoute')}:</span>
            <CountryFlag country={trip?.from_country || 'N/A'} showName /> → <CountryFlag country={trip?.to_country || 'N/A'} showName />
          </p>
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="font-semibold">{t('tripDate')}:</span>
            {trip?.trip_date ? format(new Date(trip.trip_date), 'PPP') : t('dateNotSet')}
          </p>
        </div>
        
        {cancellationRequested && (
          <div className={`p-3 rounded-md text-sm ${
            isCurrentUserRequester 
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' 
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
          }`}>
            {isCurrentUserRequester 
              ? t('waitingForOtherPartyCancellation') 
              : t('otherPartyRequestedCancellation')}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {!isChatExpired && (
            <Link to={`/chat/${req.id}`}>
              <Button size="sm" variant="outline">
                <MessageSquare className="mr-2 h-4 w-4" />
                {t('viewChat')}
              </Button>
            </Link>
          )}
          
          {!isCompleted && (currentTrackingStatus === 'item_accepted' || currentTrackingStatus === 'sender_photos_uploaded') && (
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => onUploadSenderPhotos(req)}
            >
              <Camera className="mr-2 h-4 w-4" />
              {req.sender_item_photos && req.sender_item_photos.length > 0 ? t('updateItemPhotos') : t('uploadItemPhotos')}
            </Button>
          )}
          
          {!isCompleted && senderAction && (
            <Button 
              size="sm" 
              onClick={() => onTrackingUpdate(req, senderAction!.status)}
              disabled={trackingUpdateMutation.isPending}
            >
              <senderAction.icon className="mr-2 h-4 w-4" />
              {t(senderAction.tKey)}
            </Button>
          )}
          
          {!isCompleted && (
            <Button size="sm" variant="destructive" onClick={() => onCancelAcceptedRequest(req)} disabled={isCurrentUserRequester}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isOtherUserRequester ? t('confirmCancellation') : t('cancelRequest')}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className={getStatusCardClass(req.status)}>
      <CardHeader className="p-4 pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(req.status)}
            <div>
              <CardTitle className="text-base font-semibold">
                {t('requestTo')} {travelerName}
              </CardTitle>
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
            <Badge variant={getStatusVariant(req.status)} className="text-xs">
              {hasPendingChanges ? t('pendingChanges') : t(req.status)}
            </Badge>
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
              </div>
            )}
          </div>

          {renderAcceptedDetails(req)}
          
          {req.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <Button variant="destructive" size="sm" onClick={() => onCancelRequest(req)} disabled={deleteRequestMutation.isPending}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('cancelRequest')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onEditRequest(req)} disabled={hasPendingChanges}>
                <Pencil className="mr-2 h-4 w-4" />
                {t('editRequest')}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export const SentRequestsTab = ({ user, onCancelRequest, deleteRequestMutation, onCancelAcceptedRequest, onEditRequest, onUploadSenderPhotos, onTrackingUpdate, trackingUpdateMutation }: SentRequestsTabProps) => {
  const { t } = useTranslation();

  const { data: tripRequests, isLoading: isLoadingTripRequests, error: tripRequestsError } = useQuery({
    queryKey: ['sentTripRequests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: requests, error: requestsError } = await supabase.from('requests').select(`*, trips(*)`).eq('sender_id', user.id).order('created_at', { ascending: false });
      if (requestsError) throw new Error(requestsError.message);
      const travelerIds = [...new Set(requests.map(r => r.trips.user_id).filter(id => id))];
      const { data: travelerProfiles, error: profilesError } = await supabase.from('profiles').select('id, first_name, last_name, phone').in('id', travelerIds);
      if (profilesError) throw new Error(profilesError.message);
      const profileMap = travelerProfiles.reduce((acc, profile) => { acc[profile.id] = profile; return acc; }, {} as Record<string, Profile>);
      return requests.map(request => ({ ...request, sender_profile: null, traveler_profile: profileMap[request.trips.user_id] || null })) as RequestWithProfiles[];
    },
    enabled: !!user,
  });

  const isLoadingSent = isLoadingTripRequests;
  const sentRequestsError = tripRequestsError;

  if (isLoadingSent) return <p>{t('loading')}</p>;

  if (sentRequestsError) return <p className="text-red-500">Error loading sent requests: {sentRequestsError.message}</p>;

  return (
    <div className="space-y-3">
      {tripRequests && tripRequests.length > 0 ? (
        tripRequests.map(req => {
          const priceCalculation = calculateShippingCost(
            req.trips?.from_country || '',
            req.trips?.to_country || '',
            req.weight_kg
          );

          return (
            <CompactSentRequestCard
              key={req.id}
              req={req}
              priceCalculation={priceCalculation}
              onCancelRequest={onCancelRequest}
              deleteRequestMutation={deleteRequestMutation}
              onCancelAcceptedRequest={onCancelAcceptedRequest}
              onEditRequest={onEditRequest}
              onUploadSenderPhotos={onUploadSenderPhotos}
              onTrackingUpdate={onTrackingUpdate}
              trackingUpdateMutation={trackingUpdateMutation}
              t={t}
            />
          );
        })
      ) : !isLoadingSent && !sentRequestsError ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold">{t('noSentRequests')}</p>
            <p className="text-muted-foreground mt-2">لم تقم بإرسال أي طلبات بعد.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};