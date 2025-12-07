"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Package, User, Calendar, PlusCircle } from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';
import { format } from 'date-fns';

interface GeneralOrder {
  id: string;
  user_id: string;
  from_country: string;
  to_country: string;
  description: string;
  is_valuable: boolean;
  insurance_requested: boolean;
  status: string;
  claimed_by: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

const GeneralOrders = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'new' | 'claimed'>('new');

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['generalOrders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch new orders (not claimed)
      const { data: newOrders, error: newOrdersError } = await supabase
        .from('general_orders')
        .select(`
          *,
          profiles (
            first_name,
            last_name
          )
        `)
        .is('claimed_by', null)
        .eq('status', 'new')
        .order('created_at', { ascending: false });

      if (newOrdersError) throw new Error(newOrdersError.message);

      // Fetch claimed orders (claimed by current user)
      const { data: claimedOrders, error: claimedOrdersError } = await supabase
        .from('general_orders')
        .select(`
          *,
          profiles (
            first_name,
            last_name
          )
        `)
        .eq('claimed_by', user.id)
        .order('created_at', { ascending: false });

      if (claimedOrdersError) throw new Error(claimedOrdersError.message);

      // Combine and return both
      return [...newOrders, ...claimedOrders];
    },
    enabled: !!user,
  });

  const claimOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      if (!user) throw new Error(t('mustBeLoggedIn'));

      const { error } = await supabase
        .from('general_orders')
        .update({ 
          claimed_by: user.id,
          status: 'claimed'
        })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generalOrders'] });
      showSuccess(t('orderClaimedSuccess'));
    },
    onError: (error: any) => {
      showError(error.message || t('orderClaimedError'));
    }
  });

  const handleClaimOrder = (orderId: string) => {
    claimOrderMutation.mutate(orderId);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-red-500">{t('errorLoadingTrips')}: {error.message}</p>
      </div>
    );
  }

  const newOrders = orders?.filter(order => !order.claimed_by) || [];
  const claimedOrders = orders?.filter(order => order.claimed_by === user?.id) || [];

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('generalOrders')}</h1>
          <p className="text-muted-foreground">{t('generalOrdersDescription')}</p>
        </div>
        <Link to="/place-order">
          <Button size="lg">
            <PlusCircle className="mr-2 h-5 w-5" />
            {t('placeOrder')}
          </Button>
        </Link>
      </div>

      <div className="flex space-x-4 mb-6">
        <Button 
          variant={activeTab === 'new' ? 'default' : 'outline'} 
          onClick={() => setActiveTab('new')}
        >
          {t('newOrders')} ({newOrders.length})
        </Button>
        <Button 
          variant={activeTab === 'claimed' ? 'default' : 'outline'} 
          onClick={() => setActiveTab('claimed')}
        >
          {t('claimedOrders')} ({claimedOrders.length})
        </Button>
      </div>

      {activeTab === 'new' && (
        <div className="space-y-6">
          {newOrders.length > 0 ? (
            newOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Plane className="h-5 w-5 text-primary" />
                      <CountryFlag country={order.from_country} showName />
                      <span className="text-lg">→</span>
                      <CountryFlag country={order.to_country} showName />
                    </CardTitle>
                    <Badge variant="secondary">
                      {t('statusNewOrder')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {t('orderDescription')}
                      </p>
                      <p>{order.description}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{order.profiles?.first_name || 'N/A'} {order.profiles?.last_name || ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(order.created_at), 'PPP')}</span>
                      </div>
                      {order.is_valuable && (
                        <Badge variant="destructive">{t('isValuable')}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button onClick={() => handleClaimOrder(order.id)}>
                      {t('claimOrder')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="text-center p-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('noGeneralOrdersFound')}</h3>
              <p className="text-muted-foreground mb-4">{t('noGeneralOrdersDescription')}</p>
              <Link to="/place-order">
                <Button>{t('placeOrder')}</Button>
              </Link>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'claimed' && (
        <div className="space-y-6">
          {claimedOrders.length > 0 ? (
            claimedOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow border-primary">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Plane className="h-5 w-5 text-primary" />
                      <CountryFlag country={order.from_country} showName />
                      <span className="text-lg">→</span>
                      <CountryFlag country={order.to_country} showName />
                    </CardTitle>
                    <Badge variant="default">
                      {t('claimedByYou')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {t('orderDescription')}
                      </p>
                      <p>{order.description}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{order.profiles?.first_name || 'N/A'} {order.profiles?.last_name || ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(order.created_at), 'PPP')}</span>
                      </div>
                      {order.is_valuable && (
                        <Badge variant="destructive">{t('isValuable')}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button>{t('viewDetails')}</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="text-center p-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('noClaimedOrders')}</h3>
              <p className="text-muted-foreground mb-4">{t('noClaimedOrdersDescription')}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default GeneralOrders;