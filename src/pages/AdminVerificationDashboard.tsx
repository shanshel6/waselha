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
import { fetchAdminEmails } from '@/utils/admin';

interface VerificationRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  id_front_url: string | null;
  id_back_url: string | null;
  residential_card_url: string | null;
  photo_id_url: string | null;
  created_at: string;
  updated_at: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email?: string;
  } | null;
}

const AdminVerificationDashboard = () => {
  const { t } = useTranslation();
  const { isAdmin, isLoading: isAdminLoading } = useAdminCheck();

  const { data: verificationRequests, isLoading: isRequestsLoading, error } = useQuery<
    VerificationRequest[],
    Error
  >({
    queryKey: ['verificationRequests'],
    queryFn: async () => {
      // اجلب كل طلبات التحقق مع بروفايل المستخدم
      const { data, error: allRequestsError } = await supabase
        .from('verification_requests')
        .select(
          `
          id,
          user_id,
          status,
          id_front_url,
          id_back_url,
          residential_card_url,
          photo_id_url,
          created_at,
          updated_at,
          profiles (
            first_name,
            last_name,
            phone
          )
        `
        )
        .order('created_at', { ascending: true });

      if (allRequestsError) {
        console.error('Error fetching verification_requests:', allRequestsError);
        throw new Error(allRequestsError.message);
      }

      const requests = (data || []) as VerificationRequest[];

      if (!requests.length) {
        return [];
      }

      // نضيف الإيميل من auth.users عن طريق edge function
      const userIds = requests.map((req) => req.user_id);
      const emailMap = await fetchAdminEmails(userIds);

      const enriched = requests.map((req) => ({
        ...req,
        profiles: req.profiles
          ? {
              ...req.profiles,
              email: emailMap[req.user_id] || 'N/A',
            }
          : {
              first_name: null,
              last_name: null,
              phone: null,
              email: emailMap[req.user_id] || 'N/A',
            },
      }));

      return enriched;
    },
    enabled: isAdmin,
  });

  if (isAdminLoading) {
    return (
      <div className="container p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
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

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <Alert variant="destructive">
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const all = verificationRequests || [];
  const pendingVerificationRequests = all.filter((r) => r.status === 'pending');
  const processedVerificationRequests = all.filter((r) => r.status !== 'pending');

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)]">
      <h1 className="text-3xl font-bold mb-6">
        {t('adminDashboard')} – {t('pendingVerification')}
      </h1>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xl">
          <TabsTrigger value="pending">{t('pendingVerification')}</TabsTrigger>
          <TabsTrigger value="achievements">{t('verificationsReviewedSection')}</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('pendingVerification')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isRequestsLoading ? (
                <p>{t('loading')}</p>
              ) : pendingVerificationRequests.length > 0 ? (
                pendingVerificationRequests.map((req) => (
                  <VerificationRequestCard key={req.id} request={req} />
                ))
              ) : (
                <p className="text-muted-foreground">{t('noPendingRequests')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('verificationsReviewedSection')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isRequestsLoading ? (
                <p>{t('loading')}</p>
              ) : processedVerificationRequests.length > 0 ? (
                processedVerificationRequests.map((req) => (
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

export default AdminVerificationDashboard;