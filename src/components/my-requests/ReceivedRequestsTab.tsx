"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Inbox } from 'lucide-react';
import { calculateShippingCost } from '@/lib/pricing';
import { RequestTrackingStatus } from '@/lib/tracking-stages';
import ReceivedRequestCard from './ReceivedRequestCard';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

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

const ITEMS_PER_PAGE = 10;

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
  const [currentPage, setCurrentPage] = useState(1);
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const { data: queryResult, isLoading, error } = useQuery<{ requests: Request[], count: number } | null, Error>({
    queryKey: ['receivedRequests', user?.id, currentPage],
    queryFn: async () => {
      if (!user) return { requests: [], count: 0 };

      // 1. Fetch requests and associated trips (with pagination and count)
      const { data: allRequests, error: requestsError, count } = await supabase
        .from('requests')
        .select(`
          *, 
          trips(
            id, user_id, from_country, to_country, trip_date, free_kg, charge_per_kg, traveler_location, notes, created_at
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (requestsError) throw new Error(requestsError.message);

      // Filter client-side to ensure we only show requests where the current user is the trip owner (received requests)
      // NOTE: RLS should handle this, but we filter here to get the correct count for pagination.
      const travelerRequests = allRequests
        .filter(req => req.trips && req.trips.user_id === user.id);
      
      const totalCount = travelerRequests.length;
      
      // Apply client-side pagination to the filtered list
      const paginatedRequests = travelerRequests.slice(offset, offset + ITEMS_PER_PAGE);

      // 2. Collect unique sender IDs from the paginated list
      const senderIds = paginatedRequests
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
      const tripRequestsWithProfiles: RequestWithProfiles[] = paginatedRequests
        .map(req => ({
          ...req,
          sender_profile: profileMap[req.sender_id] || null,
          type: 'trip_request' as const
        })) as RequestWithProfiles[];
      
      return { requests: tripRequestsWithProfiles, count: totalCount };
    },
    enabled: !!user,
  });
  
  const receivedItems = queryResult?.requests || [];
  const totalCount = queryResult?.count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <Pagination className="mt-8">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => handlePageChange(currentPage - 1)} 
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          
          {startPage > 1 && (
            <>
              <PaginationItem><PaginationLink onClick={() => handlePageChange(1)} className="cursor-pointer">1</PaginationLink></PaginationItem>
              {startPage > 2 && <PaginationItem><span className="px-2 py-1 text-sm">...</span></PaginationItem>}
            </>
          )}

          {pageNumbers.map(page => (
            <PaginationItem key={page}>
              <PaginationLink 
                onClick={() => handlePageChange(page)}
                isActive={page === currentPage}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <PaginationItem><span className="px-2 py-1 text-sm">...</span></PaginationItem>}
              <PaginationItem><PaginationLink onClick={() => handlePageChange(totalPages)} className="cursor-pointer">{totalPages}</PaginationLink></PaginationItem>
            </>
          )}

          <PaginationItem>
            <PaginationNext 
              onClick={() => handlePageChange(currentPage + 1)} 
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  if (isLoading) return <p className="p-4 text-center">{t('loading')}</p>;

  if (error) return (
    <div className="p-4">
      <p className="text-red-500 text-center">Error loading received requests: {error.message}</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {receivedItems && receivedItems.length > 0 ? (
        <>
          {receivedItems.map(req => {
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
          })}
          {renderPagination()}
        </>
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