"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/use-admin-check';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { fetchAdminEmails } from '@/utils/admin';
import { showSuccess, showError } from '@/utils/toast';

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface VerificationRequestRow {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  id_front_url: string | null;
  id_back_url: string | null;
  residential_card_url: string | null;
  photo_id_url: string | null;
  created_at: string;
  updated_at: string | null;
}

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
  };
}

interface VerificationRequestCardProps {
  request: VerificationRequest;
}

const Thumbnail: React.FC<{ url: string | null; label: string }> = ({ url, label }) => {
  if (!url) return null;

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-xs font-medium">{label}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <img
          src={url}
          alt={label}
          className="h-20 w-20 object-cover rounded-md border"
        />
      </a>
    </div>
  );
};

const VerificationRequestCard: React.FC<VerificationRequestCardProps> = ({ request }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: 'approved' | 'rejected' }) => {
      // Call Edge Function so it can bypass RLS securely with service role
      const { data, error } = await supabase.functions.invoke('admin-verification', {
        body: {
          request_id: request.id,
          user_id: request.user_id,
          status,
        },
      });

      if (error) {
        console.error('admin-verification invoke error:', error);
        throw new Error(error.message || 'Failed to update verification via Edge Function');
      }

      if (!data?.success) {
        throw new Error('Verification function did not complete successfully');
      }
    },
    onSuccess: (_, variables) => {
      // Refetch everything that depends on verification
      queryClient.invalidateQueries({ queryKey: ['verificationRequests'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['profile', request.user_id] });
      queryClient.invalidateQueries({ queryKey: ['verificationStatus', request.user_id] });

      showSuccess(
        t(variables.status === 'approved' ? 'verificationApproved' : 'verificationRejected'),
      );
    },
    onError: (err: any) => {
      console.error('Verification status update failed:', err);
      showError(err.message || 'Failed to update verification status');
    },
  });

  const handleAction = (status: 'approved' | 'rejected') => {
    updateStatusMutation.mutate({ status });
  };

  const getStatusVariantClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const fullName =
    `${request.profiles.first_name || ''} ${request.profiles.last_name || ''}`.trim() ||
    t('user');
  const email = request.profiles.email || 'N/A';
  const phone = request.profiles.phone || t('noPhoneProvided');

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          {fullName}
        </CardTitle>
        <span
          className={`px-2 py-1 rounded-full text-xs ${getStatusVariantClass(
            request.status,
          )}`}
        >
          {t(request.status)}
        </span>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <p className="flex items-center gap-2">
            {email}
          </p>
          <p className="flex items-center gap-2">
            {phone}
          </p>
        </div>

        <div className="space-y-2 border-t pt-4">
          <h4 className="font-semibold">{t('verificationDocuments')}</h4>
          <div className="flex flex-wrap gap-4">
            <Thumbnail url={request.id_front_url} label={t('idFront')} />
            <Thumbnail url={request.id_back_url} label={t('idBack')} />
            <Thumbnail url={request.photo_id_url} label={t('faceWithId')} />
            <Thumbnail url={request.residential_card_url} label={t('residentCard')} />
          </div>
        </div>

        {request.status === 'pending' && (
          <div className="flex gap-4 pt-4">
            <button
              onClick={() => handleAction('approved')}
              disabled={updateStatusMutation.isPending}
              className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {t('approve')}
            </button>
            <button
              onClick={() => handleAction('rejected')}
              disabled={updateStatusMutation.isPending}
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {t('reject')}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AdminVerificationDashboard = () => {
  const { t } = useTranslation();
  const { isAdmin, isLoading: isAdminLoading } = useAdminCheck();

  const {
    data: verificationRequests,
    isLoading: isRequestsLoading,
    error,
  } = useQuery<VerificationRequest[], Error>({
    queryKey: ['verificationRequests'],
    queryFn: async () => {
      const { data: requestsData, error: requestsError } = await supabase
        .from('verification_requests')
        .select(
          'id, user_id, status, id_front_url, id_back_url, residential_card_url, photo_id_url, created_at, updated_at'
        )
        .order('created_at', { ascending: true });

      if (requestsError) {
        throw new Error(requestsError.message);
      }

      const requests = (requestsData || []) as VerificationRequestRow[];

      if (!requests.length) return [];

      const userIds = Array.from(new Set(requests.map((r) => r.user_id)));

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', userIds);

      if (profilesError) {
        throw new Error(profilesError.message);
      }

      const profiles = (profilesData || []) as ProfileRow[];

      const profileMap: Record<string, ProfileRow> = {};
      profiles.forEach((p) => {
        profileMap[p.id] = p;
      });

      const emailMap = await fetchAdminEmails(userIds);

      const enriched: VerificationRequest[] = requests.map((req) => {
        const profile = profileMap[req.user_id];

        return {
          ...req,
          profiles: {
            first_name: profile?.first_name ?? null,
            last_name: profile?.last_name ?? null,
            phone: profile?.phone ?? null,
            email: emailMap[req.user_id] || 'N/A',
          },
        };
      });

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