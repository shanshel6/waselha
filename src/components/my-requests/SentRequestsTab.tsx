"use client";
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { calculateShippingCost } from '@/lib/pricing';
import GeneralOrderCard from './GeneralOrderCard';
import TripRequestCard from './TripRequestCard';
import { RequestTrackingStatus } from '@/lib/tracking-stages';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

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

const ITEMS_PER_PAGE = 10;

const isGeneralOrder = (item: SentItem): item is GeneralOrder => item.type === 'general_order';

export const SentRequestsTab = ({ user, onCancelRequest, deleteRequestMutation, onCancelAcceptedRequest, onEditRequest, onUploadSenderPhotos, onTrackingUpdate, trackingUpdateMutation }: SentRequestsTabProps) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const { data: sentItems, isLoading: isLoadingSent, error: sentRequestsError } = useQuery({
    queryKey: ['sentRequests', user?.id, currentPage],
    queryFn: async () => {
      if (!user) return { items: [], count: 0 };
      
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

      const { data: orders, error: ordersError } = await supabase
        .from('general_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (ordersError) {
        console.error("Error fetching general orders:", ordersError);
        throw new Error(ordersError.message);
      }

      const generalOrderIdsWithRequests = new Set(
        requests.filter(req => req.general_order_id).map(req => req.general_order_id)
      );

      const filteredGeneralOrders: GeneralOrder[] = orders.filter(order => 
        order.status === 'new' || !generalOrderIdsWithRequests.has(order.id)
      ).map(order => ({
        ...order,
        type: 'general_order' as const
      }));

      let combinedItems: SentItem[] = [...filteredGeneralOrders, ...requests.map(req => ({
        ...req,
        type: 'trip_request' as const
      }))];
      
      combinedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const totalCount = combinedItems.length;
      const paginatedItems = combinedItems.slice(offset, offset + ITEMS_PER_PAGE);

      const travelerIds = paginatedItems
        .filter((item): item is Request => !isGeneralOrder(item) && !!item.trips?.user_id)
        .map(req => (req as Request).trips.user_id)
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

      const finalItems = paginatedItems.map(item => {
        if (!isGeneralOrder(item)) {
          const req = item as Request;
          return {
            ...req,
            traveler_profile: profileMap[req.trips?.user_id] || null,
            type: 'trip_request' as const
          } as RequestWithProfiles;
        }
        return item;
      });

      return { items: finalItems, count: totalCount };
    },
    enabled: !!user,
    keepPreviousData: true,
  });
  
  const allSentItems = sentItems?.items || [];
  const totalCount = sentItems?.count || 0;
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

  if (isLoadingSent) return <p className="p-4 text-center">{t('loading')}</p>;

  if (sentRequestsError) return (
    <div className="p-4">
      <p className="text-red-500 text-center">Error loading sent requests: {sentRequestsError.message}</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {allSentItems && allSentItems.length > 0 ? (
        <>
          {allSentItems.map(item => {
            if (isGeneralOrder(item)) {
              return (
                <GeneralOrderCard
                  key={item.id}
                  order={item}
                  onCancelRequest={onCancelRequest}
                  deleteRequestMutation={deleteRequestMutation}
                  t={t}
                />
              );
            } else {
              const tripReq = item as RequestWithProfiles;
              const priceCalculation = calculateShippingCost(
                tripReq.trips?.from_country || '',
                tripReq.trips?.to_country || '',
                tripReq.weight_kg
              );

              return (
                <TripRequestCard
                  key={item.id}
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
          })}
          {renderPagination()}
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-lg font-semibold">{t('noSentRequests')}</p>
            <p className="text-muted-foreground mt-1">
              لم تقم بإرسال أي طلبات بعد. يمكنك البدء بإرسال طلب لرحلة موجودة أو إنشاء طلب شحن عام أو نشر رحلتك.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/trips">
                <Button variant="outline" className="w-full sm:w-auto">
                  {t('trips')}
                </Button>
              </Link>
              <Link to="/place-order">
                <Button variant="outline" className="w-full sm:w-auto">
                  {t('placeOrder')}
                </Button>
              </Link>
              <Link to="/add-trip">
                <Button className="w-full sm:w-auto">
                  {t('addTrip')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};