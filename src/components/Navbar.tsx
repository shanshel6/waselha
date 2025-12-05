"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import UserNav from './UserNav'; // Import UserNav

const Navbar = () => {
  const { t } = useTranslation();
  const { session } = useSession();

  // RTL order: Home (right) then Trips (left)
  const navItems = [
    { name: t('home'), path: '/' },
    { name: t('trips'), path: '/trips' },
  ];

  // Mobile navigation items (including profile/requests for logged-in users)
  const mobileNavItems = [
    ...navItems,
    ...(session ? [
      { name: t('myProfile'), path: '/my-profile' },
      { name: t('myRequests'), path: '/my-requests' },
      { name: t('myFlights'), path: '/trips' }, // Link to user's trips
    ] : []),
  ];

  return (
    <nav className="bg-white text-foreground p-4 shadow-md border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
      <div className="container mx-auto flex justify-between items-center">
        {/* Right Side: Logo */}
        <Link to="/" className="text-2xl font-bold text-primary">
          Waselha
        </Link>

        {/* Left Side: Navigation */}
        <div className="flex items-center">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link key={item.name} to={item.path} className="text-gray-700 hover:text-primary transition-colors font-medium dark:text-gray-300 dark:hover:text-primary">
                {item.name}
              </Link>
            ))}
            {/* User Profile/Logout handled by UserNav */}
            {session ? <UserNav /> : (
              <Link to="/login">
                <Button variant="ghost">{t('login')}</Button>
              </Link>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px] sm:w-[300px] bg-background text-foreground dark:bg-gray-800">
                <div className="flex flex-col space-y-4 p-4 text-right">
                  {mobileNavItems.map((item) => (
                    <Link key={item.name} to={item.path} className="text-lg hover:text-primary transition-colors">
                      {item.name}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
            <div className="mr-2">
              {session && <UserNav />}
              {!session && (
                <Link to="/login">
                  <Button variant="ghost">{t('login')}</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;