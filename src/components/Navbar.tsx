"use client";

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import UserNav from './UserNav';
import Notifications from './Notifications';
import { cn } from '@/lib/utils';

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const { session } = useSession();
  const location = useLocation();

  const publicNavItems = [
    { name: t('home'), path: '/' },
    { name: t('trips'), path: '/trips' },
  ];

  const authenticatedNavItems = [
    { name: t('myRequests'), path: '/my-requests' },
  ];

  const mobileNavItems = [
    ...publicNavItems,
    ...(session
      ? [
          { name: t('myRequests'), path: '/my-requests' },
          { name: t('myFlights'), path: '/my-flights' },
          { name: t('myProfile'), path: '/my-profile' },
        ]
      : []),
  ];

  const isActive = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-3 sm:px-4">
        {/* Left: desktop nav links */}
        <div className="hidden md:flex items-center gap-4">
          {publicNavItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <span
                className={cn(
                  'text-sm font-medium transition-colors px-2 py-1 rounded-full',
                  isActive(item.path)
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                )}
              >
                {item.name}
              </span>
            </Link>
          ))}

          {session &&
            authenticatedNavItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <span
                  className={cn(
                    'text-sm font-medium transition-colors px-2 py-1 rounded-full',
                    isActive(item.path)
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                  )}
                >
                  {item.name}
                </span>
              </Link>
            ))}
        </div>

        {/* Center: brand (text-only capsule) */}
        <Link to="/" className="flex-1 flex justify-center">
          <div className="inline-flex items-center rounded-full bg-muted/70 px-4 py-1.5 border border-border/60 shadow-sm">
            <span className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
              وصلها
            </span>
          </div>
        </Link>

        {/* Right: desktop user / notifications + mobile menu */}
        <div className="flex items-center gap-1">
          {/* Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {session && <Notifications />}
            {session ? (
              <UserNav />
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm" className="rounded-full">
                  {t('login')}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-1">
            {session && <Notifications />}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full border border-border/60 bg-background/80"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[260px] sm:w-[300px] bg-background/95 backdrop-blur-md border-r border-border/60"
              >
                <div className="mt-4 mb-6 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-full bg-muted/70 px-3 py-1 border border-border/60">
                    <span className="text-base font-semibold text-foreground">
                      وصلها
                    </span>
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  {mobileNavItems.map((item) => (
                    <Link key={item.path} to={item.path}>
                      <div
                        className={cn(
                          'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive(item.path)
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="mt-6 border-t pt-4">
                  {session ? (
                    <UserNav />
                  ) : (
                    <Link to="/login">
                      <Button className="w-full rounded-full">{t('login')}</Button>
                    </Link>
                  )}
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