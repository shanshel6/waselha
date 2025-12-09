"use client";

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Briefcase } from 'lucide-react';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import UserNav from './UserNav';
import Notifications from './Notifications';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/use-profile';

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const { session } = useSession();
  const location = useLocation();
  const { data: profile } = useProfile();

  // Public navigation (top center)
  const publicNavItems = [
    { name: t('home'), path: '/' },
    { name: t('trips'), path: '/trips' },
    { name: t('myRequests'), path: '/my-requests' }, // "طلباتي" بجانب "الرحلات"
    { name: 'عن وصلها', path: '/about' },
  ];

  // For mobile sidebar we still show profile-related links when logged in
  const mobileNavItems = [
    ...publicNavItems,
    ...(session
      ? [
          { name: t('myFlights'), path: '/my-flights' },
          { name: t('myProfile'), path: '/my-profile' },
        ]
      : []),
  ];

  const isActive = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);

  const Brand = () => (
    <div className="inline-flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Briefcase className="h-5 w-5" />
      </div>
      <span className="text-xl font-extrabold tracking-tight text-primary">
        وصلها
      </span>
    </div>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center px-3 sm:px-4">
        {/* يسار: الأفاتار + الإشعارات (ديسكتوب) + زر القائمة (موبايل) */}
        <div className="flex items-center gap-3">
          {/* Desktop: avatar then notifications on the left */}
          <div className="hidden md:flex items-center gap-2">
            {session ? (
              <>
                <UserNav profile={profile} />
                <Notifications />
              </>
            ) : (
              <Link to="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4 py-2 text-sm"
                >
                  {t('login')}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile: زر القائمة على اليسار */}
          <div className="md:hidden">
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
                  <Brand />
                </div>

                <div className="flex flex-col space-y-2 mb-4">
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

                <div className="mt-2 border-t pt-4 flex flex-col gap-3">
                  {session && (
                    <div className="flex items-center gap-2">
                      <UserNav profile={profile} />
                      <Notifications />
                    </div>
                  )}
                  {!session && (
                    <Link to="/login">
                      <Button className="w-full rounded-full py-2">
                        {t('login')}
                      </Button>
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* الوسط: أزرار التنقل (ديسكتوب فقط) */}
        <div className="flex flex-1 justify-center">
          <div className="hidden md:flex items-center gap-3">
            {publicNavItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <span
                  className={cn(
                    'text-sm md:text-base font-medium transition-colors px-3 py-2 rounded-full',
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
        </div>

        {/* يمين: الشعار */}
        <div className="flex items-center justify-end">
          <Link to="/">
            <Brand />
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;