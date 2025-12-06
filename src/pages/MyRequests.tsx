"use client";
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { showSuccess, showError } from '@/utils/toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { ReceivedRequestsTab } from '@/components/my-requests/ReceivedRequestsTab';
import { SentRequestsTab } from '@/components/my-requests/SentRequestsTab';

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
        const { error } = await supabase
          .from('requests')
          .delete()
          .eq('id', item.id);
        if (error) throw error;
      } else if (item.type === 'general_order') {
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

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('myRequests')}</h1>
      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">{t('receivedRequests')}</TabsTrigger>
          <TabsTrigger value="sent">{t('sentRequests')}</TabsTrigger>
        </TabsList>
        <TabsContent value="received">
          <ReceivedRequestsTab 
            user={user}
            onUpdateRequest={handleUpdateRequest}
            updateRequestMutation={updateRequestMutation}
          />
        </TabsContent>
        <TabsContent value="sent">
          <SentRequestsTab 
            user={user}
            onCancelRequest={setRequestToCancel}
            deleteRequestMutation={deleteRequestMutation}
          />
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