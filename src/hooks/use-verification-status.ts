"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';

export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

interface VerificationInfo {
  status: VerificationStatus;
}

export const useVerificationStatus = () => {
  const { user } = useSession();

  return useQuery<VerificationInfo, Error>({
    queryKey: ['verificationStatus', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) {
        return { status: 'none' as VerificationStatus };
      }

      // 1) حاول جلب آخر طلب تحقق للمستخدم
      const { data: reqData, error: reqError } = await supabase
        .from('verification_requests')
        .select('status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reqError && reqError.code !== 'PGRST116') {
        throw new Error(reqError.message);
      }

      if (reqData) {
        // status في الجدول: pending | approved | rejected
        return { status: reqData.status as VerificationStatus };
      }

      // 2) لا يوجد طلب تحقق، نعتمد على profiles.is_verified
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        throw new Error(profileError.message);
      }

      if (profile?.is_verified) {
        return { status: 'approved' };
      }

      return { status: 'none' };
    },
    initialData: { status: 'none' },
  });
};