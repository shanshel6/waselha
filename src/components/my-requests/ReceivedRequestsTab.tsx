"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Plane, Package, MapPin, User, Weight, MessageSquare, Phone, CalendarDays, BadgeCheck, DollarSign, CheckCircle, XCircle, Clock, Trash2, Inbox, ArrowRight, Shield, Camera, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { calculateShippingCost } from '@/lib/pricing';
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
  traveler_inspection_photos?: string[] | null;
  sender_item_photos?: string[] | null;
  tracking_status: RequestTrackingStatus;
  general_order_id: string | null; // Added new field
  type: 'trip_request';
}

type ReceivedItem = Request; // Only trip requests now

interface RequestWithProfiles extends Request {
  sender_profile: Profile | null;
  traveler_profile: Profile | null;
}

interface ReceivedRequestsTabProps {
  user: any;
  onUpdateRequest: (request: any, status: string) => void;
  updateRequestMutation: any;
  onCancelAcceptedRequest: (request: Request) => void;
  onReviewChanges: (args: { request: Request; accept: boolean }) => void;
  reviewChangesMutation: any;
  onUploadInspectionPhotos?: (request: Request) => void;
  onTrackingUpdate: (request: Request, newStatus: RequestTrackingStatus) => void;
  trackingUpdateMutation: any;
}

