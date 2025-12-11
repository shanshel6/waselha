"use client";

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useProfile } from '@/hooks/use-profile';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showError } from '@/utils/toast';

const CompleteProfile = () => {
  const { t } = useTranslation();
  const { isLoading: isSessionLoading } = useSession();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const navigate = useNavigate();

  const isProfileComplete = profile && profile.first_name;

  useEffect(() => {
    if (!isLoadingProfile && !isSessionLoading) {
      if (isProfileComplete) {
        // If profile is complete, redirect to home
        navigate('/', { replace: true });
      } else if (!profile) {
        // If profile data is missing entirely (e.g., brand new user, trigger hasn't run yet)
        // We show an error and prompt them to check their profile.
        showError(t('profileUpdatedError'));
      }
    }
  }, [profile, isLoadingProfile, isSessionLoading, navigate, isProfileComplete, t]);

  if (isSessionLoading || isLoadingProfile || isProfileComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">{t('loading')}...</span>
      </div>
    );
  }

  // If we reach here, the user is logged in, profile is loaded, but first_name is missing.
  // This serves as a fallback/error screen.
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background dark:bg-gray-900">
      <div className="w-full max-w-md">
        <Card className="p-4 rounded-lg shadow-lg text-center">
          <CardHeader>
            <User className="h-10 w-10 text-primary mx-auto mb-2" />
            <CardTitle className="text-2xl font-bold">{t('completeProfileTitle')}</CardTitle>
            <CardDescription>
              {t('completeProfileDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive mb-4">
              {t('profileUpdatedError')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('mustBeLoggedIn')}
            </p>
            <Button onClick={() => navigate('/my-profile')} className="w-full mt-4">
              {t('myProfile')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompleteProfile;