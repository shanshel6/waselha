"use client";

import React, { useEffect, useState, useRef } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Send, Plane, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const messageSchema = z.object({
  content: z.string().min(1),
});

const Chat = () => {
  const { t } = useTranslation();
  const { requestId } = useParams();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chatId, setChatId] = useState<string | null>(null);

  const { data: requestData, isLoading: isLoadingRequest } = useQuery({
    queryKey: ['chatRequest', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          trip:trips(*, traveler:profiles(first_name, last_name)),
          sender:profiles(first_name, last_name)
        `)
        .eq('id', requestId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!requestId,
  });

  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      if (!chatId) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!chatId,
  });

  useEffect(() => {
    const fetchChatId = async () => {
      if (!requestId) return;
      const { data, error } = await supabase
        .from('chats')
        .select('id')
        .eq('request_id', requestId)
        .single();
      if (error) {
        console.error('Error fetching chat ID:', error);
      } else if (data) {
        setChatId(data.id);
      }
    };
    fetchChatId();
  }, [requestId]);

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`public:chat_messages:chat_id=eq.${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          queryClient.setQueryData(['messages', chatId], (oldData: any) => {
            return oldData ? [...oldData, payload.new] : [payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: '' },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (values: z.infer<typeof messageSchema>) => {
      if (!chatId || !user) throw new Error('Chat not ready');
      const { error } = await supabase.from('chat_messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        content: values.content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      form.reset();
    },
    onError: (err: any) => {
      showError(err.message);
    },
  });

  const otherUser = requestData?.trip.traveler.id === user?.id ? requestData?.sender : requestData?.trip.traveler;

  if (isLoadingRequest || isLoadingMessages) {
    return <div className="container p-4">{t('loading')}...</div>;
  }

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-80px)]">
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {otherUser?.first_name} {otherUser?.last_name}
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            {requestData?.trip.from_country} → {requestData?.trip.to_country}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto p-4 space-y-4">
          {messages?.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex flex-col',
                message.sender_id === user?.id ? 'items-end' : 'items-start'
              )}
            >
              <div
                className={cn(
                  'max-w-xs md:max-w-md p-3 rounded-lg',
                  message.sender_id === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <p>{message.content}</p>
              </div>
              <span className="text-xs text-muted-foreground mt-1">
                {format(new Date(message.created_at), 'p')}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="p-4 border-t">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((d) => sendMessageMutation.mutate(d))}
              className="flex gap-2"
            >
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormControl>
                      <Input placeholder={t('typeMessage')} {...field} autoComplete="off" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={sendMessageMutation.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </Form>
        </div>
      </Card>
    </div>
  );
};

export default Chat;