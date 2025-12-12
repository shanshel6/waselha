"use client";

import React from 'react';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useProfile } from '@/hooks/use-profile';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

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

    // Handle pending order after login
    if (user) {
      const pendingOrderData = localStorage.getItem('pendingOrder');
      if (pendingOrderData) {
        (async () => {
          try {
            const order = JSON.parse(pendingOrderData);
            const { error } = await supabase.from('general_orders').insert({
              ...order,
              user_id: user.id,
              status: 'new',
            });
            localStorage.removeItem('pendingOrder'); // Remove regardless of outcome
            if (error) {
              showError('Failed to submit your pending order.');
            } else {
              showSuccess('Your pending order has been submitted successfully!');
              navigate('/my-requests', { replace: true });
            }
          } catch (e) {
            console.error('Error processing pending order:', e);
            localStorage.removeItem('pendingOrder');
          }
        })();
        return; // Prevent other redirects from firing
      }
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
        '/send-item',
        '/trips',
        '/my-flights',
        '/my-requests',
      ];
      
      const isAdminPath = location.pathname.startsWith('/admin');

      // Check if the current path starts with any of the allowed paths
      const isAllowed = allowedPaths.some(path => {
        if (path === '/') return location.pathname === '/'; // Exact match for root
        return location.pathname.startsWith(path);
      });

      if (!isAllowed && !isAdminPath) {
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