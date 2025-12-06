"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plane, Package, CalendarDays, User, Mail, Phone, Briefcase, BadgeCheck, Pencil } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import EditNameDialog from '@/components/EditNameDialog'; // Import the new dialog component
import { Button } from '@/components/ui/button';

const MyTrips = () => {
  const { t } = useTranslation();
  const { user } = useSession();

  const { data: trips, isLoading, error } = useQuery({
    queryKey: ['userTrips', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('trip_date', { ascending: true });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <p>{t('loadingTrips')}</p>;
  if (error) return <p className="text-red-500">{t('errorLoadingTrips')}: {error.message}</p>;

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>{t('myTrips')}</CardTitle>
      </CardHeader>
      <CardContent>
        {trips && trips.length > 0 ? (
          <div className="space-y-4">
            {trips.map((trip) => (
              <Card key={trip.id} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-md">
                    <Plane className="h-5 w-5" /> {trip.from_country} → {trip.to_country}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4" /> {format(new Date(trip.trip_date), 'PPP')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 text-sm">
                  <p className="flex items-center gap-2"><Package className="h-4 w-4" />{trip.free_kg} kg</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p>{t('noTripsYet')}</p>
        )}
      </CardContent>
    </Card>
  );
};

const MyProfile = () => {
  const { t } = useTranslation();
  const { user, isLoading: isSessionLoading } = useSession();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);

  if (isSessionLoading || isLoadingProfile) {
    return (
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">{t('loadingProfile')}</p>
      </div>
    );
  }

  const roleText = (role: string | null | undefined) => {
    if (role === 'traveler') return t('roleTraveler');
    if (role === 'sender') return t('roleSender');
    if (role === 'both') return t('roleBoth');
    return 'N/A';
  };

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('myProfile')}</h1>
      
      {/* Profile Display Card */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            <span className="flex items-center gap-2">
              {profile?.first_name} {profile?.last_name}
              {profile && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                  onClick={() => setIsNameDialogOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </span>
            {profile?.is_verified && <Badge className="bg-green-500 hover:bg-green-500/90 text-white"><BadgeCheck className="h-4 w-4 mr-1" /> {t('verified')}</Badge>}
          </CardTitle>
          <CardDescription>
            {t('profileDetails')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-2 rounded-md bg-gray-50 dark:bg-gray-800">
              <Mail className="h-5 w-5 text-gray-500" />
              <span className="text-gray-800 dark:text-gray-200 text-sm">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-md bg-gray-50 dark:bg-gray-800">
              <Phone className="h-5 w-5 text-gray-500" />
              <span className="text-gray-800 dark:text-gray-200 text-sm">{profile?.phone || t('noPhoneProvided')}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-md bg-gray-50 dark:bg-gray-800">
            <Briefcase className="h-5 w-5 text-gray-500" />
            <Badge variant="outline">{roleText(profile?.role)}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Edit Name Dialog */}
      {profile && (
        <EditNameDialog 
          profile={profile} 
          isOpen={isNameDialogOpen} 
          onOpenChange={setIsNameDialogOpen} 
        />
      )}

      <MyTrips />
    </div>
  );
};

export default MyProfile;