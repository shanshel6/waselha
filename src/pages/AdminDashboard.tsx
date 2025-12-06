"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/use-admin-check';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VerificationRequestCard from '@/components/VerificationRequestCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Loader2 } from 'lucide-react';

// Define the structure of the data fetched from Supabase
interface VerificationRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  id_front_url: string;
  id_back_url: string;
  face_with_id_url: string;
  residential_card_url?: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { isAdmin, isLoading: isAdminLoading } = useAdminCheck();

  const { data: requests, isLoading: isRequestsLoading, error } = useQuery<VerificationRequest[], Error>({
    queryKey: ['verificationRequests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            phone
          )
        `)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      
      // NOTE: We need to fetch the email separately using the admin client since email is in auth.users
      const userIds = data.map(req => req.user_id);
      
      // Using supabase.auth.admin.listUsers requires the service role key, which is not available client-side.
      // Since we are in a client-side context, we must rely on the data available via RLS.
      // For a real admin dashboard, this query should ideally run server-side (e.g., in an Edge Function).
      // For now, we will mock the email fetching or rely on the user's profile data if available.
      
      // Since we cannot securely fetch all user emails client-side, we will use a placeholder 
      // and inform the user that for a production environment, this should be moved to an Edge Function.
      
      return data.map(req => ({
        ...req,
        profiles: {
          ...req.profiles,
          email: 'Email (Admin access required to fetch)',
        }
      })) as VerificationRequest[];
    },
    enabled: isAdmin,
  });

  if (isAdminLoading) {
    return <div className="container p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-8 min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Alert variant="destructive" className="max-w-lg">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{t('accessDenied')}</AlertTitle>
          <AlertDescription>{t('adminAccessRequired')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const pendingRequests = requests?.filter(r => r.status === 'pending') || [];
  const reviewedRequests = requests?.filter(r => r.status !== 'pending') || [];

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)]">
      <h1 className="text-3xl font-bold mb-6">{t('adminDashboard')}</h1>
      
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-lg">
          <TabsTrigger value="pending">{t('pendingVerification')} ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="reviewed">{t('reviewedRequests')} ({reviewedRequests.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader><CardTitle>{t('pendingVerification')}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {isRequestsLoading ? (
                <p>{t('loading')}</p>
              ) : pendingRequests.length > 0 ? (
                pendingRequests.map(req => (
                  <VerificationRequestCard key={req.id} request={req} />
                ))
              ) : (
                <p className="text-muted-foreground">{t('noPendingRequests')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reviewed" className="mt-6">
          <Card>
            <CardHeader><CardTitle>{t('reviewedRequests')}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {isRequestsLoading ? (
                <p>{t('loading')}</p>
              ) : reviewedRequests.length > 0 ? (
                reviewedRequests.map(req => (
                  <VerificationRequestCard key={req.id} request={req} />
                ))
              ) : (
                <p className="text-muted-foreground">{t('noReviewedRequests')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;