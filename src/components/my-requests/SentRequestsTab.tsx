"use client";
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Package, Trash2, Weight, MessageSquare, BadgeCheck, DollarSign, CalendarDays, MapPin, User, Phone, CheckCircle, XCircle, Clock, Send, Pencil } from 'lucide-react';
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
  onCancelAcceptedRequest: (request: Request) => void;
  onEditRequest: (request: Request) => void;
}

export const SentRequestsTab = ({ user, onCancelRequest, deleteRequestMutation, onCancelAcceptedRequest, onEditRequest }: SentRequestsTabProps) => {
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
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      case 'new': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': case 'claimed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusCardClass = (status: string, isGeneralOrder = false) => {
    if (isGeneralOrder) return 'border-2 border-dashed border-primary/50 bg-primary/5';
    switch (status) {
      case 'accepted': return 'border-green-500/30 bg-green-50 dark:bg-green-900/20';
      case 'rejected': return 'border-red-500/30 bg-red-50 dark:bg-red-900/20';
      default: return 'border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/20';
    }
  };

  const calculatePriceDisplay = (item: any) => {
    const isGeneralOrder = item.type === 'general_order';
    const from_country = isGeneralOrder ? item.from_country : item.trips?.from_country;
    const to_country = isGeneralOrder ? item.to_country : item.trips?.to_country;
    const weight_kg = item.weight_kg;
    const has_insurance = isGeneralOrder ? item.has_insurance : false;
    if (!from_country || !to_country || from_country === to_country || weight_kg <= 0) return null;
    const result = calculateShippingCost(from_country, to_country, weight_kg);
    if (result.error) return null;
    let totalPriceUSD = result.totalPriceUSD;
    if (has_insurance) totalPriceUSD *= 2;
    const totalPriceIQD = totalPriceUSD * 1400;
    return { totalPriceUSD, totalPriceIQD, pricePerKgUSD: result.pricePerKgUSD, hasInsurance: has_insurance };
  };

  const renderPriceBlock = (priceCalculation: ReturnType<typeof calculatePriceDisplay>) => {
    if (!priceCalculation) return null;
    return (
      <div className="pt-3 border-t mt-3">
        <p className="font-semibold text-sm flex items-center gap-2 text-green-700 dark:text-green-300"><DollarSign className="h-4 w-4" />{t('estimatedCost')}:</p>
        <div className="flex justify-between items-center pl-6">
          <div>
            <p className="text-lg font-bold text-green-800 dark:text-green-200">${priceCalculation.totalPriceUSD.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">{priceCalculation.totalPriceIQD.toLocaleString('en-US')} IQD</p>
          </div>
          {priceCalculation.hasInsurance && <Badge variant="default" className="bg-blue-600 hover:bg-blue-600/90">{t('insuranceOption')}</Badge>}
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
    const otherPartyPhone = otherParty.phone || t('noPhoneProvided');
    const cancellationRequested = req.cancellation_requested_by;
    const isCurrentUserRequester = cancellationRequested === user?.id;
    const isOtherUserRequester = cancellationRequested && cancellationRequested !== user?.id;
    return (
      <div className="mt-4 p-4 border rounded-lg bg-green-100 dark:bg-green-900/30 space-y-3">
        <h4 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2"><BadgeCheck className="h-5 w-5" />{t('requestAcceptedTitle')}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <p className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /><span className="font-semibold">{t('traveler')}:</span>{otherPartyName}</p>
          <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /><span className="font-semibold">{t('phone')}:</span>{otherPartyPhone}</p>
        </div>
        <div className="border-t pt-3 space-y-2 text-sm">
          <p className="flex items-center gap-2"><Plane className="h-4 w-4 text-primary" /><span className="font-semibold">{t('tripRoute')}:</span><CountryFlag country={trip.from_country} showName /> → <CountryFlag country={trip.to_country} showName /></p>
          <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><span className="font-semibold">{t('tripDate')}:</span>{trip.trip_date ? format(new Date(trip.trip_date), 'PPP') : t('dateNotSet')}</p>
        </div>
        {cancellationRequested && <div className={`p-3 rounded-md text-sm ${isCurrentUserRequester ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>{isCurrentUserRequester ? t('waitingForOtherPartyCancellation') : t('otherPartyRequestedCancellation')}</div>}
        <div className="flex gap-2 pt-2">
          <Link to={`/chat/${req.id}`}><Button size="sm" variant="outline"><MessageSquare className="mr-2 h-4 w-4" />{t('viewChat')}</Button></Link>
          <Button size="sm" variant="destructive" onClick={() => onCancelAcceptedRequest(req)} disabled={isCurrentUserRequester}><Trash2 className="mr-2 h-4 w-4" />{isOtherUserRequester ? t('confirmCancellation') : t('cancelRequest')}</Button>
        </div>
      </div>
    );
  };

  const renderSentItem = (item: any) => {
    const priceCalculation = calculatePriceDisplay(item);
    if (item.type === 'trip_request') {
      const req = item as RequestWithProfiles;
      const travelerName = req.traveler_profile?.first_name || t('traveler');
      const hasPendingChanges = !!req.proposed_changes;
      return (
        <Card key={req.id} className={getStatusCardClass(req.status)}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">{getStatusIcon(req.status)}{t('requestTo')} {travelerName}</span>
              <Badge variant={getStatusVariant(req.status)}>{hasPendingChanges ? t('pendingChanges') : t(req.status)}</Badge>
            </CardTitle>
            {(req.status === 'pending' || req.status === 'rejected') && <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground"><Plane className="h-4 w-4" /><CountryFlag country={req.trips?.from_country || 'N/A'} showName /> → <CountryFlag country={req.trips?.to_country || 'N/A'} showName />{req.trips?.trip_date && ` on ${format(new Date(req.trips.trip_date), 'PPP')}`}</div>}
          </CardHeader>
          <CardContent>
            {(req.status === 'pending' || req.status === 'rejected') && (
              <div className="space-y-3">
                <div><p className="font-semibold text-sm flex items-center gap-2"><Package className="h-4 w-4" />{t('packageContents')}:</p><p className="text-sm text-muted-foreground pl-6">{req.description}</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <p className="flex items-center gap-2"><Weight className="h-4 w-4" /><span className="font-semibold">{t('packageWeightKg')}:</span> {req.weight_kg} kg</p>
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span className="font-semibold">{t('destinationCity')}:</span> {req.destination_city}</p>
                </div>
                <div><p className="font-semibold text-sm flex items-center gap-2"><User className="h-4 w-4" />{t('receiverDetails')}:</p><p className="text-sm text-muted-foreground pl-6">{req.receiver_details}</p></div>
                {renderPriceBlock(priceCalculation)}
              </div>
            )}
            {renderAcceptedDetails(req)}
            {req.status === 'pending' && (
              <div className="flex gap-2 mt-4">
                <Button variant="destructive" size="sm" onClick={() => onCancelRequest(req)} disabled={deleteRequestMutation.isPending}><Trash2 className="mr-2 h-4 w-4" />{t('cancelRequest')}</Button>
                <Button variant="secondary" size="sm" onClick={() => onEditRequest(req)} disabled={hasPendingChanges}><Pencil className="mr-2 h-4 w-4" />{t('editRequest')}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      );
    } else if (item.type === 'general_order') {
      const order = item as GeneralOrder;
      const statusKey = order.status === 'new' ? 'statusNewOrder' : order.status;
      return (
        <Card key={order.id} className={getStatusCardClass(order.status, true)}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg"><span className="flex items-center gap-2">{getStatusIcon(order.status)}{t('placeOrder')}</span><Badge variant={getStatusVariant(order.status)} className="bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border-yellow-500">{t(statusKey)}</Badge></CardTitle>
            <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground"><Plane className="h-4 w-4" /><CountryFlag country={order.from_country} showName /> → <CountryFlag country={order.to_country} showName /></div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><p className="font-semibold text-sm flex items-center gap-2"><Package className="h-4 w-4" />{t('packageContents')}:</p><p className="text-sm text-muted-foreground pl-6">{order.description}</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <p className="flex items-center gap-2"><Weight className="h-4 w-4" /><span className="font-semibold">{t('packageWeightKg')}:</span> {order.weight_kg} kg</p>
              {order.has_insurance && <p className="flex items-center gap-2 text-blue-600 dark:text-blue-400"><BadgeCheck className="h-4 w-4" /><span className="font-semibold">{t('insuranceOption')}</span></p>}
            </div>
            {renderPriceBlock(priceCalculation)}
            {order.status === 'new' && <div className="flex gap-2 mt-4"><Button variant="destructive" size="sm" onClick={() => onCancelRequest(order)} disabled={deleteRequestMutation.isPending}><Trash2 className="mr-2 h-4 w-4" />{t('cancelRequest')}</Button></div>}
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  if (isLoadingSent) return <p>{t('loading')}</p>;
  if (sentRequestsError) return <p className="text-red-500">Error loading sent requests: {sentRequestsError.message}</p>;
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-6 w-6 text-primary" />{t('sentRequests')}</CardTitle></CardHeader>
      <CardContent className="space-y-4">{allSentItems.length > 0 ? allSentItems.map(renderSentItem) : !isLoadingSent && !sentRequestsError && <p>{t('noSentRequests')}</p>}</CardContent>
    </Card>
  );
};