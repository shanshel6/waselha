"use client";

import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useTranslation } from 'react-i18next';
import { getFirstName } from '@/utils/profile';

/**
 * This component periodically scans for chats that have unread messages
 * for the current user and ensures there is at least one notification
 * row per such chat in the `notifications` table.
 *
 * This guarantees that the bell icon will always reflect unread chats,
 * even if the real-time listener path fails for some reason.
 */
const ChatUnreadNotificationBridge: React.FC = () => {
  const { user } = useSession();
  const { t } = useTranslation();

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const syncUnreadChatsToNotifications = async () => {
      if (cancelled) return;

      // 1) Find all chats where the current user is a participant
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select(`
          id,
          request_id,
          requests(
            sender_id,
            trips(user_id)
          )
        `);

      if (chatsError) {
        console.error('ChatUnreadNotificationBridge: error fetching chats:', chatsError);
        return;
      }

      if (!chats || chats.length === 0) return;

      // 2) For each chat, decide if the current user participates
      type ChatRow = {
        id: string;
        request_id: string;
        requests: {
          sender_id: string;
          trips: { user_id: string } | null;
        } | null;
      };

      const participantChats = (chats as ChatRow[]).filter((chat) => {
        const req = chat.requests;
        if (!req) return false;

        const isSender = req.sender_id === user.id;
        const isTraveler = !!req.trips && req.trips.user_id === user.id;
        return isSender || isTraveler;
      });

      if (participantChats.length === 0) return;

      // 3) For each participating chat, see if there are unread messages
      for (const chat of participantChats) {
        if (cancelled) break;

        const chatId = chat.id;
        const requestId = chat.request_id;
        const req = chat.requests!;
        const otherUserId =
          req.sender_id === user.id
            ? req.trips?.user_id || null
            : req.sender_id;

        // Last read timestamp for this user in this chat
        const { data: readStatus, error: readError } = await supabase
          .from('chat_read_status')
          .select('last_read_at')
          .eq('chat_id', chatId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (readError) {
          console.error('ChatUnreadNotificationBridge: error fetching read status:', readError);
          continue;
        }

        const lastReadAt = readStatus?.last_read_at as string | null;

        // Count messages from other user after last_read_at (or all if never read)
        let msgQuery = supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('chat_id', chatId)
          .neq('sender_id', user.id);

        if (lastReadAt) {
          msgQuery = msgQuery.gt('created_at', lastReadAt);
        }

        const { count: unreadCount, error: msgError } = await msgQuery;

        if (msgError) {
          console.error('ChatUnreadNotificationBridge: error counting messages:', msgError);
          continue;
        }

        if (!unreadCount || unreadCount === 0) {
          // No unread messages → nothing to notify
          continue;
        }

        // 4) Ensure there is at least one notification row for this chat/request
        const { data: existingNotifs, error: notifError } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('link', `/chat/${requestId}`)
          .limit(1);

        if (notifError) {
          console.error('ChatUnreadNotificationBridge: error checking notifications:', notifError);
          continue;
        }

        if (existingNotifs && existingNotifs.length > 0) {
          // Already have a notification pointing to this chat
          continue;
        }

        // 5) Create a new notification
        let displayName = t('user');
        if (otherUserId) {
          const firstName = await getFirstName(otherUserId);
          if (firstName) {
            displayName = firstName;
          }
        }

        const { error: insertError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            message: t('newChatMessageNotification', { name: displayName }),
            link: `/chat/${requestId}`,
          });

        if (insertError) {
          console.error('ChatUnreadNotificationBridge: error inserting notification:', insertError);
        }
      }
    };

    // Initial run
    void syncUnreadChatsToNotifications();

    // Optionally, re-run when visibility changes (e.g., tab refocus)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncUnreadChatsToNotifications();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user?.id, t]);

  return null;
};

export default ChatUnreadNotificationBridge;