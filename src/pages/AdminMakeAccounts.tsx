"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/use-admin-check';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface UserPassword {
  id: string;
  password: string;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
}

const AdminMakeAccounts = () => {
  const { t } = useTranslation();
  const { isAdmin, isLoading: isAdminLoading } = useAdminCheck();
  
  const { data: userPasswords, isLoading, error } = useQuery<UserPassword[], Error>({
    queryKey: ['userPasswords'],
    queryFn: async () => {
      // Step 1: Fetch all user passwords
      const { data: passwordsData, error: passwordsError } = await supabase
        .from('user_passwords')
        .select('id, password, created_at')
        .order('created_at', { ascending: false });

      if (passwordsError) throw new Error(passwordsError.message);
      if (!passwordsData || passwordsData.length === 0) return [];

      // Step 2: Get all user IDs from the passwords table
      const userIds = passwordsData.map(p => p.id);

      // Step 3: Fetch the corresponding profiles for those user IDs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', userIds);

      if (profilesError) throw new Error(profilesError.message);

      // Step 4: Create a map of profiles for easy lookup
      const profilesMap = new Map(profilesData.map(p => [p.id, p]));

      // Step 5: Merge the password data with the profile data
      const mergedData: UserPassword[] = passwordsData.map(passwordEntry => {
        const profile = profilesMap.get(passwordEntry.id);
        return {
          ...passwordEntry,
          profiles: profile ? {
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone,
          } : null,
        };
      });

      return mergedData;
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

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)]">
      <h1 className="text-3xl font-bold mb-6">معلومات الحسابات المنشأة</h1>
      
      {/* Fixed Admin Account Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>حساب المسؤول الثابت</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b">
                  <th className="p-3">رقم الهاتف</th>
                  <th className="p-3">كلمة المرور</th>
                  <th className="p-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-3" dir="ltr">07779786420</td>
                  <td className="p-3 font-mono text-lg" dir="ltr">199806</td>
                  <td className="p-3">حساب المسؤول الرئيسي</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* User Accounts Section */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الحسابات الجديدة</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>خطأ</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : userPasswords && userPasswords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b">
                    <th className="p-3">الاسم الكامل</th>
                    <th className="p-3">رقم الهاتف</th>
                    <th className="p-3">كلمة المرور</th>
                    <th className="p-3">تاريخ الإنشاء</th>
                  </tr>
                </thead>
                <tbody>
                  {userPasswords.map((userPassword) => (
                    <tr key={userPassword.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        {userPassword.profiles?.first_name} {userPassword.profiles?.last_name}
                      </td>
                      <td className="p-3" dir="ltr">
                        {userPassword.profiles?.phone || 'غير متوفر'}
                      </td>
                      <td className="p-3 font-mono text-lg" dir="ltr">
                        {userPassword.password}
                      </td>
                      <td className="p-3">
                        {format(new Date(userPassword.created_at), 'yyyy-MM-dd HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              لا توجد حسابات جديدة
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMakeAccounts;