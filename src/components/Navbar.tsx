"use client";

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useSession } from '@/integrations/supabase/SessionContextProvider';

const Navbar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useSession();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { name: t('home'), path: '/' },
    { name: t('trips'), path: '/trips' },
    { name: t('myProfile'), path: '/my-profile' },
  ];

  return (
    <nav className="bg-white text-foreground p-4 shadow-md border-b border-gray-200">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-primary">
          Waselha
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link key={item.name} to={item.path} className="text-gray-700 hover:text-primary transition-colors font-medium">
              {item.name}
            </Link>
          ))}
          {session && (
            <Button onClick={handleLogout} variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
              {t('logout')}
            </Button>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center">
          {session && (
            <Button onClick={handleLogout} variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground mr-4">
              {t('logout')}
            </Button>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] sm:w-[300px] bg-background text-foreground">
              <div className="flex flex-col space-y-4 p-4">
                {navItems.map((item) => (
                  <Link key={item.name} to={item.path} className="text-lg hover:text-primary transition-colors">
                    {item.name}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;