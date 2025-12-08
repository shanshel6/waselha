"use client";

import React, { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getChatParticipants } from '@/utils/chat';
import { getFirstName } from '@/utils/profile'; // Import new utility

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

      // 2. Get chat details to find the request ID and participants
      const participants = await getChatParticipants(newMessage.chat_id);
      if (!participants) return;

      const { requestId, senderId, travelerId } = participants;
      
      // 3. Determine the recipient (the current user)
      const recipientId = user.id;
      
      // 4. Check if the current user is already on the chat page for this request
      if (currentPathRef.current === `/chat/${requestId}`) {
        return;
      }

      // 5. Get sender name
      const senderName = await getFirstName(newMessage.sender_id);
      const displaySenderName = senderName || t('user');

      // 6. Insert notification into the database
      await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          message: t('newChatMessageNotification', { name: displaySenderName }),
          link: `/chat/${requestId}`
        });
    };

    // We subscribe to all chat messages inserts.
    const channel = supabase.channel(`chat-messages-db-notifier`);
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          handleNewMessage(payload as { new: NewMessagePayload });
        }
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