import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './client';

/**
 * هذا الـ Provider أصبح مسؤولا فقط عن:
 * - حفظ session و user
 * - مؤشر التحميل isLoading
 * بدون أي عمليات توجيه (navigation) مرتبطة بالمسار.
 * حماية الصفحات تتم في أماكن أخرى (AppContent, ProfileCheckWrapper).
 */
interface SessionContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // الاشتراك في تغيّر حالة المصادقة
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setIsLoading(false);
      }
    );

    // جلب الجلسة الابتدائية مرة واحدة
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user || null);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching initial session:', error);
        setIsLoading(false);
      });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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