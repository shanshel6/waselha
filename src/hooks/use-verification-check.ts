"use client";

import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useProfile } from './use-profile';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { showError } from '@/utils/toast';
import React from 'react';

/**
 * Checks if the user is verified. If not, redirects them to the profile page
 * and shows an error.
 * @returns {boolean} True if verified, false otherwise.
 */
export const useVerificationCheck = (redirectIfUnverified: boolean = true): { isVerified: boolean; isLoading: boolean } => {
  const { user, isLoading: isSessionLoading } = useSession();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isLoading = isSessionLoading || isLoadingProfile;
  const isVerified = !!user && !!profile?.is_verified;

  React.useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // If not logged in, SessionContextProvider handles redirect to /login
      return;
    }

    if (!isVerified && redirectIfUnverified) {
      showError(t('verificationRequiredTitle'));
      navigate('/my-profile');
    }
  }, [isLoading, isVerified, user, navigate, t, redirectIfUnverified]);

  return { isVerified, isLoading };
};