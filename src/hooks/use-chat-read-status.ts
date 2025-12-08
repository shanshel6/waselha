import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import React from 'react';

interface ChatReadStatus {
  hasUnread: boolean;
  lastReadAt: string | null;
}

/**
 * Hook to check if a specific chat has unread messages.
 * It relies on the 'get_unread_message_count' function which is optimized for total count,
 * but we can adapt the logic here for a single chat check.
 * 
 * For simplicity and performance, we will check if the chat_id exists in the chats table
 * and then check if there are any messages newer than the last read status.
 */
export const useChatReadStatus = (requestId: string | undefined) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery<ChatReadStatus, Error>({
    queryKey: ['chatReadStatus', requestId, userId],
    queryFn: async () => {
      if (!requestId || !userId) return { hasUnread: false, lastReadAt: null };

      // 1. Get Chat ID and Last Read Time
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select(`
          id,
          chat_read_status(last_read_at)
        `)
        .eq('request_id', requestId)
        .eq('chat_read_status.user_id', userId)
        .maybeSingle();

      if (chatError) throw chatError;
      
      const chatId = chatData?.id;
      const lastReadAt = chatData?.chat_read_status?.[0]?.last_read_at || null;

      if (!chatId) return { hasUnread: false, lastReadAt: null };

      // 2. Check for newer messages
      let messageQuery = supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .neq('sender_id', userId); // Only count messages from the other party

      if (lastReadAt) {
        messageQuery = messageQuery.gt('created_at', lastReadAt);
      }
      
      const { count: unreadCount, error: messageError } = await messageQuery;

      if (messageError) throw messageError;

      return {
        hasUnread: (unreadCount || 0) > 0,
        lastReadAt,
      };
    },
    enabled: !!requestId && !!userId,
    initialData: { hasUnread: false, lastReadAt: null },
  });
  
  // Real-time subscription to invalidate the query when a new message is inserted
  React.useEffect(() => {
    if (!userId || !requestId) return;

    // We need the chat ID to subscribe
    const chatData = queryClient.getQueryData(['chatIdForRequest', requestId]) as { id: string } | undefined;
    const chatId = chatData?.id;
    
    if (!chatId) return;

    const channel = supabase.channel(`chat-status-${chatId}`);
    
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const newMessage = payload.new as { sender_id: string };
          if (newMessage.sender_id !== userId) {
            queryClient.invalidateQueries({ queryKey: ['chatReadStatus', requestId, userId] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_read_status', filter: `chat_id=eq.${chatId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chatReadStatus', requestId, userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, requestId, queryClient]);

  return query;
};