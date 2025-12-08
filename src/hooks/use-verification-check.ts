"use client";

import { useSession } from '@/integrations/supabase/SessionContextProvider';

/**
 * Temporarily disables verification enforcement: always returns isVerified: true.
 */
export const useVerificationCheck = (_redirectIfUnverified: boolean = true): { isVerified: boolean; isLoading: boolean } => {
  const { isLoading: isSessionLoading } = useSession();

  return {
    isVerified: true,
    isLoading: isSessionLoading,
  };
};