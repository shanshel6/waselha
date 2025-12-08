"use client";

import React, { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getFirstName } from '@/utils/profile';

interface NewMessagePayload {
  chat_id: string;
  sender_id: string;
  content: string;
}

const ChatNotificationListener = () => {
  const { user } = useSession();
  const { t } = useTranslation();
  const location = useLocation();
  const currentPathRef = useRef(location.pathname);

  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!user?.id) return;

    const handleNewMessage = async (payload: { new: NewMessagePayload }) => {
      const newMessage = payload.new;

      // 1. Ignore messages sent by the current user
      if (newMessage.sender_id === user.id) {
        return;
      }

      // 2. Resolve the related request_id directly from the chats table
      const { data: chatRow, error: chatError } = await supabase
        .from('chats')
        .select('request_id')
        .eq('id', newMessage.chat_id)
        .maybeSingle();

      if (chatError) {
        console.error('Chat notification: failed to load chat row:', chatError);
        return;
      }

      const requestId = chatRow?.request_id as string | undefined;
      if (!requestId) {
        console.error('Chat notification: chat row has no request_id');
        return;
      }

      // 3. If the user is already on the chat page for this request, skip creating a notification
      if (currentPathRef.current === `/chat/${requestId}`) {
        return;
      }

      // 4. Get sender's first name for the notification message
      const senderName = await getFirstName(newMessage.sender_id);
      const displaySenderName = senderName || t('user');

      // 5. Insert notification into the database
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          message: t('newChatMessageNotification', { name: displaySenderName }),
          link: `/chat/${requestId}`,
        });

      if (insertError) {
        console.error('Chat notification: failed to insert notification:', insertError);
      }
    };

    // Subscribe to all chat_messages inserts
    const channel = supabase.channel('chat-messages-db-notifier');
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          handleNewMessage(payload as { new: NewMessagePayload });
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time chat DB notification listener enabled.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, t]);

  return null;
};

export default ChatNotificationListener;