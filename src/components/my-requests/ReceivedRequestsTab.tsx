"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Plane, Package, MapPin, User, Weight, MessageSquare, Phone, CalendarDays, BadgeCheck, DollarSign, CheckCircle, XCircle, Clock, Trash2, Inbox, ArrowRight, Shield, Camera } from 'lucide-react';
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
}

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
  req: RequestWithProfiles; 
  priceCalculation: ReturnType<typeof calculateShippingCost>;
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

  const senderFirstName = req.sender_profile?.first_name || '';
  const senderLastName = req.sender_profile?.last_name || '';
  const senderName = `${senderFirstName} ${senderLastName}`.trim() || t('user');
  const fromCountry = req.trips?.from_country || 'N/A';
  const toCountry = req.trips?.to_country || 'N/A';
  const tripDate = req.trips?.trip_date;
  const isRejected = req.status === 'rejected';
  const currentTrackingStatus = req.tracking_status;

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

  return (
    <Card className="border-border">
      <CardHeader className="p-4 pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(req.status)}
            <div>
              <CardTitle className="text-base font-semibold">
                {t('requestFrom')} {senderName}
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
              {t(req.status)}
            </Badge>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="p-4 pt-0 space-y-3">
          {/* Tracking status */}
          {req.status !== 'pending' && (
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
              <span>{req.weight_kg} kg</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{req.destination_city}</span>
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
                  <p className="text-muted-foreground">{req.description}</p>
                </div>
                <div>
                  <p className="font-medium">{t('receiverDetails')}:</p>
                  <p className="text-muted-foreground">{req.receiver_details}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
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
            <div className="flex gap-2 pt-2">
              <Link to={`/chat/${req.id}`} className="flex-1">
                <Button size="sm" variant="outline" className="w-full">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t('viewChat')}
                </Button>
              </Link>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => onCancelAcceptedRequest(req)}
                className="flex-1"
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

  const { data: receivedRequests, isLoading, error } = useQuery({
    queryKey: ['receivedRequests', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: allRequests, error: requestsError } = await supabase
        .from('requests')
        .select(`
          *, 
          trips(
            id, user_id, from_country, to_country, trip_date, free_kg, charge_per_kg, traveler_location, notes, created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (requestsError) throw new Error(requestsError.message);

      const receivedRequests = allRequests.filter(req => req.trips?.user_id === user.id);

      const senderIds = [...new Set(receivedRequests.map(r => r.sender_id))];
      const { data: senderProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', senderIds);

      if (profilesError) throw new Error(profilesError.message);

      const profileMap = senderProfiles.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, Profile>);

      return receivedRequests.map(request => ({
        ...request,
        sender_profile: profileMap[request.sender_id] || null,
        traveler_profile: null
      })) as RequestWithProfiles[];
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
      {receivedRequests && receivedRequests.length > 0 ? (
        receivedRequests.map(req => {
          const priceCalculation = calculateShippingCost(
            req.trips?.from_country || '',
            req.trips?.to_country || '',
            req.weight_kg
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