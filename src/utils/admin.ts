import { supabase } from '@/integrations/supabase/client';

const ADMIN_USER_LOOKUP_URL = 'https://wqcmmjggxsducsbtyjaz.supabase.co/functions/v1/admin-user-lookup';

export async function fetchAdminEmails(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};

  try {
    const { data, error } = await supabase.functions.invoke('admin-user-lookup', {
      body: { userIds },
    });

    if (error) {
      console.error('Error invoking admin-user-lookup function:', error);
      throw new Error('Failed to fetch admin emails via Edge Function.');
    }

    if (data && data.emailMap) {
      return data.emailMap as Record<string, string>;
    }
    
    return {};

  } catch (e) {
    console.error('Network or parsing error during admin email lookup:', e);
    return {};
  }
}