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

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const { session } = useSession();
  
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
      <div className="container mx-auto h-16 px-4 flex items-center justify-between">
        {/* Left side: main navigation links */}
        <div className="hidden md:flex items-center space-x-6 space-x-reverse">
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
            </Link>
          ))}
        </div>

        {/* Center: logo */}
        <Link to="/" className="flex-1 flex justify-center">
          <span className="flex items-center gap-2 text-2xl font-bold text-primary">
            <Send className="h-6 w-6" />
            وصلها
          </span>
        </Link>
        
        {/* Right side: user + notifications (desktop) and mobile menu */}
        <div className="flex items-center gap-2">
          {/* Desktop user/notifications */}
          <div className="hidden md:flex items-center gap-2">
            {session && <Notifications />}
            {session ? (
              <UserNav />
            ) : (
              <Link to="/login">
                <Button variant="ghost">{t('login')}</Button>
              </Link>
            )}
          </div>

          {/* Mobile menu */}
          <div className="md:hidden flex items-center">
            {session && (
              <div className="flex items-center gap-1">
                <Notifications />
              </div>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground ml-2">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[250px] sm:w-[300px] bg-background text-foreground dark:bg-gray-800"
              >
                <div className="flex flex-col space-y-4 p-4">
                  {mobileNavItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      className="text-lg hover:text-primary transition-colors flex items-center justify-between"
                    >
                      <span>{item.name}</span>
                    </Link>
                  ))}
                  <div className="pt-4 border-t">
                    {session ? (
                      <UserNav />
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
      </div>
    </nav>
  );
};

export default Navbar;