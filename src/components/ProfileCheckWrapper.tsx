"use client";

import React from 'react';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useProfile } from '@/hooks/use-profile';
import { useLocation, useNavigate } from 'react-router-dom';

interface ProfileCheckWrapperProps {
  children: React.ReactNode;
}

const ProfileCheckWrapper: React.FC<ProfileCheckWrapperProps> = ({ children }) => {
  const { user, isLoading: isSessionLoading } = useSession();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup';
  const isCompleteProfileRoute = location.pathname === '/complete-profile';

  React.useEffect(() => {
    if (isSessionLoading || isLoadingProfile) {
      return; // Wait for session and profile data
    }

    const profileIncomplete = user && profile && (!profile.first_name || !profile.last_name);

    if (profileIncomplete && !isCompleteProfileRoute) {
      // User is logged in but profile is incomplete, redirect to completion page
      navigate('/complete-profile');
    } else if (!profileIncomplete && isCompleteProfileRoute) {
      // User is logged in and profile is complete, but they landed on the completion page, redirect home
      navigate('/');
    }
  }, [user, profile, isSessionLoading, isLoadingProfile, navigate, isCompleteProfileRoute]);

  // If we are loading, or if the user is logged in but profile is incomplete and we are not on the completion page,
  // we render a loading state or nothing while the redirect happens.
  if (isSessionLoading || isLoadingProfile) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Allow access to auth routes regardless of profile status
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // If profile is incomplete, only allow access to the completion page
  if (user && profile && (!profile.first_name || !profile.last_name) && !isCompleteProfileRoute) {
    // This should be caught by the useEffect, but as a fallback, render nothing while redirecting
    return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
  }

  return <>{children}</>;
};

export default ProfileCheckWrapper;