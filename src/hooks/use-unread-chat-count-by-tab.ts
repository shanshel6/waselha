"use client";

import React, { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';

interface UnreadCounts {
  sent: number;
  received: number;
}

/**
 * Optimized unread chat counts:
 * - Single aggregated query against chat_messages/chats/requests/chat_read_status
 *   instead of looping and querying per chat.
 * - Still listens in real-time to chat_messages & chat_read_status to invalidate cache.
 */
export const useUnreadChatCountByTab = () => {
  const { user, session } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const fetchCounts = useCallback(async (): Promise<UnreadCounts> => {
    if (!userId || !session) {
      return { sent: 0, received: 0 };
    }

    // We aggregate unread messages in SQL-style using Supabase joins:
    // - Only messages not sent by user
    // - Only messages created after last_read_at OR where no read row exists
    // - Then split into "sent" (user is sender) vs "received" (user is traveler)
    const { data, error } = await supabase
      .from('chat_messages')
      .select(
        `
        id,
        chat_id,
        sender_id,
        created_at,
        chats (
          id,
          request_id,
          requests (
            sender_id,
            trips ( user_id )
          )
        ),
        chat_read_status (
          user_id,
          last_read_at
        )
      `
      );

    if (error) {
      console.error('useUnreadChatCountByTab: aggregated query error:', error);
      return { sent: 0, received: 0 };
    }

    if (!data || data.length === 0) {
      return { sent: 0, received: 0 };
    }

    let sent = 0;
    let received = 0;

    for (const row of data as any[]) {
      const chat = row.chats;
      const req = chat?.requests;
      const trips = req?.trips;

      if (!chat || !req || !trips) continue;

      const isSenderParticipant = req.sender_id === userId;
      const isTravelerParticipant = trips.user_id === userId;
      if (!isSenderParticipant && !isTravelerParticipant) continue;

      // Ignore messages we sent ourselves
      if (row.sender_id === userId) continue;

      // Determine last_read_at for this user in this chat (if exists)
      const readRows = row.chat_read_status as { user_id: string; last_read_at: string | null }[] | null;
      const readRowForUser = readRows?.find((r) => r.user_id === userId) || null;
      const lastReadAt = readRowForUser?.last_read_at;

      const createdAt = new Date(row.created_at).getTime();
      const isUnread =
        !lastReadAt || createdAt > new Date(lastReadAt).getTime();

      if (!isUnread) continue;

      if (isSenderParticipant) {
        sent += 1;
      } else if (isTravelerParticipant) {
        received += 1;
      }
    }

    return { sent, received };
  }, [userId, session]);

  const query = useQuery<UnreadCounts, Error>({
    queryKey: ['unreadChatCountByTab', userId],
    queryFn: fetchCounts,
    enabled: !!userId && !!session,
    initialData: { sent: 0, received: 0 },
  });

  // Real-time subscription to invalidate the query when a new message is inserted or read status changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`chat-status-by-tab-listener`);

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMessage = payload.new as { sender_id: string };
          if (newMessage.sender_id !== userId) {
            queryClient.invalidateQueries({
              queryKey: ['unreadChatCountByTab', userId],
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_read_status',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['unreadChatCountByTab', userId],
          });
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