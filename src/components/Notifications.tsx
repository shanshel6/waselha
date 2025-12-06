"use client";

import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Bell, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/utils/toast';
import { Separator } from '@/components/ui/separator';

const Notifications = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const queryKey = ['notifications', user?.id];

  const { data: notifications } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user?.id); // Ensure user can only delete their own
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
    onError: (err: any) => {
      showError(t('notificationDeleteError'));
      console.error("Error deleting notification:", err);
    }
  });

  const deleteAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey });
      showSuccess(t('allNotificationsCleared'));
    },
    onError: (err: any) => {
      showError(t('notificationDeleteError'));
      console.error("Error clearing all notifications:", err);
    }
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`public:notifications:user_id=eq.${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          // Invalidate the query to update the list in the popover
          queryClient.invalidateQueries({ queryKey: queryKey });
          
          // Show a real-time toast alert to the user
          const newNotification = payload.new as { message: string };
          if (newNotification.message) {
            showSuccess(newNotification.message);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, queryKey]);

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const handleNotificationClick = (notificationId: string, link: string | null) => {
    // Immediately delete the notification upon click
    deleteNotificationMutation.mutate(notificationId);
    
    // Navigate if a link exists
    if (link) {
      // Note: Navigation is handled by the Link component, but we ensure deletion happens.
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs" variant="destructive">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="p-2">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium leading-none">{t('notifications')}</h4>
            {notifications && notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => deleteAllNotificationsMutation.mutate()}
                disabled={deleteAllNotificationsMutation.isPending}
                className="text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {t('clearAll')}
              </Button>
            )}
          </div>
          <Separator className="mb-4" />
          {notifications && notifications.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {notifications.map(notification => (
                <Link
                  key={notification.id}
                  to={notification.link || '#'}
                  className={`block p-2 rounded-md hover:bg-accent ${!notification.is_read ? 'bg-accent/50 font-medium' : 'text-muted-foreground'}`}
                  onClick={() => handleNotificationClick(notification.id, notification.link)}
                >
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">{t('noNotifications')}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default Notifications;