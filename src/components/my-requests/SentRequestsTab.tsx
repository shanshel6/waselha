"use client";
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Package, Trash2, Weight, MessageSquare, BadgeCheck, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { calculateShippingCost } from '@/lib/pricing';

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

interface GeneralOrder {
  id: string;
  user_id: string;
  traveler_id: string | null;
  from_country: string;
  to_country: string;
  description: string;
  weight_kg: number;
  is_valuable: boolean;
  has_insurance: boolean;
  status: 'new' | 'claimed' | 'in_transit' | 'delivered';
  created_at: string;
}

interface SentRequestsTabProps {
  user: any;
  onCancelRequest: (request: any) => void;
  deleteRequestMutation: any;
}

export const SentRequestsTab = ({ user, onCancelRequest, deleteRequestMutation }: SentRequestsTabProps) => {
  const { t } = useTranslation();

  const { data: tripRequests, isLoading: isLoadingTripRequests, error: tripRequestsError } = useQuery({
    queryKey: ['sentTripRequests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select(`
          *,
          trips(*)
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });
        
      if (requestsError) throw new Error(requestsError.message);
      
      const travelerIds = [...new Set(requests.map(r => r.trips.user_id).filter(id => id))];
      
      const { data: travelerProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', travelerIds);
      
      if (profilesError) throw new Error(profilesError.message);
      
      const profileMap = travelerProfiles.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, Profile>);
      
      const requestsWithProfiles: RequestWithProfiles[] = requests.map(request => ({
        ...request,
        sender_profile: null,
        traveler_profile: profileMap[request.trips.user_id] || null
      }));
      
      return requestsWithProfiles;
    },
    enabled: !!user,
  });

  const { data: generalOrders, isLoading: isLoadingGeneralOrders, error: generalOrdersError } = useQuery({
    queryKey: ['generalOrders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('general_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const allSentItems = useMemo(() => {
    if (isLoadingTripRequests || isLoadingGeneralOrders) return [];
    
    const combined = [
        ...(tripRequests || []).map(req => ({ ...req, type: 'trip_request' })),
        ...(generalOrders || []).map(order => ({ ...order, type: 'general_order' }))
    ];
    
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [tripRequests, generalOrders, isLoadingTripRequests, isLoadingGeneralOrders]);

  const isLoadingSent = isLoadingTripRequests || isLoadingGeneralOrders;
  const sentRequestsError = tripRequestsError || generalOrdersError;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'new':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const calculatePriceDisplay = (item: any) => {
    const isGeneralOrder = item.type === 'general_order';
    const from_country = isGeneralOrder ? item.from_country : item.trips?.from_country;
    const to_country = isGeneralOrder ? item.to_country : item.trips?.to_country;
    const weight_kg = item.weight_kg;
    const has_insurance = isGeneralOrder ? item.has_insurance : false;

    if (!from_country || !to_country || from_country === to_country || weight_kg <= 0) {
        return null;
    }

    const result = calculateShippingCost(from_country, to_country, weight_kg);

    if (result.error) return null;

    let totalPriceUSD = result.totalPriceUSD;
    
    if (has_insurance) {
      totalPriceUSD *= 2; 
    }
    
    const USD_TO_IQD_RATE = 1400;
    const totalPriceIQD = totalPriceUSD * USD_TO_IQD_RATE; 

    return {
      totalPriceUSD,
      totalPriceIQD,
      pricePerKgUSD: result.pricePerKgUSD,
      hasInsurance: has_insurance
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
          {priceCalculation.hasInsurance && (
            <Badge variant="default" className="bg-blue-600 hover:bg-blue-600/90">
              {t('insuranceOption')}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const renderAcceptedDetails = (req: RequestWithProfiles) => {
    if (req.status !== 'accepted') return null;
    
    const otherParty = req.traveler_profile;
    const trip = req.trips;
    
    if (!otherParty || !trip) return null;
    
    const otherPartyName = `${otherParty.first_name || ''} ${otherParty.last_name || ''}`.trim() || t('user');
    
    return (
      <div className="mt-4 p-4 border rounded-lg bg-green-50 dark:bg-green-900/30 space-y-3">
        <h4 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
          <BadgeCheck className="h-5 w-5" />
          {t('requestAcceptedTitle')}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <p className="flex items-center gap-2">
            <span className="font-semibold">{t('traveler')}:</span>
            {otherPartyName}
          </p>
        </div>
        <div className="border-t pt-3 space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            <span className="font-semibold">{t('tripRoute')}:</span>
            {trip.from_country} → {trip.to_country}
          </p>
        </div>
      </div>
    );
  };

  const renderSentItem = (item: any) => {
    const priceCalculation = calculatePriceDisplay(item);

    if (item.type === 'trip_request') {
      const req = item as RequestWithProfiles;
      const travelerName = req.traveler_profile?.first_name || t('traveler');
      
      return (
        <Card key={req.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('requestTo')} {travelerName}</span>
              <Badge variant={getStatusVariant(req.status)}>{t(req.status)}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
              <Plane className="h-4 w-4" />
              {req.trips?.from_country || 'N/A'} → {req.trips?.to_country || 'N/A'} 
              {req.trips?.trip_date && ` on ${format(new Date(req.trips.trip_date), 'PPP')}`}
            </div>
          </CardHeader>
          <CardContent>
            <p><span className="font-semibold">{t('packageWeightKg')}:</span> {req.weight_kg} kg</p>
            
            {renderPriceBlock(priceCalculation)}
            
            {renderAcceptedDetails(req)}
            <div className="flex gap-2 mt-4">
              {req.status === 'pending' && (
                <Button variant="destructive" size="sm" onClick={() => onCancelRequest(req)} disabled={deleteRequestMutation.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('cancelRequest')}
                </Button>
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
    } else if (item.type === 'general_order') {
      const order = item as GeneralOrder;
      const statusKey = order.status === 'new' ? 'statusNewOrder' : order.status;
      
      return (
        <Card key={order.id} className="border-2 border-dashed border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span>{t('placeOrder')}</span>
              <Badge variant={getStatusVariant(order.status)} className="bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border-yellow-500">
                {t(statusKey)}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
              <Plane className="h-4 w-4" />
              {order.from_country} → {order.to_country} 
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-sm flex items-center gap-2"><Package className="h-4 w-4" />{t('packageContents')}:</p>
              <p className="text-sm text-muted-foreground pl-6">{order.description}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <p className="flex items-center gap-2"><Weight className="h-4 w-4" />
                <span className="font-semibold">{t('packageWeightKg')}:</span> {order.weight_kg} kg</p>
              {order.has_insurance && (
                <p className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <BadgeCheck className="h-4 w-4" />
                  <span className="font-semibold">{t('insuranceOption')}</span>
                </p>
              )}
            </div>
            
            {renderPriceBlock(priceCalculation)}
            
            {order.status === 'new' && (
              <div className="flex gap-2 mt-4">
                <Button variant="destructive" size="sm" onClick={() => onCancelRequest(order)} disabled={deleteRequestMutation.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('cancelRequest')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  if (isLoadingSent) return <p>{t('loading')}</p>;
  
  if (sentRequestsError) {
    return (
      <p className="text-red-500">
        Error loading sent requests: {sentRequestsError.message}
      </p>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t('sentRequests')}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {allSentItems.length > 0 ? allSentItems.map(renderSentItem) : !isLoadingSent && !sentRequestsError && <p>{t('noSentRequests')}</p>}
      </CardContent>
    </Card>
  );
};