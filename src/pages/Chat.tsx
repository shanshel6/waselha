"use client";

import React, { useEffect, useRef, useMemo, useState } from 'react';
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
import { Send, Plane, User, MessageSquare, DollarSign, Phone, AlertTriangle, Package } from 'lucide-react';
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

  // Mutation to update the chat read status
  const updateReadStatusMutation = useMutation({
    mutationFn: async (chatId: string) => {
      if (!user) return;
      
      const now = new Date().toISOString();
      
      // Try to update first (if status already exists)
      const { error: updateError, count } = await supabase
        .from('chat_read_status')
        .update({ last_read_at: now })
        .eq('chat_id', chatId)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();
        
      if (updateError) throw updateError;
      
      // If no row was updated, insert a new one
      if (!updateError && !count) {
        const { error: insertError } = await supabase
          .from('chat_read_status')
          .insert({ chat_id: chatId, user_id: user.id, last_read_at: now });
          
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      // Invalidate the unread count query to reflect the change immediately
      queryClient.invalidateQueries({ queryKey: ['unreadChatCount', user?.id] });
    },
    onError: (err: any) => {
      console.error("Failed to update read status:", err);
    }
  });

  // Query 1: Get the chat ID
  const { data: chatData, isLoading: isLoadingChat } = useQuery({
    queryKey: ['chatIdForRequest', requestId],
    queryFn: async () => {
      if (!requestId) return null;

      const { data, error } = await supabase
        .from('chats')
        .select('id, request_id')
        .eq('request_id', requestId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!requestId,
  });

  const chatId = chatData?.id;

  // Query 2: Get request details (now handles both regular and general order matches)
  const { data: itemDetails, isLoading: isLoadingDetails, error: detailsError } = useQuery({
    queryKey: ['itemDetailsForChat', requestId],
    queryFn: async () => {
      if (!requestId || !user) return null;

      // Fetch as a regular trip request (which now includes general order matches)
      const { data: request, error: requestError } = await supabase
        .from('requests')
        .select(`
          id, trip_id, sender_id, description, weight_kg, status, destination_city, receiver_details, tracking_status, created_at, general_order_id,
          trips( id, from_country, to_country, trip_date, user_id, free_kg )
        `)
        .eq('id', requestId)
        .single();

      if (requestError && requestError.code !== 'PGRST116') throw requestError;
      
      if (request) {
        const isCurrentUserSender = user.id === request.sender_id;
        const otherUserId = isCurrentUserSender ? request.trips?.user_id : request.sender_id;
        
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone')
          .eq('id', otherUserId)
          .single();

        return {
          type: 'trip_request',
          data: request,
          isCurrentUserSender,
          otherUser: otherProfile,
        };
      }

      // Fallback: If it's not a request, it might be an old general order ID used as a chat ID before refactoring.
      // We rely on the RLS policy to prevent unauthorized access if the chat ID is invalid.
      return null;
    },
    enabled: !!requestId && !!user,
  });

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

  // Calculate Price (only for trip requests)
  const priceCalculation = useMemo(() => {
    if (itemDetails?.type === 'trip_request') {
      const request = itemDetails.data;
      if (!request.trips) return null;
      return calculateShippingCost(
        request.trips.from_country,
        request.trips.to_country,
        request.weight_kg
      );
    }
    return null;
  }, [itemDetails]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!chatId) return;

    // 1. Update read status immediately upon entering the chat
    updateReadStatusMutation.mutate(chatId);

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
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
          
          // If the new message is from the other user, update read status immediately
          const newMessage = payload.new as { sender_id: string };
          if (newMessage.sender_id !== user?.id) {
            updateReadStatusMutation.mutate(chatId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient, user?.id]); // Added user?.id to dependencies

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

  const isLoading = isLoadingDetails || isLoadingChat;

  if (isLoading) {
    return <div className="container p-4 flex items-center justify-center h-full">{t('loading')}...</div>;
  }

  if (detailsError) {
    return <div className="container p-4 flex items-center justify-center h-full text-red-500">Error loading chat data: {detailsError.message}</div>;
  }

  if (!itemDetails) {
    return <div className="container p-4 flex items-center justify-center h-full">{t('tripDetailsNotAvailable')}</div>;
  }

  const otherUserName = itemDetails.otherUser ? `${itemDetails.otherUser.first_name || ''} ${itemDetails.otherUser.last_name || ''}`.trim() || t('user') : t('user');
  const otherUserPhone = itemDetails.otherUser?.phone || t('noPhoneProvided');
  
  const isTripRequest = itemDetails.type === 'trip_request';
  const request = isTripRequest ? itemDetails.data : null;

  // Since all matched orders are now trip requests, we rely on the request object
  const tripRoute = request?.trips 
    ? `${request.trips.from_country || t('undefined')} → ${request.trips.to_country || t('undefined')}` 
    : t('tripDetailsNotAvailable');
    
  const tripDate = request?.trips?.trip_date 
    ? format(new Date(request.trips.trip_date), 'PPP') 
    : t('dateNotSet');
    
  const priceDisplay = priceCalculation 
    ? `$${priceCalculation.totalPriceUSD.toFixed(2)} (${priceCalculation.totalPriceIQD.toLocaleString('en-US')} IQD)` 
    : t('calculatingPrice');
    
  const weightDisplay = request?.weight_kg 
    ? `${request.weight_kg} kg` 
    : t('weightNotSet');
    
  const trackingStatus = request?.tracking_status;
  const isAccepted = request?.status === 'accepted';
  const isGeneralOrderMatch = !!request?.general_order_id;

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
              <span>{otherUserName} ({itemDetails.isCurrentUserSender ? t('sender') : t('traveler')})</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary/80" />
              <span>{otherUserPhone}</span>
            </div>
          </div>
          
          {/* Item Details */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm text-muted-foreground mt-2 gap-2">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-primary/80" />
              <span>{tripRoute}</span>
              {request?.trips?.trip_date && (
                <span>({tripDate})</span>
              )}
            </div>
            <div className="flex items-center gap-2 font-semibold">
              <Package className="h-4 w-4 text-primary/80" />
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
          
          {/* Tracking Status */}
          {isAccepted && (
            <div className="mt-2 p-2 bg-primary/10 rounded-md text-sm font-medium text-primary flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('trackingStatus')}: {t(trackingStatus)}
            </div>
          )}
          
          {isGeneralOrderMatch && !isAccepted && (
            <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t('generalOrderTitle')} - {t('trackingWaitingApproval')}
            </div>
          )}
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
                      <Input 
                        placeholder={t('typeMessage')} 
                        {...field} 
                        autoComplete="off" 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={sendMessageMutation.isPending || !chatId || !isAccepted}>
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