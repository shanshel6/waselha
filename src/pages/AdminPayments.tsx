"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/use-admin-check';
import { useRequestManagement } from '@/hooks/use-request-management';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ShieldAlert, DollarSign, Plane, User, ImageIcon, CheckCircle, XCircle, Calendar } from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';
import { format } from 'date-fns';

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface TripRow {
  id: string;
  user_id: string;
  from_country: string;
  to_country: string;
  trip_date: string;
}

interface RequestRow {
  id: string;
  sender_id: string;
  trip_id: string;
  payment_status: string | null;
  payment_method: string | null;
  payment_proof_url: string | null;
  payment_reference: string | null;
  payment_amount_iqd: number | null;
  created_at: string;
  trips: TripRow | null;
}

interface EnrichedRequest extends RequestRow {
  sender_profile: ProfileRow | null;
}

const AdminPayments: React.FC = () => {
  const { t } = useTranslation();
  const { isAdmin, isLoading: isAdminLoading } = useAdminCheck();
  const { adminUpdatePaymentStatusMutation } = useRequestManagement();

  const {
    data: requests,
    isLoading,
    error,
  } = useQuery<EnrichedRequest[], Error>({
    queryKey: ['adminPaymentRequests'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error: reqError } = await supabase
        .from('requests')
        .select(
          `
          id,
          sender_id,
          trip_id,
          payment_status,
          payment_method,
          payment_proof_url,
          payment_reference,
          payment_amount_iqd,
          created_at,
          trips (
            id,
            user_id,
            from_country,
            to_country,
            trip_date
          )
        `
        )
        .not('payment_status', 'is', null)
        .order('created_at', { ascending: true });

      if (reqError) throw new Error(reqError.message);

      const rows = (data || []) as RequestRow[];
      if (!rows.length) return [];

      const senderIds = Array.from(new Set(rows.map((r) => r.sender_id)));

      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', senderIds);

      if (profError) throw new Error(profError.message);

      const profileMap: Record<string, ProfileRow> = {};
      (profiles || []).forEach((p) => {
        profileMap[p.id] = p as ProfileRow;
      });

      return rows.map((r) => ({
        ...r,
        sender_profile: profileMap[r.sender_id] || null,
      })) as EnrichedRequest[];
    },
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

  const all = requests || [];
  const pending = all.filter((r) => r.payment_status === 'pending_review');
  const archive = all.filter((r) => r.payment_status === 'paid' || r.payment_status === 'rejected');

  const handleReview = (id: string, status: 'paid' | 'rejected') => {
    adminUpdatePaymentStatusMutation.mutate({ requestId: id, status });
  };

  const renderCard = (req: EnrichedRequest, withActions: boolean) => {
    const senderName =
      `${req.sender_profile?.first_name || ''} ${req.sender_profile?.last_name || ''}`.trim() ||
      t('user');
    const from = req.trips?.from_country || 'N/A';
    const to = req.trips?.to_country || 'N/A';
    const date = req.trips?.trip_date;

    const statusBadge = (() => {
      switch (req.payment_status) {
        case 'paid':
          return <Badge className="bg-green-500 hover:bg-green-500/90 text-white text-xs">مدفوع</Badge>;
        case 'rejected':
          return <Badge variant="destructive" className="text-xs">مرفوض</Badge>;
        case 'pending_review':
        default:
          return <Badge variant="secondary" className="text-xs">قيد المراجعة</Badge>;
      }
    })();

    return (
      <Card key={req.id} className="shadow-sm">
        <CardHeader className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{senderName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Plane className="h-3 w-3" />
                <CountryFlag country={from} showName={false} />
                <span className="text-xs">←</span>
                <CountryFlag country={to} showName={false} />
                {date && (
                  <>
                    <span className="mx-1">•</span>
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(date), 'PPP')}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="secondary" className="text-xs">
                {req.payment_method || 'غير محدد'}
              </Badge>
              {statusBadge}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-primary" />
              <span>
                {req.payment_amount_iqd
                  ? `${req.payment_amount_iqd.toLocaleString('ar-IQ')} IQD`
                  : 'المبلغ غير محدد'}
              </span>
            </div>
            {req.payment_reference && (
              <div className="text-xs text-muted-foreground">
                مرجع الدفع: {req.payment_reference}
              </div>
            )}
          </div>

          {req.payment_proof_url && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                لقطة شاشة لإثبات الدفع:
              </p>
              <a
                href={req.payment_proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <img
                  src={req.payment_proof_url}
                  alt="Payment proof"
                  className="h-32 w-auto rounded border object-contain bg-muted"
                />
              </a>
            </div>
          )}

          {withActions && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleReview(req.id, 'paid')}
                disabled={adminUpdatePaymentStatusMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                تأكيد الدفع
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReview(req.id, 'rejected')}
                disabled={adminUpdatePaymentStatusMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                رفض إثبات الدفع
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)]">
      <h1 className="text-3xl font-bold mb-6">مراجعة دفعات الطلبات</h1>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="max-w-md grid grid-cols-2 mb-4">
          <TabsTrigger value="pending">قيد المراجعة</TabsTrigger>
          <TabsTrigger value="archive">الأرشيف</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                الطلبات التي تنتظر تحقق الدفع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <p>{t('loading')}</p>
              ) : pending.length === 0 ? (
                <p className="text-muted-foreground">لا توجد دفعات قيد المراجعة حالياً.</p>
              ) : (
                pending.map((req) => renderCard(req, true))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archive">
          <Card>
            <CardHeader>
              <CardTitle>دفعات مكتملة / مرفوضة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <p>{t('loading')}</p>
              ) : archive.length === 0 ? (
                <p className="text-muted-foreground">لا يوجد سجل دفعات مؤرشف بعد.</p>
              ) : (
                archive.map((req) => renderCard(req, false))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPayments;