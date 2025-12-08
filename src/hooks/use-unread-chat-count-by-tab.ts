import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import React from 'react';

interface UnreadCounts {
  sent: number;
  received: number;
}

export const useUnreadChatCountByTab = () => {
  const { user, session } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const fetchCounts = React.useCallback(async (): Promise<UnreadCounts> => {
    if (!userId || !session) return { sent: 0, received: 0 };

    // Fetch all chats the user is a participant in, along with the last read status
    const { data: chats, error } = await supabase
      .from('chats')
      .select(`
        id,
        request_id,
        chat_read_status(last_read_at),
        requests(
          sender_id,
          trips(user_id)
        )
      `)
      .or(`requests.sender_id.eq.${userId},requests.trips.user_id.eq.${userId}`);

    if (error) {
      console.error('Error fetching chats for unread count:', error);
      return { sent: 0, received: 0 };
    }

    let sentCount = 0;
    let receivedCount = 0;

    for (const chat of chats) {
      const chatId = chat.id;
      const lastReadAt = chat.chat_read_status?.[0]?.last_read_at || null;
      const request = chat.requests;

      if (!request) continue;

      // Determine if the current user is the sender or the traveler for this request
      const isSender = request.sender_id === userId;
      const isTraveler = request.trips?.user_id === userId;

      // Check for unread messages in this specific chat
      let messageQuery = supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .neq('sender_id', userId); // Only count messages from the other party

      if (lastReadAt) {
        messageQuery = messageQuery.gt('created_at', lastReadAt);
      }

      const { count: unreadCount, error: messageError } = await messageQuery;

      if (messageError) {
        console.error('Error fetching unread messages for chat:', messageError);
        continue;
      }

      if ((unreadCount || 0) > 0) {
        if (isSender) {
          sentCount++;
        } else if (isTraveler) {
          receivedCount++;
        }
      }
    }

    return { sent: sentCount, received: receivedCount };
  }, [userId, session]);

  const query = useQuery<UnreadCounts, Error>({
    queryKey: ['unreadChatCountByTab', userId],
    queryFn: fetchCounts,
    enabled: !!userId && !!session,
    initialData: { sent: 0, received: 0 },
  });

  // Real-time subscription to invalidate the query when a new message is inserted or read status changes
  React.useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`chat-status-by-tab-listener`);
    
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMessage = payload.new as { sender_id: string };
          if (newMessage.sender_id !== userId) {
            queryClient.invalidateQueries({ queryKey: ['unreadChatCountByTab', userId] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_read_status', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unreadChatCountByTab', userId] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time unread chat count by tab listener enabled.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
};