const CompactRequestCard: React.FC<{ 
  req: ReceivedItem; 
  priceCalculation: ReturnType<typeof calculateShippingCost> | null;
  onUpdateRequest: (request: any, status: string) => void;
  updateRequestMutation: any;
  onCancelAcceptedRequest: (request: Request) => void;
  onReviewChanges: (args: { request: Request; accept: boolean }) => void;
  reviewChangesMutation: any;
  onUploadInspectionPhotos?: (request: Request) => void;
  onTrackingUpdate: (request: Request, newStatus: RequestTrackingStatus) => void;
  trackingUpdateMutation: any;
  t: any;
}> = ({ 
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

  // --- Regular Trip Request Card (Received by Traveler) ---
  const reqWithProfiles = req as RequestWithProfiles;
  const senderFirstName = reqWithProfiles.sender_profile?.first_name || '';
  const senderLastName = reqWithProfiles.sender_profile?.last_name || '';
  const senderName = `${senderFirstName} ${senderLastName}`.trim() || t('user');
  const fromCountry = reqWithProfiles.trips?.from_country || 'N/A';
  const toCountry = reqWithProfiles.trips?.to_country || 'N/A';
  const tripDate = reqWithProfiles.trips?.trip_date;
  const isRejected = reqWithProfiles.status === 'rejected';
  const currentTrackingStatus = reqWithProfiles.tracking_status;
  const hasPendingChanges = !!reqWithProfiles.proposed_changes;
  const isGeneralOrderMatch = !!reqWithProfiles.general_order_id;
  
  // Traveler actions for accepted requests
  let travelerAction: { status: RequestTrackingStatus, tKey: string, icon: React.ElementType } | null = null;
  let secondaryAction: { tKey: string, onClick: () => void, icon: React.ElementType } | null = null;
  let inspectionRequired = false;

  if (reqWithProfiles.status === 'accepted') {
    const hasSenderPhotos = reqWithProfiles.sender_item_photos && reqWithProfiles.sender_item_photos.length > 0;
    const hasInspectionPhotos = reqWithProfiles.traveler_inspection_photos && reqWithProfiles.traveler_inspection_photos.length > 0;

    if (currentTrackingStatus === 'item_accepted' || currentTrackingStatus === 'sender_photos_uploaded') {
      if (currentTrackingStatus === 'sender_photos_uploaded') {
        // Sender uploaded photos, traveler needs to inspect
        inspectionRequired = true;
        secondaryAction = { 
          tKey: hasInspectionPhotos ? 'updateInspectionPhotos' : 'uploadInspectionPhotos', 
          onClick: () => onUploadInspectionPhotos && onUploadInspectionPhotos(reqWithProfiles), 
          icon: Camera 
        };
      } else {
        // Waiting for sender to upload photos
      }
    } 
    
    if (currentTrackingStatus === 'traveler_inspection_complete') {
      // Inspection complete, ready to travel
      travelerAction = { status: 'traveler_on_the_way', tKey: 'markAsOnTheWay', icon: Plane };
    } else if (currentTrackingStatus === 'traveler_on_the_way') {
      // Ready to deliver
      travelerAction = { status: 'delivered', tKey: 'markAsDelivered', icon: MapPin };
    } else if (currentTrackingStatus === 'delivered') {
      // Waiting for sender to complete
    }
  }

  return (
    <Card className={isGeneralOrderMatch ? "border-2 border-dashed border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-border"}>
      <CardHeader className="p-4 pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(reqWithProfiles.status)}
            <div>
              <CardTitle className="text-base font-semibold">
                {t('requestFrom')} {senderName}
                {isGeneralOrderMatch && <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">({t('generalOrderTitle')})</span>}
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
            <Badge variant={getStatusVariant(reqWithProfiles.status)} className="text-xs">
              {hasPendingChanges ? t('pendingChanges') : t(reqWithProfiles.status)}
            </Badge>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="p-4 pt-0 space-y-3">
          {/* Tracking status */}
          {reqWithProfiles.status !== 'pending' && (
            <div className="pt-2">
              <RequestTracking 
                currentStatus={currentTrackingStatus} 
                isRejected={isRejected} 
              />
            </div>
          )}

          {/* Quick overview */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Weight className="h-4 w-4 text-muted-foreground" />
              <span>{reqWithProfiles.weight_kg} kg</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{reqWithProfiles.destination_city}</span>
            </div>
          </div>

          {/* Price */}
          {priceCalculation && (
            <div className="bg-primary/10 p-2 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t('estimatedCost')}:</span>
                <span className="font-bold text-green-700">${priceCalculation.totalPriceUSD.toFixed(2)}</span>
              </div>
            </div>
          )}
          
          {/* Pending Changes Alert */}
          {hasPendingChanges && (
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-md space-y-2">
              <p className="font-semibold text-sm">{t('proposedChanges')}:</p>
              <p className="text-xs text-muted-foreground">
                {t('packageWeightKg')}: {reqWithProfiles.proposed_changes?.weight_kg} kg
              </p>
              <p className="text-xs text-muted-foreground">
                {t('packageContents')}: {reqWithProfiles.proposed_changes?.description}
              </p>
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={() => onReviewChanges({ request: reqWithProfiles, accept: true })}
                  disabled={reviewChangesMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {t('acceptChanges')}
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => onReviewChanges({ request: reqWithProfiles, accept: false })}
                  disabled={reviewChangesMutation.isPending}
                >
                  {t('rejectChanges')}
                </Button>
              </div>
            </div>
          )}

          {/* Expandable details */}
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
                  <p className="text-muted-foreground">{reqWithProfiles.description}</p>
                </div>
                <div>
                  <p className="font-medium">{t('receiverDetails')}:</p>
                  <p className="text-muted-foreground">{reqWithProfiles.receiver_details}</p>
                </div>
                {reqWithProfiles.sender_item_photos && reqWithProfiles.sender_item_photos.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="font-medium">{t('senderItemPhotos')}:</p>
                    <div className="flex gap-2 overflow-x-auto pt-1">
                      {reqWithProfiles.sender_item_photos.map((url, index) => (
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

          {/* Action buttons */}
          {reqWithProfiles.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                onClick={() => onUpdateRequest(reqWithProfiles, 'accepted')}
                disabled={updateRequestMutation.isPending}
                className="flex-1"
              >
                {t('accept')}
              </Button>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => onUpdateRequest(reqWithProfiles, 'rejected')}
                disabled={updateRequestMutation.isPending}
                className="flex-1"
              >
                {t('reject')}
              </Button>
            </div>
          )}

          {reqWithProfiles.status === 'accepted' && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Link to={`/chat/${reqWithProfiles.id}`}>
                <Button size="sm" variant="outline">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t('viewChat')}
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
                  onClick={() => onTrackingUpdate(reqWithProfiles, travelerAction!.status)}
                  disabled={trackingUpdateMutation.isPending}
                >
                  <travelerAction.icon className="mr-2 h-4 w-4" />
                  {t(travelerAction.tKey)}
                </Button>
              )}
              
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => onCancelAcceptedRequest(reqWithProfiles)}
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

export const ReceivedRequestsTab = ({ 
  user, 
  onUpdateRequest, 
  updateRequestMutation, 
  onCancelAcceptedRequest,
  onReviewChanges,
  reviewChangesMutation,
  onUploadInspectionPhotos,
  onTrackingUpdate,
  trackingUpdateMutation
}: ReceivedRequestsTabProps) => {
  const { t } = useTranslation();

  const { data: receivedItems, isLoading, error } = useQuery({
    queryKey: ['receivedRequests', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch requests where the current user is the trip owner (Traveler)
      // We rely on RLS to filter requests to only those the user is involved in (sender or traveler).
      // We explicitly join the sender profile here.
      const { data: allRequests, error: requestsError } = await supabase
        .from('requests')
        .select(`
          *, 
          trips(
            id, user_id, from_country, to_country, trip_date, free_kg, charge_per_kg, traveler_location, notes, created_at
          ),
          sender_profile: profiles!requests_sender_id_fkey(
            id, first_name, last_name, phone
          )
        `)
        .order('created_at', { ascending: false });

      if (requestsError) throw new Error(requestsError.message);

      // Filter client-side to ensure we only show requests where the current user is the trip owner (received requests)
      const tripRequests = allRequests
        .filter(req => req.trips?.user_id === user.id)
        .map(req => ({
          ...req,
          type: 'trip_request' as const
        })) as RequestWithProfiles[];
      
      // Sort by creation date descending
      tripRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return tripRequests;
    },
    enabled: !!user,
  });

  if (isLoading) return <p className="p-4 text-center">{t('loading')}</p>;

  if (error) return (
    <div className="p-4">
      <p className="text-red-500 text-center">Error loading received requests: {error.message}</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {receivedItems && receivedItems.length > 0 ? (
        receivedItems.map(req => {
          // Calculate price only for trip requests
          let priceCalculation = null;
          const tripReq = req as RequestWithProfiles;
          priceCalculation = calculateShippingCost(
            tripReq.trips?.from_country || '',
            tripReq.trips?.to_country || '',
            tripReq.weight_kg
          );

          return (
            <CompactRequestCard
              key={req.id}
              req={req}
              priceCalculation={priceCalculation}
              onUpdateRequest={onUpdateRequest}
              updateRequestMutation={updateRequestMutation}
              onCancelAcceptedRequest={onCancelAcceptedRequest}
              onReviewChanges={onReviewChanges}
              reviewChangesMutation={reviewChangesMutation}
              onUploadInspectionPhotos={onUploadInspectionPhotos}
              onTrackingUpdate={onTrackingUpdate}
              trackingUpdateMutation={trackingUpdateMutation}
              t={t}
            />
          );
        })
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold">{t('noReceivedRequests')}</p>
            <p className="text-muted-foreground mt-2">{t('noReceivedRequestsDescription')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};