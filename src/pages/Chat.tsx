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
import { Send, Plane, User, MessageSquare, DollarSign, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateShippingCost } from '@/lib/pricing';

const messageSchema = z.object({
  content: z.string().min(1),
});

const Chat = () => {
  const { t } = useTranslation();
  const { requestId } = useParams();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Query 1: Get the request details (traveler, sender, trip)
  const { data: requestData, isLoading: isLoadingRequest, error: requestError } = useQuery({
    queryKey: ['requestDetailsForChat', requestId],
    queryFn: async () => {
      if (!requestId || !user) return null;
      
      // First get the request with all related data
      const { data: request, error: requestError } = await supabase
        .from('requests')
        .select(`
          id,
          trip_id,
          sender_id,
          description,
          weight_kg,
          status,
          destination_city,
          receiver_details,
          created_at,
          trips(
            id,
            from_country,
            to_country,
            trip_date,
            user_id,
            free_kg
          )
        `)
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;
      if (!request) return null;

      // Get sender profile
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .eq('id', request.sender_id)
        .single();

      // Get traveler profile
      const { data: travelerProfile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .eq('id', request.trips?.user_id)
        .single();

      return {
        ...request,
        sender: senderProfile,
        traveler: travelerProfile
      };
    },
    enabled: !!requestId && !!user,
  });

  // Query 2: Get the chat ID
  const { data: chatData, isLoading: isLoadingChat } = useQuery({
    queryKey: ['chatIdForRequest', requestId],
    queryFn: async () => {
      if (!requestId) return null;
      const { data, error } = await supabase
        .from('chats')
        .select('id')
        .eq('request_id', requestId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!requestId,
  });

  const chatId = chatData?.id;

  // Query 3: Get messages, only enabled when we have a chat ID
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

  // Calculate Price
  const priceCalculation = useMemo(() => {
    if (!requestData || !requestData.trips) return null;
    return calculateShippingCost(
      requestData.trips.from_country,
      requestData.trips.to_country,
      requestData.weight_kg
    );
  }, [requestData]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`public:chat_messages:chat_id=eq.${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);

  // Scroll to the bottom of the messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: ''
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (values: z.infer<typeof messageSchema>) => {
      if (!chatId || !user) throw new Error('Chat not ready');
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content: values.content,
        });
      if (error) throw error;
    },
    onMutate: async (newMessage) => {
      await queryClient.cancelQueries({ queryKey: ['messages', chatId] });
      const previousMessages = queryClient.getQueryData(['messages', chatId]);
      queryClient.setQueryData(['messages', chatId], (old: any[] | undefined) => {
        const optimisticMessage = {
          id: Date.now(),
          chat_id: chatId,
          sender_id: user?.id,
          content: newMessage.content,
          created_at: new Date().toISOString(),
        };
        return old ? [...old, optimisticMessage] : [optimisticMessage];
      });
      return { previousMessages };
    },
    onError: (err: any, newMessage, context) => {
      showError(err.message);
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', chatId], context.previousMessages);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      form.reset();
    },
  });

  const isLoading = isLoadingRequest || isLoadingChat;

  if (isLoading) {
    return <div className="container p-4 flex items-center justify-center h-full">{t('loading')}...</div>;
  }

  if (requestError) {
    return <div className="container p-4 flex items-center justify-center h-full text-red-500">Error loading chat data: {requestError.message}</div>;
  }

  if (!requestData) {
    return <div className="container p-4 flex items-center justify-center h-full">{t('tripDetailsNotAvailable')}</div>;
  }

  // Determine the other user based on who is viewing the chat
  const isCurrentUserSender = user?.id === requestData.sender_id;
  const isCurrentUserTraveler = user?.id === requestData.trips?.user_id;
  const otherUser = isCurrentUserSender ? requestData.traveler : requestData.sender;
  
  const otherUserName = otherUser 
    ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || t('user')
    : t('user');
    
  const otherUserPhone = otherUser?.phone || t('noPhoneProvided');
  
  const tripRoute = requestData.trips 
    ? `${requestData.trips.from_country || t('undefined')} → ${requestData.trips.to_country || t('undefined')}`
    : t('tripDetailsNotAvailable');
    
  const tripDate = requestData.trips?.trip_date 
    ? format(new Date(requestData.trips.trip_date), 'PPP')
    : t('dateNotSet');
    
  const priceDisplay = priceCalculation 
    ? `$${priceCalculation.totalPriceUSD.toFixed(2)} (${priceCalculation.totalPriceIQD.toLocaleString('en-US')} IQD)`
    : t('calculatingPrice');
    
  const weightDisplay = requestData.weight_kg 
    ? `${requestData.weight_kg} kg`
    : t('weightNotSet');

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-80px)]">
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b p-4">
          <CardTitle className="text-xl">
            {t('chattingWith')}: {otherUserName}
          </CardTitle>
          
          {/* User Details */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm text-muted-foreground mt-2 gap-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary/80" />
              <span>{otherUserName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary/80" />
              <span>{otherUserPhone}</span>
            </div>
          </div>
          
          {/* Trip Details */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm text-muted-foreground mt-2 gap-2">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-primary/80" />
              <span>{tripRoute}</span>
              {requestData.trips?.trip_date && (
                <span>({tripDate})</span>
              )}
            </div>
            <div className="flex items-center gap-2 font-semibold">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span>{t('packageWeightKg')}: {weightDisplay}</span>
            </div>
          </div>
          
          {/* Price Details */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm text-muted-foreground mt-2 gap-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{t('estimatedCost')}:</span>
              <span>{priceDisplay}</span>
            </div>
            {priceCalculation && (
              <div className="flex items-center gap-2 text-xs">
                <span>{t('pricePerKg')}: ${priceCalculation.pricePerKgUSD.toFixed(2)}</span>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow overflow-y-auto p-4 flex flex-col">
          {isLoadingMessages ? (
            <div className="m-auto text-center text-muted-foreground">{t('loading')}...</div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-4 mt-auto">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={cn(
                    'flex flex-col w-fit max-w-[75%]',
                    message.sender_id === user?.id ? 'ml-auto items-end' : 'mr-auto items-start'
                  )}
                >
                  <div 
                    className={cn(
                      'p-3 rounded-lg',
                      message.sender_id === user?.id ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                    )}
                  >
                    <p className="break-words">{message.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 px-1">
                    {format(new Date(message.created_at), 'p')}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="m-auto text-center text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-semibold">{t('noMessagesYet')}</p>
              <p>{t('startTheConversation')}</p>
            </div>
          )}
        </CardContent>
        
        <div className="p-4 border-t bg-background">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => sendMessageMutation.mutate(d))} className="flex gap-2">
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
              <Button type="submit" disabled={sendMessageMutation.isPending || !chatId}>
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