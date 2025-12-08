"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, User, Mail, Phone, Link as LinkIcon } from 'lucide-react';

interface VerificationRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  id_front_url: string | null;
  id_back_url: string | null;
  residential_card_url?: string | null;
  photo_id_url: string | null; // match DB column
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email?: string; // attached in AdminDashboard via fetchAdminEmails
    phone: string | null;
  };
}

interface VerificationRequestCardProps {
  request: VerificationRequest;
}

const VerificationRequestCard: React.FC<VerificationRequestCardProps> = ({ request }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: 'approved' | 'rejected' }) => {
      const { error: requestError } = await supabase
        .from('verification_requests')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (requestError) throw requestError;

      if (status === 'approved') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_verified: true })
          .eq('id', request.user_id);

        if (profileError) throw profileError;
      }
    },
    onSuccess: (_, variables) => {
      showSuccess(
        t(variables.status === 'approved' ? 'verificationApproved' : 'verificationRejected'),
      );
      queryClient.invalidateQueries({ queryKey: ['verificationRequests'] });
    },
    onError: (err: any) => {
      showError(err.message);
    },
  });

  const handleAction = (status: 'approved' | 'rejected') => {
    updateStatusMutation.mutate({ status });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const fullName =
    `${request.profiles.first_name || ''} ${request.profiles.last_name || ''}`.trim() ||
    t('user');
  const email = request.profiles.email || 'N/A';
  const phone = request.profiles.phone || t('noPhoneProvided');

  const DocumentLink: React.FC<{ url: string | null; label: string }> = ({ url, label }) =>
    !url ? null : (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <LinkIcon className="h-4 w-4" />
        {label}
      </a>
    );

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <User className="h-5 w-5" />
          {fullName}
        </CardTitle>
        <Badge variant={getStatusVariant(request.status)}>{t(request.status)}</Badge>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" /> {email}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" /> {phone}
          </p>
        </div>
        <div className="space-y-2 border-t pt-4">
          <h4 className="font-semibold">{t('verificationDocuments')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DocumentLink url={request.id_front_url} label={t('idFront')} />
            <DocumentLink url={request.id_back_url} label={t('idBack')} />
            <DocumentLink url={request.photo_id_url} label={t('faceWithId')} />
            <DocumentLink url={request.residential_card_url || null} label={t('residentCard')} />
          </div>
        </div>
        {request.status === 'pending' && (
          <div className="flex gap-4 pt-4">
            <Button
              onClick={() => handleAction('approved')}
              disabled={updateStatusMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('approve')}
            </Button>
            <Button
              onClick={() => handleAction('rejected')}
              disabled={updateStatusMutation.isPending}
              variant="destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t('reject')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VerificationRequestCard;