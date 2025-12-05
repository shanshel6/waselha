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
}

export const useProfile = () => {
  const { user } = useSession();

  return useQuery<Profile | null, Error>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, phone, role')
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