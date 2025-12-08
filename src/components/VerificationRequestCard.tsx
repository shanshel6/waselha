"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, User, Mail, Phone } from 'lucide-react';

interface VerificationRequest {
  id: string;
  user_id: string;
  status: string;
  id_front_url: string;
  id_back_url: string;
  photo_id_url: string;
  residential_card_url?: string;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
  } | null;
}

interface VerificationRequestCardProps {
  request: VerificationRequest;
}

const VerificationRequestCard: React.FC<VerificationRequestCardProps> = ({ request }) => {
  const { t } = useTranslation();

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Thumbnail helper with a graceful fallback if a URL is missing
  const renderThumbnail = (url?: string, alt?: string) => {
    if (!url) {
      return (
        <div className="h-20 w-20 bg-gray-100 border border-dashed border-gray-300 rounded-md flex items-center justify-center text-xs text-gray-600">
          {t('noTicketUploaded')}
        </div>
      );
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img src={url} alt={alt ?? 'document'} className="h-20 w-20 object-cover rounded-md border" />
      </a>
    );
  };

  // Fallback name if profile data is missing
  const displayName = request.profiles?.first_name || request.profiles?.last_name
    ? `${request.profiles?.first_name ?? ''} ${request.profiles?.last_name ?? ''}`.trim()
    : t('user');

  return (
    <Card className="border-2 border-dashed">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <User className="h-4 w-4" />
          {displayName}
        </CardTitle>
        <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
          <Mail className="h-3 w-3" />
          {request.profiles?.email || ''}
          <Phone className="h-3 w-3" />
          {request.profiles?.phone || ''}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          <div>{renderThumbnail(request.id_front_url, 'ID Front')}</div>
          <div>{renderThumbnail(request.id_back_url, 'ID Back')}</div>
          <div>{renderThumbnail(request.photo_id_url, 'Photo with ID')}</div>
          <div>{renderThumbnail(request.residential_card_url, 'Residence Card')}</div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <span className="text-xs text-muted-foreground">{t('verificationDocuments')}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default VerificationRequestCard;