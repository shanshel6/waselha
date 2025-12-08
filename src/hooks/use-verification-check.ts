"use client";

import { useEffect, useState } from 'react';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

/**
 * Re‑enabled verification: returns real isVerified based on profiles.is_verified.
 * If redirectIfUnverified is true, redirects unverified users to /verification.
 */
export const useVerificationCheck = (
  redirectIfUnverified: boolean = true
): { isVerified: boolean; isLoading: boolean } => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      if (isSessionLoading) return;
      if (!user) {
        setIsVerified(false);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('useVerificationCheck error:', error);
        setIsVerified(false);
      } else {
        setIsVerified(!!data?.is_verified);
      }

      setIsLoading(false);
    };

    load();
  }, [user, isSessionLoading]);

  useEffect(() => {
    if (!redirectIfUnverified) return;
    if (isLoading || isSessionLoading) return;
    if (!user) return;
    if (!isVerified) {
      navigate('/verification');
    }
  }, [redirectIfUnverified, isVerified, isLoading, isSessionLoading, user, navigate]);

  return { isVerified, isLoading: isLoading || isSessionLoading };
};