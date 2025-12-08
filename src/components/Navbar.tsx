"use client";
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Send } from 'lucide-react';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import UserNav from './UserNav';
import Notifications from './Notifications';
import { useUnreadChatCount } from '@/hooks/use-unread-chat-count';
import { Badge } from '@/components/ui/badge';

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const { session } = useSession();
  const { data: unreadCount = 0 } = useUnreadChatCount(); 
  
  const publicNavItems = [
    { name: t('home'), path: '/' },
    { name: t('trips'), path: '/trips' },
  ];
  
  const authenticatedNavItems = [
    { name: t('myRequests'), path: '/my-requests' },
  ];
  
  const mobileNavItems = [
    ...publicNavItems,
    ...(session ? [
      { name: t('myRequests'), path: '/my-requests' },
      { name: t('myFlights'), path: '/my-flights' },
      { name: t('myProfile'), path: '/my-profile' },
    ] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* RTL: نستخدم flex-row بحيث تكون بداية الـ flex (يمين) فيها الأيقونات، ثم الشعار، ثم القائمة على أقصى اليسار */}
      <div className="container mx-auto flex h-16 items-center justify-between px-4 flex-row">
        {/* Far right: notifications + user menu */}
        <div className="flex items-center gap-2">
          {session && <Notifications />}
          <UserNav />
        </div>

        {/* Center/right-ish: logo */}
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
          <Send className="h-6 w-6" />
          Waselha
        </Link>
        
        {/* Far left (desktop navigation) */}
        <div className="hidden md:flex items-center space-x-6">
          {publicNavItems.map((item) => (
            <Link 
              key={item.name} 
              to={item.path}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {item.name}
            </Link>
          ))}
          
          {session && authenticatedNavItems.map((item) => (
            <Link 
              key={item.name} 
              to={item.path}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary relative"
            >
              {item.name}
              {item.path === '/my-requests' && unreadCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-4 h-4 w-4 p-0 flex items-center justify-center text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Link>
          ))}
          
          {!session && (
            <Link to="/login">
              <Button variant="ghost">{t('login')}</Button>
            </Link>
          )}
        </div>
        
        {/* Mobile Navigation (menu button on the left side) */}
        <div className="md:hidden flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground ml-2">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[250px] sm:w-[300px] bg-background text-foreground dark:bg-gray-800">
              <div className="flex flex-col space-y-4 p-4">
                {mobileNavItems.map((item) => (
                  <Link 
                    key={item.name} 
                    to={item.path}
                    className="text-lg hover:text-primary transition-colors flex items-center justify-between"
                  >
                    <span>{item.name}</span>
                    {item.path === '/my-requests' && unreadCount > 0 && (
                      <Badge variant="destructive" className="h-5 px-2">
                        {unreadCount}
                      </Badge>
                    )}
                  </Link>
                ))}
                
                <div className="pt-4 border-t">
                  {session ? (
                    <div className="flex items-center justify-between">
                      <UserNav />
                      <Notifications />
                    </div>
                  ) : (
                    <Link to="/login">
                      <Button className="w-full">{t('login')}</Button>
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;