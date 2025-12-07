"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Package, MapPin, User, Weight, MessageSquare, Phone, CalendarDays, BadgeCheck, DollarSign, CheckCircle, XCircle, Clock, Trash2, Inbox, ArrowRight, Camera, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { calculateShippingCost } from '@/lib/pricing';
import CountryFlag from '@/components/CountryFlag';

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
  trips: Trip;
  cancellation_requested_by: string | null;
  proposed_changes: { weight_kg: number; description: string } | null;
  traveler_inspection_photos?: string[] | null;
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
}

export const ReceivedRequestsTab = ({ 
  user, 
  onUpdateRequest, 
  updateRequestMutation, 
  onCancelAcceptedRequest,
  onReviewChanges,
  reviewChangesMutation,
  onUploadInspectionPhotos
}: ReceivedRequestsTabProps) => {
  const { t } = useTranslation();

  const { data: receivedRequests, isLoading, error } = useQuery({
    queryKey: ['receivedRequests', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select(`*, trips(*)`)
        .eq('trips.user_id', user.id)
        .order('created_at', { ascending: false });

      if (requestsError) throw new Error(requestsError.message);

      const senderIds = [...new Set(requests.map(r => r.sender_id))];
      const { data: senderProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', senderIds);

      if (profilesError) throw new Error(profilesError.message);

      const profileMap = senderProfiles.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, Profile>);

      return requests.map(request => ({
        ...request,
        sender_profile: profileMap[request.sender_id] || null,
        traveler_profile: null
      })) as RequestWithProfiles[];
    },
    enabled: !!user,
  });

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

  const getStatusCardClass = (status: string) => {
    switch (status) {
      case 'accepted': return 'border-green-500/30 bg-green-50 dark:bg-green-900/20';
      case 'rejected': return 'border-red-500/30 bg-red-50 dark:bg-red-900/20';
      default: return 'border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/20';
    }
  };

  const calculatePriceDisplay = (request: RequestWithProfiles, useProposed = false) => {
    const from_country = request.trips?.from_country;
    const to_country = request.trips?.to_country;
    const weight_kg = useProposed ? request.proposed_changes?.weight_kg : request.weight_kg;

    if (!from_country || !to_country || from_country === to_country || weight_kg <= 0) return null;

    const result = calculateShippingCost(from_country, to_country, weight_kg);
    if (result.error) return null;

    const totalPriceIQD = result.totalPriceUSD * 1400;
    return {
      totalPriceUSD: result.totalPriceUSD,
      totalPriceIQD,
      pricePerKgUSD: result.pricePerKgUSD
    };
  };

  const renderPriceBlock = (priceCalculation: ReturnType<typeof calculatePriceDisplay>) => {
    if (!priceCalculation) return null;

    return (
      <div className="pt-3 border-t mt-3">
        <p className="font-semibold text-sm flex items-center gap-2 text-green-700 dark:text-green-300">
          <DollarSign className="h-4 w-4" />
          {t('estimatedCost')}:
        </p>
        <div className="flex justify-between items-center pl-6">
          <div>
            <p className="text-lg font-bold text-green-800 dark:text-green-200">
              ${priceCalculation.totalPriceUSD.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              {priceCalculation.totalPriceIQD.toLocaleString('en-US')} IQD
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderAcceptedDetails = (req: RequestWithProfiles) => {
    if (req.status !== 'accepted') return null;

    const otherParty = req.sender_profile;
    const trip = req.trips;

    if (!otherParty || !trip) return null;

    const otherPartyName = `${otherParty.first_name || ''} ${otherParty.last_name || ''}`.trim() || t('user');
    const otherPartyPhone = otherParty.phone || t('noPhoneProvided');

    const cancellationRequested = req.cancellation_requested_by;
    const isCurrentUserRequester = cancellationRequested === user?.id;
    const isOtherUserRequester = cancellationRequested && cancellationRequested !== user?.id;

    return (
      <div className="mt-4 p-4 border rounded-lg bg-green-100 dark:bg-green-900/30 space-y-3">
        <h4 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
          <BadgeCheck className="h-5 w-5" />
          {t('requestAcceptedTitle')}
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <p className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span className="font-semibold">{t('sender')}:</span>
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
            <CountryFlag country={trip.from_country} showName /> → <CountryFlag country={trip.to_country} showName />
          </p>
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="font-semibold">{t('tripDate')}:</span>
            {trip.trip_date ? format(new Date(trip.trip_date), 'PPP') : t('dateNotSet')}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-semibold">{t('handoverLocation')}:</span>
            {req.handover_location || t('toBeDeterminedInChat')}
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
        
        <div className="flex gap-2 pt-2">
          <Link to={`/chat/${req.id}`}>
            <Button size="sm" variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" />
              {t('viewChat')}
            </Button>
          </Link>
          
          {onUploadInspectionPhotos && (
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => onUploadInspectionPhotos(req)}
            >
              <Camera className="mr-2 h-4 w-4" />
              {req.traveler_inspection_photos && req.traveler_inspection_photos.length > 0
                ? t('updateInspectionPhotos')
                : t('uploadInspectionPhotos')}
            </Button>
          )}
          
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={() => onCancelAcceptedRequest(req)}
            disabled={isCurrentUserRequester}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isOtherUserRequester ? t('confirmCancellation') : t('cancelRequest')}
          </Button>
        </div>
      </div>
    );
  };

  const renderProposedChanges = (req: RequestWithProfiles) => {
    if (!req.proposed_changes) return null;

    const originalPrice = calculatePriceDisplay(req);
    const newPrice = calculatePriceDisplay(req, true);

    return (
      <div className="mt-4 p-4 border-2 border-blue-500/50 rounded-lg bg-blue-50 dark:bg-blue-900/20 space-y-3">
        <h4 className="font-bold text-blue-800 dark:text-blue-300">{t('proposedChanges')}</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Weight className="h-4 w-4" />
            <span className="font-semibold">{t('packageWeightKg')}:</span>
            <span className="line-through text-muted-foreground">{req.weight_kg} kg</span>
            <ArrowRight className="h-4 w-4" />
            <span className="font-bold">{req.proposed_changes.weight_kg} kg</span>
          </div>
          
          <div>
            <p className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('packageContents')}:
            </p>
            <p className="line-through text-muted-foreground pl-6">{req.description}</p>
            <p className="font-bold pl-6">{req.proposed_changes.description}</p>
          </div>
          
          {newPrice && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="font-semibold">{t('estimatedCost')}:</span>
              {originalPrice && (
                <span className="line-through text-muted-foreground">
                  ${originalPrice.totalPriceUSD.toFixed(2)}
                </span>
              )}
              <ArrowRight className="h-4 w-4" />
              <span className="font-bold">${newPrice.totalPriceUSD.toFixed(2)}</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            onClick={() => onReviewChanges({ request: req, accept: true })}
            disabled={reviewChangesMutation.isPending}
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
    );
  };

  if (isLoading) return <p>{t('loading')}</p>;

  if (error) return (
    <div>
      <p className="text-red-500">Error loading received requests: {error.message}</p>
      <p className="text-sm text-muted-foreground mt-2">User ID: {user?.id}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-6 w-6 text-primary" />
          {t('receivedRequests')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {receivedRequests && receivedRequests.length > 0 ? (
          receivedRequests.map(req => {
            const priceCalculation = calculatePriceDisplay(req);
            
            // FIX: Calculate full sender name
            const senderFirstName = req.sender_profile?.first_name || '';
            const senderLastName = req.sender_profile?.last_name || '';
            const senderName = `${senderFirstName} ${senderLastName}`.trim() || t('user');
            
            const hasPendingChanges = !!req.proposed_changes;
            
            // Trip details for display
            const fromCountry = req.trips?.from_country || 'N/A';
            const toCountry = req.trips?.to_country || 'N/A';
            const tripDate = req.trips?.trip_date;

            return (
              <Card key={req.id} className={getStatusCardClass(req.status)}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {getStatusIcon(req.status)}
                      {t('requestFrom')} {senderName}
                    </span>
                    <Badge variant={getStatusVariant(req.status)}>
                      {hasPendingChanges ? t('reviewChanges') : t(req.status)}
                    </Badge>
                  </CardTitle>
                  
                  {(req.status === 'pending' || req.status === 'rejected') && (
                    <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                      <Plane className="h-4 w-4" />
                      <CountryFlag country={fromCountry} showName />
                      <span className="text-base">→</span>
                      <CountryFlag country={toCountry} showName />
                      {tripDate && ` on ${format(new Date(tripDate), 'PPP')}`}
                    </div>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {hasPendingChanges ? renderProposedChanges(req) : (
                    <>
                      {(req.status === 'pending' || req.status === 'rejected') && (
                        <>
                          <div>
                            <p className="font-semibold text-sm flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              {t('packageContents')}:
                            </p>
                            <p className="text-sm text-muted-foreground pl-6">
                              {req.description}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <p className="flex items-center gap-2">
                              <Weight className="h-4 w-4" />
                              <span className="font-semibold">{t('packageWeightKg')}:</span> {req.weight_kg} kg
                            </p>
                            <p className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span className="font-semibold">{t('destinationCity')}:</span> {req.destination_city}
                            </p>
                          </div>
                          
                          <div>
                            <p className="font-semibold text-sm flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {t('receiverDetails')}:
                            </p>
                            <p className="text-sm text-muted-foreground pl-6">
                              {req.receiver_details}
                            </p>
                          </div>
                          
                          {renderPriceBlock(priceCalculation)}
                        </>
                      )}
                      
                      {renderAcceptedDetails(req)}
                      
                      {req.status === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            onClick={() => onUpdateRequest(req, 'accepted')}
                            disabled={updateRequestMutation.isPending}
                          >
                            {t('accept')}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => onUpdateRequest(req, 'rejected')}
                            disabled={updateRequestMutation.isPending}
                          >
                            {t('reject')}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : !isLoading && !error ? (
          <div>
            <p>{t('noReceivedRequests')}</p>
            {user && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                <p className="text-sm text-muted-foreground font-semibold">Debug Info:</p>
                <p className="text-sm">User ID: {user.id}</p>
                <p className="text-sm">Session: {user ? 'Active' : 'None'}</p>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};