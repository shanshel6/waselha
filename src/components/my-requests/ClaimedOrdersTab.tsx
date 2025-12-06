"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Package, User, Weight, MessageSquare, Phone, BadgeCheck, DollarSign, CheckCircle, XCircle, Clock, Inbox, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { calculateShippingCost } from '@/lib/pricing';
import CountryFlag from '@/components/CountryFlag';

// Re-using types from MyRequests.tsx
interface Profile { id: string; first_name: string | null; last_name: string | null; phone: string | null; }
interface GeneralOrder {
  id: string; user_id: string; traveler_id: string | null; from_country: string; to_country: string;
  description: string; weight_kg: number; is_valuable: boolean; has_insurance: boolean;
  status: 'new' | 'claimed' | 'in_transit' | 'delivered'; created_at: string;
  proposed_changes: { weight_kg: number; description: string } | null;
  profiles: Profile | null; // Assuming we fetch sender profile
}

interface ClaimedOrdersTabProps {
  user: any;
  onReviewChanges: (args: { order: GeneralOrder; accept: boolean }) => void;
  reviewChangesMutation: any;
}

export const ClaimedOrdersTab = ({ user, onReviewChanges, reviewChangesMutation }: ClaimedOrdersTabProps) => {
  const { t } = useTranslation();

  const { data: claimedOrders, isLoading, error } = useQuery({
    queryKey: ['claimedOrders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('general_orders')
        .select(`*, profiles:user_id (id, first_name, last_name, phone)`)
        .eq('traveler_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data as GeneralOrder[];
    },
    enabled: !!user,
  });

  const calculatePriceDisplay = (order: GeneralOrder, useProposed = false) => {
    const weight_kg = useProposed ? order.proposed_changes?.weight_kg : order.weight_kg;
    if (!weight_kg) return null;
    const result = calculateShippingCost(order.from_country, order.to_country, weight_kg);
    if (result.error) return null;
    let totalPriceUSD = result.totalPriceUSD;
    if (order.has_insurance) totalPriceUSD *= 2;
    const totalPriceIQD = totalPriceUSD * 1400;
    return { totalPriceUSD, totalPriceIQD };
  };

  const renderProposedChanges = (order: GeneralOrder) => {
    if (!order.proposed_changes) return null;
    const originalPrice = calculatePriceDisplay(order);
    const newPrice = calculatePriceDisplay(order, true);
    return (
      <div className="mt-4 p-4 border-2 border-blue-500/50 rounded-lg bg-blue-50 dark:bg-blue-900/20 space-y-3">
        <h4 className="font-bold text-blue-800 dark:text-blue-300">{t('proposedChanges')}</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><Weight className="h-4 w-4" /><span className="font-semibold">{t('packageWeightKg')}:</span><span className="line-through text-muted-foreground">{order.weight_kg} kg</span><ArrowRight className="h-4 w-4" /><span className="font-bold">{order.proposed_changes.weight_kg} kg</span></div>
          <div><p className="font-semibold flex items-center gap-2"><Package className="h-4 w-4" />{t('packageContents')}:</p><p className="line-through text-muted-foreground pl-6">{order.description}</p><p className="font-bold pl-6">{order.proposed_changes.description}</p></div>
          {newPrice && <div className="flex items-center gap-2"><DollarSign className="h-4 w-4" /><span className="font-semibold">{t('estimatedCost')}:</span>{originalPrice && <span className="line-through text-muted-foreground">${originalPrice.totalPriceUSD.toFixed(2)}</span>}<ArrowRight className="h-4 w-4" /><span className="font-bold">${newPrice.totalPriceUSD.toFixed(2)}</span></div>}
        </div>
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => onReviewChanges({ order, accept: true })} disabled={reviewChangesMutation.isPending}>{t('acceptChanges')}</Button>
          <Button size="sm" variant="destructive" onClick={() => onReviewChanges({ order, accept: false })} disabled={reviewChangesMutation.isPending}>{t('rejectChanges')}</Button>
        </div>
      </div>
    );
  };

  if (isLoading) return <p>{t('loading')}</p>;
  if (error) return <p className="text-red-500">Error: {error.message}</p>;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Inbox className="h-6 w-6 text-primary" />{t('claimedOrders')}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {claimedOrders && claimedOrders.length > 0 ? claimedOrders.map(order => {
          const senderName = order.profiles?.first_name || t('sender');
          const hasPendingChanges = !!order.proposed_changes;
          return (
            <Card key={order.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">{t('orderFrom')} {senderName}</span>
                  <Badge variant="secondary">{hasPendingChanges ? t('reviewChanges') : t(order.status)}</Badge>
                </CardTitle>
                <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground"><Plane className="h-4 w-4" /><CountryFlag country={order.from_country} showName /> → <CountryFlag country={order.to_country} showName /></div>
              </CardHeader>
              <CardContent>
                {hasPendingChanges ? renderProposedChanges(order) : (
                  <div className="space-y-3">
                    <div><p className="font-semibold text-sm flex items-center gap-2"><Package className="h-4 w-4" />{t('packageContents')}:</p><p className="text-sm text-muted-foreground pl-6">{order.description}</p></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <p className="flex items-center gap-2"><Weight className="h-4 w-4" /><span className="font-semibold">{t('packageWeightKg')}:</span> {order.weight_kg} kg</p>
                      <p className="flex items-center gap-2"><User className="h-4 w-4" /><span className="font-semibold">{t('sender')}:</span> {senderName}</p>
                      <p className="flex items-center gap-2"><Phone className="h-4 w-4" /><span className="font-semibold">{t('phone')}:</span> {order.profiles?.phone || t('noPhoneProvided')}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        }) : <p>{t('noClaimedOrders')}</p>}
      </CardContent>
    </Card>
  );
};