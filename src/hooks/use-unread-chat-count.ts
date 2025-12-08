import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import React from 'react';

const UNREAD_COUNT_FUNCTION_NAME = 'unread-chat-count';

export const useUnreadChatCount = () => {
  const { user, session } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const fetchCount = React.useCallback(async () => {
    if (!userId || !session) return 0;

    // We use the invoke method which automatically handles the Authorization header
    const { data, error } = await supabase.functions.invoke(UNREAD_COUNT_FUNCTION_NAME);

    if (error) {
      console.error('Error fetching unread chat count:', error);
      // If the function fails, we return 0 but don't throw to avoid crashing the UI
      return 0;
    }

    return data?.unread_count || 0;
  }, [userId, session]);

  const query = useQuery<number, Error>({
    queryKey: ['unreadChatCount', userId],
    queryFn: fetchCount,
    enabled: !!userId && !!session,
    initialData: 0,
  });

  // Real-time subscription to invalidate the query when a new message is inserted
  React.useEffect(() => {
    if (!userId) return;

    // We subscribe to all chat messages inserts. The Edge Function handles filtering.
    const channel = supabase.channel(`unread-messages-listener`);
    
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          // Check if the message was sent by someone else
          const newMessage = payload.new as { sender_id: string };
          if (newMessage.sender_id !== userId) {
            // Invalidate the query to trigger a refetch of the count
            queryClient.invalidateQueries({ queryKey: ['unreadChatCount', userId] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_read_status', filter: `user_id=eq.${userId}` },
        () => {
          // Invalidate if our read status changes (e.g., when entering a chat)
          queryClient.invalidateQueries({ queryKey: ['unreadChatCount', userId] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time unread chat count listener enabled.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
};