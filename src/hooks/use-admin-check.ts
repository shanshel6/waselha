import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useProfile } from './use-profile';

export const useAdminCheck = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  
  // Check if user is admin (either by profile flag or specific user ID)
  const isAdmin = !!user && (
    !!profile?.is_admin || 
    user.id === 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' // Fixed admin user ID
  );
  
  const isLoading = isSessionLoading || isLoadingProfile;

  return {
    isAdmin,
    isLoading,
  };
};