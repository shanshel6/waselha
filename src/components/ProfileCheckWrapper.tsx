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

    // Handle incomplete profile (missing name)
    const profileIncomplete = user && profile && !profile.first_name;
    if (profileIncomplete && !isCompleteProfileRoute) {
      navigate('/complete-profile');
      return;
    } else if (!profileIncomplete && isCompleteProfileRoute) {
      navigate('/');
      return;
    }

    // Handle unverified user redirection
    if (user && profile && !profile.is_verified) {
      const allowedPaths = [
        '/',
        '/login',
        '/signup',
        '/complete-profile',
        '/verification',
        '/my-profile',
        '/contact',
        '/about',
        '/faq',
        '/terms',
        '/privacy',
        '/traveler-landing',
      ];
      
      const isAdminPath = location.pathname.startsWith('/admin');

      if (!allowedPaths.includes(location.pathname) && !isAdminPath) {
        navigate('/verification');
      }
    }
  }, [user, profile, isSessionLoading, isLoadingProfile, navigate, location.pathname, isCompleteProfileRoute]);

  if (isSessionLoading || isLoadingProfile) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
};

export default ProfileCheckWrapper;