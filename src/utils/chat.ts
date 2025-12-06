import { supabase } from '@/integrations/supabase/client';

export async function getChatParticipants(chatId: string) {
  const { data: chat, error } = await supabase
    .from('chats')
    .select(`
      request_id,
      requests(
        sender_id,
        trips(user_id)
      )
    `)
    .eq('id', chatId)
    .single();

  if (error || !chat || !chat.requests || !chat.requests.trips) {
    return null;
  }

  const senderId = chat.requests.sender_id;
  const travelerId = chat.requests.trips.user_id;
  const requestId = chat.request_id;

  return { senderId, travelerId, requestId };
}