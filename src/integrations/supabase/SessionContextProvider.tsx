import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './client';
import { useNavigate, useLocation } from 'react-router-dom';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/login', '/signup'];
const SOFT_PROTECTED_ROUTES = ['/verification']; // Allow unverified users, but must be logged in

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine route category
  const pathname = location.pathname;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isSoftProtectedRoute = SOFT_PROTECTED_ROUTES.includes(pathname);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setIsLoading(false);

        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          // If user lands on login/signup while already authenticated, send them home
          if (currentSession && (pathname === '/login' || pathname === '/signup')) {
            navigate('/', { replace: true });
          }
        } else if (event === 'SIGNED_OUT') {
          // Only redirect to login if user leaves a protected area
          if (!PUBLIC_ROUTES.includes(pathname)) {
            navigate('/login', { replace: true });
          }
        }
      }
    );

    // Initial session fetch
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user || null);
        setIsLoading(false);

        // If unauthenticated and on a protected route, go to login
        if (!session) {
          if (!isPublicRoute) {
            navigate('/login', { replace: true });
          }
        } else {
          // If authenticated and on login/signup, send home
          if (pathname === '/login' || pathname === '/signup') {
            navigate('/', { replace: true });
          }
        }
      })
      .catch((error) => {
        console.error('Error fetching initial session:', error);
        setIsLoading(false);
      });

    return () => {
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Additional redirect guard on location changes (after session known)
  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      // Not logged in
      if (!isPublicRoute) {
        navigate('/login', { replace: true });
      }
      return;
    }

    // Logged in
    if (pathname === '/login' || pathname === '/signup') {
      navigate('/', { replace: true });
      return;
    }

    // Soft protected: must be logged in; we already are, so no redirect here
  }, [session, isLoading, pathname, isPublicRoute, navigate]);

  const value = useMemo(
    () => ({
      session,
      user,
      isLoading,
    }),
    [session, user, isLoading]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};