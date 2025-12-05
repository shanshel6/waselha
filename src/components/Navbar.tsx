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

const Navbar = () => {
  const { t } = useTranslation();
  const { session } = useSession();

  const navItems = [
    { name: t('home'), path: '/' },
    { name: t('trips'), path: '/trips' },
  ];

  const mobileNavItems = [
    ...navItems,
    ...(session ? [
      { name: t('myProfile'), path: '/my-profile' },
      { name: t('myRequests'), path: '/my-requests' },
      { name: t('myFlights'), path: '/trips' },
    ] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
          <Send className="h-6 w-6" />
          Waselha
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link key={item.name} to={item.path} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              {item.name}
            </Link>
          ))}
          {session ? (
            <div className="flex items-center gap-2">
              <Notifications />
              <UserNav />
            </div>
          ) : (
            <Link to="/login">
              <Button variant="ghost">{t('login')}</Button>
            </Link>
          )}
        </div>

        {/* Mobile Navigation */}
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
            <SheetContent side="right" className="w-[250px] sm:w-[300px] bg-background text-foreground dark:bg-gray-800">
              <div className="flex flex-col space-y-4 p-4">
                {mobileNavItems.map((item) => (
                  <Link key={item.name} to={item.path} className="text-lg hover:text-primary transition-colors">
                    {item.name}
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
    </nav>
  );
};

export default Navbar;