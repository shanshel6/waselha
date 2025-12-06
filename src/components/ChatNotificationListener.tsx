"use client";

import React, { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { toast } from 'sonner';
import { MessageSquare, Plane } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getChatParticipants } from '@/utils/chat';

// Store active toast IDs keyed by requestId to manage dismissal
const activeChatToasts = new Map<string, string>();

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
      
      // 3. Check if the current user is a participant (should be, due to RLS, but good check)
      if (user.id !== senderId && user.id !== travelerId) {
        return;
      }

      // 4. Check if the user is already on the chat page for this request
      if (currentPathRef.current === `/chat/${requestId}`) {
        return;
      }

      // 5. Dismiss any existing toast for this chat
      if (activeChatToasts.has(requestId)) {
        toast.dismiss(activeChatToasts.get(requestId));
      }

      // 6. Show the new custom toast
      const toastId = toast.custom((tId) => (
        <Link 
          to={`/chat/${requestId}`} 
          onClick={() => {
            toast.dismiss(tId);
            activeChatToasts.delete(requestId);
          }}
          className="flex items-start gap-3 p-4 bg-card border rounded-lg shadow-lg hover:bg-accent transition-colors w-full max-w-sm"
        >
          <MessageSquare className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
          <div className="flex-grow">
            <p className="font-semibold text-sm">{t('newMessage')}</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {newMessage.content}
            </p>
            <p className="text-xs text-primary mt-2 flex items-center gap-1">
              <Plane className="h-3 w-3" />
              {t('viewChat')}
            </p>
          </div>
        </Link>
      ), {
        duration: 10000, // Keep it visible for 10 seconds
        onDismiss: () => activeChatToasts.delete(requestId),
        onAutoClose: () => activeChatToasts.delete(requestId),
      });

      activeChatToasts.set(requestId, toastId);
    };

    const channel = supabase.channel(`chat-messages:${user.id}`);
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
          console.log('Real-time chat notifications enabled.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, t]); // Dependency changed to user.id for stability

  return null;
};

export default ChatNotificationListener;