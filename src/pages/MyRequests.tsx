"use client";
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { format } from 'date-fns';
import { Plane, Package, Trash2, MapPin, User, Weight, MessageSquare, Phone, CalendarDays, BadgeCheck, DollarSign } from 'lix-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Link } from 'react-router-dom';
import { calculateShippingCost } from '@/lib/pricing'; // Import pricing utility

// Define types for our data
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

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
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

const MyRequests = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [requestToCancel, setRequestToCancel] = useState<any | null>(null);

  // --- 1. Fetch Received Requests (Requests for user's trips) ---
  const { data: receivedRequests, isLoading: isLoadingReceived, error: receivedRequestsError } = useQuery({
    queryKey: ['receivedRequests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // First, get the requests for trips owned by the current user
      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select(`
          *,
          trips(*)
        `)
        .eq('trips.user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (requestsError) throw new Error(requestsError.message);
      
      // Extract unique sender IDs
      const senderIds = [...new Set(requests.map(r => r.sender_id))];
      
      // Fetch profiles for all senders in a single query
      const { data: senderProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', senderIds);
      
      if (profilesError) throw new Error(profilesError.message);
      
      // Create a map for quick lookup
      const profileMap = senderProfiles.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, Profile>);
      
      // Attach sender profiles to requests
      const requestsWithProfiles: RequestWithProfiles[] = requests.map(request => ({
        ...request,
        sender_profile: profileMap[request.sender_id] || null,
        traveler_profile: null // Not needed for received requests
      }));
      
      return requestsWithProfiles;
    },
    enabled: !!user,
  });

  // --- 2. Fetch Sent Trip-Specific Requests ---
  const { data: tripRequests, isLoading: isLoadingTripRequests, error: tripRequestsError } = useQuery({
    queryKey: ['sentTripRequests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get requests sent by the current user
      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select(`
          *,
          trips(*)
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });
        
      if (requestsError) throw new Error(requestsError.message);
      
      // Extract unique traveler IDs from trips
      const travelerIds = [...new Set(requests.map(r => r.trips.user_id).filter(id => id))];
      
      // Fetch profiles for all travelers in a single query
      const { data: travelerProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', travelerIds);
      
      if (profilesError) throw new Error(profilesError.message);
      
      // Create a map for quick lookup
      const profileMap = travelerProfiles.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, Profile>);
      
      // Attach traveler profiles to requests
      const requestsWithProfiles: RequestWithProfiles[] = requests.map(request => ({
        ...request,
        sender_profile: null, // Not needed for sent requests
        traveler_profile: profileMap[request.trips.user_id] || null
      }));
      
      return requestsWithProfiles;
    },
    enabled: !!user,
  });

  // --- 3. Fetch Sent General Orders ---
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

  // --- 4. Combine and Sort All Sent Items ---
  const allSentItems = useMemo(() => {
    if (isLoadingTripRequests || isLoadingGeneralOrders) return [];
    
    const combined = [
        ...(tripRequests || []).map(req => ({ ...req, type: 'trip_request' })),
        ...(generalOrders || []).map(order => ({ ...order, type: 'general_order' }))
    ];
    
    // Sort by created_at descending
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [tripRequests, generalOrders, isLoadingTripRequests, isLoadingGeneralOrders]);

  const isLoadingSent = isLoadingTripRequests || isLoadingGeneralOrders;
  const sentRequestsError = tripRequestsError || generalOrdersError;

  // --- Price Calculation Helper ---
  const calculatePriceDisplay = (item: any) => {
    const isGeneralOrder = item.type === 'general_order';
    const from_country = isGeneralOrder ? item.from_country : item.trips?.from_country;
    const to_country = isGeneralOrder ? item.to_country : item.trips?.to_country;
    const weight_kg = item.weight_kg;
    const has_insurance = isGeneralOrder ? item.has_insurance : false; // Insurance only applies to general orders

    if (!from_country || !to_country || from_country === to_country || weight_kg <= 0) {
        return null;
    }

    const result = calculateShippingCost(from_country, to_country, weight_kg);

    if (result.error) return null;

    let totalPriceUSD = result.totalPriceUSD;
    
    // Apply insurance multiplier if applicable (rate is 2x in PlaceOrder.tsx)
    if (has_insurance) {
      totalPriceUSD *= 2; 
    }
    
    const USD_TO_IQD_RATE = 1400; // Defined in pricing.ts, hardcoding here for calculation consistency
    const totalPriceIQD = totalPriceUSD * USD_TO_IQD_RATE; 

    return {
      totalPriceUSD,
      totalPriceIQD,
      pricePerKgUSD: result.pricePerKgUSD,
      hasInsurance: has_insurance
    };
  };
  // --- End Price Calculation Helper ---

  // --- Mutations ---

  const updateRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const { error: updateError } = await supabase
        .from('requests')
        .update({ status })
        .eq('id', requestId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentTripRequests'] });
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
      showSuccess(t('requestUpdatedSuccess'));
    },
    onError: (err: any) => showError(err.message),
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (item: any) => {
      if (item.type === 'trip_request') {
        // Only allow deletion of pending trip requests (RLS handles this too)
        const { error } = await supabase
          .from('requests')
          .delete()
          .eq('id', item.id);
        if (error) throw error;
      } else if (item.type === 'general_order') {
        // Only allow deletion of 'new' general orders
        const { error } = await supabase
          .from('general_orders')
          .delete()
          .eq('id', item.id)
          .eq('status', 'new'); 
        if (error) throw error;
      } else {
        throw new Error("Unknown item type for deletion");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentTripRequests'] });
      queryClient.invalidateQueries({ queryKey: ['generalOrders'] });
      showSuccess(t('requestCancelledSuccess'));
    },
    onError: (err: any) => {
      console.error("Error deleting request:", err);
      showError(t('requestCancelledError'));
    },
  });

  const handleUpdateRequest = (request: any, status: string) => {
    updateRequestMutation.mutate({ requestId: request.id, status });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'new':
        return 'secondary'; // General order status
      default:
        return 'secondary';
    }
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

  const renderAcceptedDetails = (req: RequestWithProfiles, isReceived: boolean) => {
    // This function is only relevant for trip_requests
    if (req.type !== 'trip_request' || req.status !== 'accepted') return null;
    
    // For received requests, we use sender_profile
    // For sent requests, we use traveler_profile
    const otherParty = isReceived ? req.sender_profile : req.traveler_profile;
    const trip = req.trips;
    
    if (!otherParty || !trip) return null;
    
    const otherPartyName = `${otherParty.first_name || ''} ${otherParty.last_name || ''}`.trim() || t('user');
    const otherPartyPhone = otherParty.phone || t('noPhoneProvided');
    
    return (
      <div className="mt-4 p-4 border rounded-lg bg-green-50 dark:bg-green-900/30 space-y-3">
        <h4 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
          <BadgeCheck className="h-5 w-5" />
          {t('requestAcceptedTitle')}
        </h4>
        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <p className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span className="font-semibold">{isReceived ? t('sender') : t('traveler')}:</span>
            {otherPartyName}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            <span className="font-semibold">{t('phone')}:</span>
            {otherPartyPhone}
          </p>
        </div>
        {/* Trip Info */}
        <div className="border-t pt-3 space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            <span className="font-semibold">{t('tripRoute')}:</span>
            {trip.from_country} → {trip.to_country}
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
            <CardDescription className="flex items-center gap-2 pt-2">
              <Plane className="h-4 w-4" />
              {req.trips?.from_country || 'N/A'} → {req.trips?.to_country || 'N/A'} 
              {req.trips?.trip_date && ` on ${format(new Date(req.trips.trip_date), 'PPP')}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p><span className="font-semibold">{t('packageWeightKg')}:</span> {req.weight_kg} kg</p>
            
            {renderPriceBlock(priceCalculation)}
            
            {renderAcceptedDetails(req, false)}
            <div className="flex gap-2 mt-4">
              {req.status === 'pending' && (
                <Button variant="destructive" size="sm" onClick={() => setRequestToCancel(req)} disabled={deleteRequestMutation.isPending}>
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
            <CardDescription className="flex items-center gap-2 pt-2">
              <Plane className="h-4 w-4" />
              {order.from_country} → {order.to_country} 
            </CardDescription>
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
            
            {/* Display Price for General Order */}
            {renderPriceBlock(priceCalculation)}
            
            {/* Cancellation button for 'new' status general orders */}
            {order.status === 'new' && (
              <div className="flex gap-2 mt-4">
                <Button variant="destructive" size="sm" onClick={() => setRequestToCancel(order)} disabled={deleteRequestMutation.isPending}>
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


  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('myRequests')}</h1>
      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">{t('receivedRequests')}</TabsTrigger>
          <TabsTrigger value="sent">{t('sentRequests')}</TabsTrigger>
        </TabsList>
        <TabsContent value="received">
          <Card>
            <CardHeader><CardTitle>{t('receivedRequests')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {isLoadingReceived && <p>{t('loading')}</p>}
              {receivedRequestsError && (
                <div>
                  <p className="text-red-500">
                    Error loading received requests: {receivedRequestsError.message}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    User ID: {user?.id}
                  </p>
                </div>
              )}
              {receivedRequests && receivedRequests.length > 0 ? receivedRequests.map(req => {
                // Ensure req has a type for the helper function
                const requestWithMetadata = { ...req, type: 'trip_request' };
                const priceCalculation = calculatePriceDisplay(requestWithMetadata);
                
                const senderName = req.sender_profile?.first_name || 'User';

                return (
                  <Card key={req.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{t('requestFrom')} {senderName}</span>
                        <Badge variant={getStatusVariant(req.status)}>{t(req.status)}</Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 pt-2">
                        <Plane className="h-4 w-4" />
                        {req.trips?.from_country || 'N/A'} → {req.trips?.to_country || 'N/A'} 
                        {req.trips?.trip_date && ` on ${format(new Date(req.trips.trip_date), 'PPP')}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
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
                      
                      {renderAcceptedDetails(req, true)}
                      <div className="flex gap-2 pt-2">
                        {req.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => handleUpdateRequest(req, 'accepted')} disabled={updateRequestMutation.isPending}>{t('accept')}</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleUpdateRequest(req, 'rejected')} disabled={updateRequestMutation.isPending}>{t('reject')}</Button>
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
              }) : !isLoadingReceived && !receivedRequestsError && (
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
        </TabsContent>
        <TabsContent value="sent">
          <Card>
            <CardHeader><CardTitle>{t('sentRequests')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {isLoadingSent && <p>{t('loading')}</p>}
              {sentRequestsError && (
                <p className="text-red-500">
                  Error loading sent requests: {sentRequestsError.message}
                </p>
              )}
              {allSentItems.length > 0 ? allSentItems.map(renderSentItem) : !isLoadingSent && !sentRequestsError && <p>{t('noSentRequests')}</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <AlertDialog open={!!requestToCancel} onOpenChange={(open) => !open && setRequestToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('areYouSureCancel')}</AlertDialogTitle>
            <AlertDialogDescription>{t('cannotBeUndone')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRequestToCancel(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (requestToCancel) {
                  deleteRequestMutation.mutate(requestToCancel);
                }
                setRequestToCancel(null);
              }} 
              disabled={deleteRequestMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyRequests;