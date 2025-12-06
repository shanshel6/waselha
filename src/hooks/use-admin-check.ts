import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useProfile } from './use-profile';

export const useAdminCheck = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();

  const isAdmin = !!user && !!profile?.is_admin;
  const isLoading = isSessionLoading || isLoadingProfile;

  return { isAdmin, isLoading };
};