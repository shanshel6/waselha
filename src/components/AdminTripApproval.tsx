"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, FileText, AlertTriangle } from 'lucide-react';

interface Trip {
  id: string;
  user_id: string;
  from_country: string;
  to_country: string;
  trip_date: string;
  free_kg: number;
  ticket_file_url: string | null;
  is_approved: boolean;
  admin_review_notes: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface AdminTripApprovalProps {
  trip: Trip;
  onApprove?: (notes: string) => void;
  onReject?: (notes: string) => void;
}

const AdminTripApproval: React.FC<AdminTripApprovalProps> = ({ 
  trip,
  onApprove,
  onReject
}) => {
  const { t } = useTranslation();
  const [reviewNotes, setReviewNotes] = React.useState(trip.admin_review_notes || '');

  const handleApprove = () => {
    if (onApprove) {
      onApprove(reviewNotes);
    }
  };

  const handleReject = () => {
    if (onReject) {
      onReject(reviewNotes);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">{t('adminApproval')}</h4>
          <Badge variant={trip.is_approved ? "default" : "secondary"} className="mt-1">
            {trip.is_approved ? t('approved') : t('pendingApproval')}
          </Badge>
        </div>
        {!trip.is_approved && (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('approve')}
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={handleReject}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t('reject')}
            </Button>
          </div>
        )}
      </div>
      
      {trip.ticket_file_url && (
        <div>
          <p className="text-sm font-medium mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('uploadedTicket')}
          </p>
          <a 
            href={trip.ticket_file_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            {t('viewTicket')}
          </a>
        </div>
      )}
      
      {!trip.ticket_file_url && (
        <div className="flex items-center gap-2 text-amber-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          {t('noTicketUploaded')}
        </div>
      )}
      
      <div>
        <label className="text-sm font-medium mb-2 block">
          {t('reviewNotes')}
        </label>
        <Textarea 
          value={reviewNotes} 
          onChange={(e) => setReviewNotes(e.target.value)} 
          placeholder={t('reviewNotesPlaceholder')}
          className="min-h-[80px]"
        />
      </div>
    </div>
  );
};

export default AdminTripApproval;