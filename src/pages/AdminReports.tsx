"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/use-admin-check';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldAlert, User, Phone, Mail, Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';

interface ReportRow {
  id: string;
  request_id: string;
  reporter_id: string;
  reporter_name: string | null;
  reporter_phone: string | null;
  reporter_email: string | null;
  description: string;
  created_at: string;
}

const AdminReports: React.FC = () => {
  const { t } = useTranslation();
  const { isAdmin, isLoading: isAdminLoading } = useAdminCheck();

  const {
    data: reports,
    isLoading,
    error,
  } = useQuery<ReportRow[], Error>({
    queryKey: ['adminReports'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []) as ReportRow[];
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

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)]">
      <h1 className="text-3xl font-bold mb-6">تقارير الطلبات</h1>

      <Card>
        <CardHeader>
          <CardTitle>بلاغات المستخدمين عن الطلبات</CardTitle>
          <CardDescription className="text-sm">
            هنا تظهر جميع البلاغات التي أرسلها المستخدمون بعد اكتمال الطلب، مع بيانات الاتصال الخاصة بهم.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p>{t('loading')}</p>
          ) : reports && reports.length > 0 ? (
            reports.map((r) => (
              <Card key={r.id} className="border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Package className="h-3 w-3 mr-1" />
                          طلب رقم: {r.request_id}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(r.created_at), 'PPP p')}
                      </p>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-1 text-xs">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {r.reporter_name || 'مستخدم بدون اسم'}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {r.reporter_phone || 'لا يوجد رقم هاتف'}
                      </span>
                      {r.reporter_email && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {r.reporter_email}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-line leading-relaxed">
                    {r.description}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">
              لا توجد تقارير حتى الآن.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReports;