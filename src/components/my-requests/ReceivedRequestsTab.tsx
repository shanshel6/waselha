"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Package, MapPin, User, Weight, MessageSquare, Phone, CalendarDays, BadgeCheck, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { calculateShippingCost } from '@/lib/pricing';
import CountryFlag from '@/components/CountryFlag'; // Import CountryFlag

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
}

interface RequestWithProfiles extends Request {
  sender_profile: Profile | null;
  traveler_profile: Profile | null;
}

interface ReceivedRequestsTabProps {
  user: any;
  onUpdateRequest: (request: any, status: string) => void;
  updateRequestMutation: any;
}

export const ReceivedRequestsTab = ({ user, onUpdateRequest, updateRequestMutation }: ReceivedRequestsTabProps) => {
  const { t } = useTranslation();

  const { data: receivedRequests, isLoading, error } = useQuery({
    queryKey: ['receivedRequests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select(`
          *,
          trips(*)
        `)
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
      
      const requestsWithProfiles: RequestWithProfiles[] = requests.map(request => ({
        ...request,
        sender_profile: profileMap[request.sender_id] || null,
        traveler_profile: null
      }));
      
      return requestsWithProfiles;
    },
    enabled: !!user,
  });

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

  const calculatePriceDisplay = (request: RequestWithProfiles) => {
    const from_country = request.trips?.from_country;
    const to_country = request.trips?.to_country;
    const weight_kg = request.weight_kg;

    if (!from_country || !to_country || from_country === to_country || weight_kg <= 0) {
        return null;
    }

    const result = calculateShippingCost(from_country, to_country, weight_kg);

    if (result.error) return null;

    const USD_TO_IQD_RATE = 1400;
    const totalPriceIQD = result.totalPriceUSD * USD_TO_IQD_RATE;

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
      </div>
    );
  };

  if (isLoading) return <p>{t('loading')}</p>;
  
  if (error) {
    return (
      <div>
        <p className="text-red-500">
          Error loading received requests: {error.message}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          User ID: {user?.id}
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t('receivedRequests')}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {receivedRequests && receivedRequests.length > 0 ? receivedRequests.map(req => {
          const priceCalculation = calculatePriceDisplay(req);
          const senderName = req.sender_profile?.first_name || 'User';

          return (
            <Card key={req.id} className={getStatusCardClass(req.status)}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {getStatusIcon(req.status)}
                    {t('requestFrom')} {senderName}
                  </span>
                  <Badge variant={getStatusVariant(req.status)}>{t(req.status)}</Badge>
                </CardTitle>
                {(req.status === 'pending' || req.status === 'rejected') && (
                  <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                    <Plane className="h-4 w-4" />
                    <CountryFlag country={req.trips?.from_country || 'N/A'} showName /> → <CountryFlag country={req.trips?.to_country || 'N/A'} showName />
                    {req.trips?.trip_date && ` on ${format(new Date(req.trips.trip_date), 'PPP')}`}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {(req.status === 'pending' || req.status === 'rejected') && (
                  <>
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-2"><Package className="h-4 w-4" />{t('packageContents')}:</p>
                      <p className="text-sm text-muted-foreground pl-6">{req.description}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <p className="flex items-center gap-2"><Weight className="h-4 w-4" />
                        <span className="font-semibold">{t('packageWeightKg')}:</span> {req.weight_kg} kg</p>
                      <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />
                        <span className="font-semibold">{t('destinationCity')}:</span> {req.destination_city}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-2"><User className="h-4 w-4" />{t('receiverDetails')}:</p>
                      <p className="text-sm text-muted-foreground pl-6">{req.receiver_details}</p>
                    </div>
                    
                    {renderPriceBlock(priceCalculation)}
                  </>
                )}
                
                {renderAcceptedDetails(req)}
                
                <div className="flex gap-2 pt-2">
                  {req.status === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => onUpdateRequest(req, 'accepted')} disabled={updateRequestMutation.isPending}>{t('accept')}</Button>
                      <Button size="sm" variant="destructive" onClick={() => onUpdateRequest(req, 'rejected')} disabled={updateRequestMutation.isPending}>{t('reject')}</Button>
                    </>
                  )}
                  {req.status === 'accepted' && (
                    <Link to={`/chat/${req.id}`}>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {t('viewChat')}
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        }) : !isLoading && !error && (
          <div>
            <p>{t('noReceivedRequests')}</p>
            {user && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Debug Info:
                </p>
                <p className="text-sm">User ID: {user.id}</p>
                <p className="text-sm">Session: {user ? 'Active' : 'None'}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};