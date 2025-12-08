import { supabase } from '@/integrations/supabase/client';

export async function getFirstName(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', userId)
    .single();

  if (error) {
    console.error("Error fetching profile name:", error);
    return null;
  }
  
  return data?.first_name || null;
}