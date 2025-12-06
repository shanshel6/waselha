"use client";
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Package, DollarSign, Weight, MapPin, CheckCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { calculateShippingCost } from '@/lib/pricing';
import CountryFlag from '@/components/CountryFlag';
import { format } from 'date-fns';

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

const GeneralOrders = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const { data: orders, isLoading, error } = useQuery<GeneralOrder[], Error>({
    queryKey: ['generalOrdersList'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('general_orders')
        .select('*')
        .eq('status', 'new')
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const claimOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      if (!user) throw new Error(t('mustBeLoggedIn'));
      
      // Update the order status to 'claimed' and assign traveler_id
      const { error } = await supabase
        .from('general_orders')
        .update({ 
          status: 'claimed', 
          traveler_id: user.id 
        })
        .eq('id', orderId)
        .eq('status', 'new'); // Ensure we only claim 'new' orders

      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess(t('orderClaimedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['generalOrdersList'] });
      queryClient.invalidateQueries({ queryKey: ['generalOrders', user?.id] }); // Invalidate sender's view
    },
    onError: (err: any) => {
      showError(t('orderClaimedError') + ': ' + err.message);
    },
  });

  const renderPriceBlock = (order: GeneralOrder) => {
    const result = calculateShippingCost(order.from_country, order.to_country, order.weight_kg);
    
    if (result.error) return null;

    let totalPriceUSD = result.totalPriceUSD;
    
    if (order.has_insurance) {
      totalPriceUSD *= 2; 
    }
    
    const USD_TO_IQD_RATE = 1400; 
    const totalPriceIQD = totalPriceUSD * USD_TO_IQD_RATE; 

    return (
      <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-300">
        <DollarSign className="h-4 w-4" />
        <span>{t('estimatedCost')}:</span>
        <span className="text-base">${totalPriceUSD.toFixed(2)}</span>
        {order.has_insurance && (
          <Badge variant="default" className="bg-blue-600 hover:bg-blue-600/90 ml-2">
            {t('insuranceOption')}
          </Badge>
        )}
      </div>
    );
  };

  const renderOrderCard = (order: GeneralOrder) => {
    const isClaimedByMe = order.traveler_id === user?.id;
    const isMyOrder = order.user_id === user?.id;

    // Travelers should not see their own orders here, but RLS should handle that.
    if (isMyOrder) return null; 

    return (
      <Card key={order.id} className="flex flex-col transition-all duration-300 hover:shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Plane className="h-5 w-5 text-primary" />
            <CountryFlag country={order.from_country} showName className="text-base" />
            <span className="text-lg">→</span>
            <CountryFlag country={order.to_country} showName className="text-base" />
          </CardTitle>
          <CardDescription className="flex items-center gap-2 pt-2">
            <Package className="h-4 w-4" />
            {t('orderPlacedOn')}: {format(new Date(order.created_at), 'PPP')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-4">
          <div className="space-y-1">
            <p className="font-semibold text-sm">{t('packageContents')}:</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{order.description}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <p className="flex items-center gap-1"><Weight className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{order.weight_kg} kg</span></p>
            {order.is_valuable && (
              <Badge variant="destructive">{t('isValuable')}</Badge>
            )}
          </div>
          
          {renderPriceBlock(order)}

        </CardContent>
        <div className="p-4 pt-0 mt-auto">
          {isClaimedByMe ? (
            <Button className="w-full" disabled>
              <CheckCircle className="mr-2 h-4 w-4" /> {t('claimedByYou')}
            </Button>
          ) : (
            <Button 
              className="w-full" 
              onClick={() => claimOrderMutation.mutate(order.id)}
              disabled={claimOrderMutation.isPending}
            >
              {t('claimOrder')}
            </Button>
          )}
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return <div className="container p-4 flex items-center justify-center h-full">{t('loading')}...</div>;
  }

  if (error) {
    return <div className="container p-4 text-red-500">{t('errorLoadingTrips')}: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)]">
      <h1 className="text-4xl font-bold mb-2">{t('generalOrders')}</h1>
      <p className="text-muted-foreground mb-8">{t('generalOrdersDescription')}</p>
      
      {orders && orders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map(renderOrderCard)}
        </div>
      ) : (
        <Card className="text-center p-12">
          <h3 className="text-xl font-semibold">{t('noGeneralOrdersFound')}</h3>
          <p className="text-muted-foreground mt-2">{t('noGeneralOrdersDescription')}</p>
        </Card>
      )}
    </div>
  );
};

export default GeneralOrders;