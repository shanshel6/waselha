"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { calculateShippingCost } from '@/lib/pricing';
import GeneralOrderCard from './GeneralOrderCard';
import TripRequestCard from './TripRequestCard';
import { RequestTrackingStatus } from '@/lib/tracking-stages';

// --- Type Definitions (Kept here as the source of truth for the tab) ---
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
  general_order_id: string | null;
  type: 'trip_request';
}

interface GeneralOrder {
  id: string;
  user_id: string;
  from_country: string;
  to_country: string;
  description: string;
  is_valuable: boolean;
  insurance_requested: boolean;
  status: 'new' | 'matched' | 'claimed' | 'completed' | 'cancelled';
  claimed_by: string | null;
  created_at: string;
  updated_at: string;
  insurance_percentage: number;
  weight_kg: number;
  type: 'general_order';
}

type SentItem = Request | GeneralOrder;

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

const isGeneralOrder = (item: SentItem): item is GeneralOrder => item.type === 'general_order';

export const SentRequestsTab = ({ user, onCancelRequest, deleteRequestMutation, onCancelAcceptedRequest, onEditRequest, onUploadSenderPhotos, onTrackingUpdate, trackingUpdateMutation }: SentRequestsTabProps) => {
  const { t } = useTranslation();

  const { data: sentItems, isLoading: isLoadingSent, error: sentRequestsError } = useQuery({
    queryKey: ['sentRequests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // 1. Fetch regular trip requests sent by the user
      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select(`
          *,
          trips (
            id, user_id, from_country, to_country, trip_date, free_kg, charge_per_kg, traveler_location, notes, created_at
          )
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error("Error fetching sent requests:", requestsError);
        throw new Error(requestsError.message);
      }

      // Extract IDs of General Orders that have a corresponding Trip Request
      const linkedGeneralOrderIds = requests
        .map(req => req.general_order_id)
        .filter((id): id is string => !!id);

      // 2. Fetch general orders created by the user, excluding those linked to a request
      let orders: GeneralOrder[] = [];
      if (linkedGeneralOrderIds.length > 0) {
        const { data: filteredOrders, error: ordersError } = await supabase
          .from('general_orders')
          .select('*')
          .eq('user_id', user.id)
          .not('id', 'in', `(${linkedGeneralOrderIds.join(',')})`)
          .order('created_at', { ascending: false });
        
        if (ordersError) {
          console.error("Error fetching filtered general orders:", ordersError);
          throw new Error(ordersError.message);
        }
        orders = filteredOrders as GeneralOrder[];
      } else {
        const { data: allOrders, error: ordersError } = await supabase
          .from('general_orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (ordersError) {
          console.error("Error fetching all general orders:", ordersError);
          throw new Error(ordersError.message);
        }
        orders = allOrders as GeneralOrder[];
      }

      // 3. Collect traveler IDs for trip requests
      const travelerIds = requests
        .filter(req => req.trips?.user_id)
        .map(req => req.trips.user_id)
        .filter((id, index, self) => self.indexOf(id) === index);

      let travelerProfiles: Profile[] = [];
      if (travelerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone')
          .in('id', travelerIds);

        if (profilesError) {
          console.error("Error fetching traveler profiles:", profilesError);
        } else {
          travelerProfiles = profilesData || [];
        }
      }

      const profileMap = travelerProfiles.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, Profile>);

      // 4. Combine and map items
      const tripRequestsWithProfiles: SentItem[] = requests.map(request => ({
        ...request,
        traveler_profile: profileMap[request.trips?.user_id] || null,
        type: 'trip_request' as const
      })) as RequestWithProfiles[];
      
      const generalOrders: SentItem[] = orders.map(order => ({
        ...order,
        type: 'general_order' as const
      })) as GeneralOrder[];

      const combinedItems = [...tripRequestsWithProfiles, ...generalOrders];
      
      // Sort by creation date descending
      combinedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return combinedItems;
    },
    enabled: !!user,
  });

  if (isLoadingSent) return <p className="p-4 text-center">{t('loading')}</p>;

  if (sentRequestsError) return (
    <div className="p-4">
      <p className="text-red-500 text-center">Error loading sent requests: {sentRequestsError.message}</p>
    </div>
  );

  const allSentRequests = sentItems || [];

  return (
    <div className="space-y-3">
      {allSentRequests && allSentRequests.length > 0 ? (
        allSentRequests.map(req => {
          if (isGeneralOrder(req)) {
            return (
              <GeneralOrderCard
                key={req.id}
                order={req}
                onCancelRequest={onCancelRequest}
                deleteRequestMutation={deleteRequestMutation}
                t={t}
              />
            );
          } else {
            // Trip Request (includes those generated from General Orders)
            const tripReq = req as RequestWithProfiles;
            const priceCalculation = calculateShippingCost(
              tripReq.trips?.from_country || '',
              tripReq.trips?.to_country || '',
              tripReq.weight_kg
            );

            return (
              <TripRequestCard
                key={req.id}
                req={tripReq}
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
          }
        })
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold">{t('noSentRequests')}</p>
            <p className="text-muted-foreground mt-2">لم تقم بإرسال أي طلبات بعد.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};