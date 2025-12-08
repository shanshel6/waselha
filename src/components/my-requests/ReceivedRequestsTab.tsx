"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Inbox } from 'lucide-react';
import { calculateShippingCost } from '@/lib/pricing';
import { RequestTrackingStatus } from '@/lib/tracking-stages';
import ReceivedRequestCard from './ReceivedRequestCard';

// Define types for our data structure
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
  general_order_id: string | null;
  type: 'trip_request';
}

interface RequestWithProfiles extends Request {
  sender_profile: Profile | null;
}

interface ReceivedRequestsTabProps {
  user: any;
  onUpdateRequest: (request: Request, status: 'accepted' | 'rejected') => void;
  updateRequestMutation: any;
  onCancelAcceptedRequest: (request: Request) => void;
  onReviewChanges: (args: { request: Request; accept: boolean }) => void;
  reviewChangesMutation: any;
  onUploadInspectionPhotos?: (request: Request) => void;
  onTrackingUpdate: (request: Request, newStatus: RequestTrackingStatus) => void;
  trackingUpdateMutation: any;
}

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

      // 1. Fetch requests and associated trips (without joining sender profile yet)
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

      // Filter client-side to ensure we only show requests where the current user is the trip owner (received requests)
      const travelerRequests = allRequests
        .filter(req => req.trips && req.trips.user_id === user.id);
      
      // 2. Collect unique sender IDs
      const senderIds = travelerRequests
        .map(req => req.sender_id)
        .filter((id, index, self) => self.indexOf(id) === index);

      let senderProfiles: Profile[] = [];
      if (senderIds.length > 0) {
        // 3. Fetch sender profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone')
          .in('id', senderIds);

        if (profilesError) {
          console.error("Error fetching sender profiles:", profilesError);
        } else {
          senderProfiles = profilesData || [];
        }
      }

      const profileMap = senderProfiles.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, Profile>);

      // 4. Map profiles back and finalize structure
      const tripRequestsWithProfiles: RequestWithProfiles[] = travelerRequests
        .map(req => ({
          ...req,
          sender_profile: profileMap[req.sender_id] || null,
          type: 'trip_request' as const
        })) as RequestWithProfiles[];
      
      // Sort by creation date descending
      tripRequestsWithProfiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return tripRequestsWithProfiles;
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
            <ReceivedRequestCard
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