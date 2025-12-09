"use client";

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/SessionContextProvider';

/**
 * AuthGuard:
 * - While session is loading: shows a full-screen loading state.
 * - If not logged in: redirects to /login and shows a blocking screen.
 * - If logged in: renders children.
 */
interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, isLoading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  // Paths that should be accessible without auth
  const publicPaths = ['/login', '/signup', '/reset-password'];

  const isPublic = publicPaths.includes(location.pathname);

  useEffect(() => {
    if (isLoading) return;

    if (!user && !isPublic) {
      // You could optionally preserve returnTo=location.pathname here
      navigate('/login', { replace: true });
    }
  }, [user, isLoading, isPublic, navigate]);

  // While session is loading, block the UI completely.
  if (isLoading && !isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <span className="text-base md:text-lg">جاري تحميل حسابك...</span>
      </div>
    );
  }

  // If not logged in and not on a public route,
  // show a blocking redirecting screen (no app content).
  if (!user && !isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <span className="text-base md:text-lg">جاري تحويلك إلى صفحة تسجيل الدخول...</span>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;