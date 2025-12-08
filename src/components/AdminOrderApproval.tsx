"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle } from 'lucide-react';

interface Order {
  id: string;
  user_id: string;
  from_country: string;
  to_country: string;
  description: string;
  weight_kg: number;
  is_valuable: boolean;
  insurance_requested: boolean;
  insurance_percentage: number;
  status: 'new' | 'approved' | 'rejected' | 'matched' | 'claimed' | 'completed' | 'cancelled';
  admin_review_notes: string | null;
  profiles: { first_name: string | null; last_name: string | null; } | null;
}

interface AdminOrderApprovalProps {
  order: Order;
  onApprove?: (notes: string) => void;
  onReject?: (notes: string) => void;
}

const AdminOrderApproval: React.FC<AdminOrderApprovalProps> = ({ order, onApprove, onReject }) => {
  const { t } = useTranslation();
  const [reviewNotes, setReviewNotes] = React.useState(order.admin_review_notes || '');

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
          <Badge variant={order.status === 'approved' ? "default" : "secondary"} className="mt-1">
            {order.status === 'approved' ? t('approved') : order.status === 'rejected' ? t('rejected') : t('pendingApproval')}
          </Badge>
        </div>
        {order.status === 'new' && (
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

export default AdminOrderApproval;