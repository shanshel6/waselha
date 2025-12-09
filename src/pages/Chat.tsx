"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showError } from '@/utils/toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import {
  Send,
  Plane,
  User,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  Package,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateShippingCost } from '@/lib/pricing';

const messageSchema = z.object({
  content: z.string().min(1),
});

interface Trip {
  id: string;
  user_id: string;
  from_country: string;
  to_country: string;
  trip_date: string;
  free_kg: number;
}

interface RequestRow {
  id: string;
  sender_id: string;
  description: string;
  weight_kg: number;
  destination_city: string;
  receiver_details: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  trips: Trip | null;
}

interface MessageRow {
  id: number;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface ChatRow {
  id: string;
  request_id: string;
}

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

const Chat: React.FC = () => {
  const { t } = useTranslation();
  const { requestId } = useParams();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: '' },
  });

  // 1) طلب + رحلة
  const {
    data: requestData,
    isLoading: isRequestLoading,
    error: requestError,
  } = useQuery<RequestRow | null, Error>({
    queryKey: ['chatRequest', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      if (!requestId) return null;

      const { data, error } = await supabase
        .from('requests')
        .select(
          `
          id,
          sender_id,
          description,
          weight_kg,
          destination_city,
          receiver_details,
          status,
          created_at,
          trips (*)
        `
        )
        .eq('id', requestId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as RequestRow;
    },
  });

  // 2) صف الدردشة لهذا الطلب
  const { data: chatRow } = useQuery<ChatRow | null, Error>({
    queryKey: ['chatRow', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      if (!requestId) return null;

      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('request_id', requestId)
        .maybeSingle();

      if (error) throw error;
      return data as ChatRow | null;
    },
  });

  // 3) الطرف الآخر: إذا كنت المرسل، الآخر هو المسافر؛ وإذا كنت المسافر، الآخر هو المرسل
  const otherUserId = useMemo(() => {
    if (!user || !requestData?.trips) return null;
    const isSender = user.id === requestData.sender_id;
    return isSender ? requestData.trips.user_id : requestData.sender_id;
  }, [user, requestData]);

  const { data: otherProfile } = useQuery<ProfileRow | null, Error>({
    queryKey: ['chatOtherProfile', otherUserId],
    enabled: !!otherUserId,
    queryFn: async () => {
      if (!otherUserId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', otherUserId)
        .maybeSingle();

      if (error) throw error;
      return data as ProfileRow | null;
    },
  });

  // 4) الرسائل
  const { data: messages } = useQuery<MessageRow[], Error>({
    queryKey: ['chatMessages', chatRow?.id],
    enabled: !!chatRow?.id,
    queryFn: async () => {
      if (!chatRow?.id) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatRow.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as MessageRow[];
    },
  });

  // Mark as read
  useEffect(() => {
    const markAsRead = async () => {
      if (!chatRow?.id || !user?.id) return;

      const { error } = await supabase
        .from('chat_read_status')
        .upsert(
          {
            chat_id: chatRow.id,
            user_id: user.id,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: 'chat_id,user_id' }
        );

      if (error) {
        console.error('Error marking chat as read:', error);
      } else {
        queryClient.invalidateQueries({ queryKey: ['unreadChatCount'] });
        queryClient.invalidateQueries({ queryKey: ['unreadChatCountByTab'] });
      }
    };

    void markAsRead();
  }, [chatRow?.id, user?.id, queryClient]);

  // Scroll to bottom on messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!chatRow?.id) return;

    const channel = supabase
      .channel(`chat-${chatRow.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatRow.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chatMessages', chatRow.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRow?.id, queryClient]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!chatRow?.id || !user?.id) throw new Error('Chat not ready');
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatRow.id,
          sender_id: user.id,
          content,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      form.reset({ content: '' });
      if (chatRow?.id) {
        queryClient.invalidateQueries({ queryKey: ['chatMessages', chatRow.id] });
      }
    },
    onError: (err: any) => {
      console.error(err);
      showError(err.message || 'Failed to send message');
    },
  });

  const onSubmit = (values: z.infer<typeof messageSchema>) => {
    if (!values.content.trim()) return;
    sendMessageMutation.mutate(values.content.trim());
  };

  // اسم الطرف الآخر من البروفايل (أو fallback)
  const otherPartyName = useMemo(() => {
    if (otherProfile) {
      const full =
        `${otherProfile.first_name || ''} ${otherProfile.last_name || ''}`.trim();
      if (full) return full;
    }
    return t('user');
  }, [otherProfile, t]);

  const priceCalculation = useMemo(() => {
    if (!requestData?.trips) return null;
    return calculateShippingCost(
      requestData.trips.from_country,
      requestData.trips.to_country,
      requestData.weight_kg
    );
  }, [requestData]);

  const priceDisplay = priceCalculation
    ? `$${priceCalculation.totalPriceUSD.toFixed(2)}`
    : '';

  if (isRequestLoading) {
    return (
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] flex items-center justify-center">
        <MessageSquare className="h-6 w-6 animate-pulse text-primary" />
      </div>
    );
  }

  if (requestError || !requestData) {
    return (
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] flex flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-destructive text-sm">
          {requestError?.message || 'Unable to load chat.'}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] flex flex-col gap-4">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <MessageSquare className="h-5 w-5 text-primary" />
              {t('chattingWith')} {otherPartyName}
            </CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Plane className="h-3 w-3" />
              {requestData.trips?.from_country} ← {requestData.trips?.to_country}
              {requestData.trips?.trip_date && (
                <>
                  <span className="mx-1">•</span>
                  {format(new Date(requestData.trips.trip_date), 'PPP')}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1 text-xs">
            {priceDisplay && (
              <span className="flex items-center gap-1 text-foreground font-medium">
                <DollarSign className="h-3 w-3 text-primary" />
                {priceDisplay}
              </span>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Main area */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 flex-1 min-h-[60vh]">
        {/* Messages */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('viewChat')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {messages && messages.length > 0 ? (
                messages.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        'flex w-full',
                        isMine ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-lg px-3 py-2 text-xs',
                          isMine
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {m.content}
                        </p>
                        <p className="text-[10px] mt-1 opacity-70 text-right">
                          {format(new Date(m.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
                  <Package className="h-5 w-5" />
                  <span>{t('noMessagesYet')}</span>
                  <span>{t('startTheConversation')}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="pt-3 border-t mt-3">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="flex items-center gap-2"
                >
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem className="flex-1 mb-0">
                        <FormControl>
                          <Input
                            placeholder={t('typeMessage')}
                            {...field}
                            autoComplete="off"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={sendMessageMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </Form>
            </div>
          </CardContent>
        </Card>

        {/* Request summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('packageDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="font-medium">{requestData.description}</p>
            <p className="text-muted-foreground flex items-center gap-1">
              <Plane className="h-3 w-3" />
              {requestData.weight_kg} kg
            </p>
            <p className="text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {requestData.destination_city}
            </p>
            <p className="text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              {requestData.receiver_details}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Chat;