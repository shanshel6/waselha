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
    { name: t('search'), path: '/search' },
    { name: t('myProfile'), path: '/my-profile' },
  ];

  return (
    <nav className="bg-primary text-primary-foreground p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          Waselha
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link key={item.name} to={item.path} className="hover:text-accent-foreground transition-colors">
              {item.name}
            </Link>
          ))}
          {session && (
            <Button onClick={handleLogout} variant="secondary" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('logout')}
            </Button>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center">
          {session && (
            <Button onClick={handleLogout} variant="secondary" className="bg-destructive text-destructive-foreground hover:bg-destructive/90 mr-4">
              {t('logout')}
            </Button>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground">
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