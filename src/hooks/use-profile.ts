import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: 'traveler' | 'sender' | 'both';
  is_verified: boolean;
  is_admin: boolean; // Added is_admin
  address: string | null;
  updated_at: string | null;
}

export const useProfile = () => {
  const { user } = useSession();

  return useQuery<Profile | null, Error>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, phone, role, is_verified, is_admin, address, updated_at') // Included is_admin
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found (new user)
        throw new Error(error.message);
      }
      
      return data || null;
    },
    enabled: !!user?.id,
  });
};