"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plane, Package, CalendarDays, Link as LinkIcon, User, BadgeCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CountryFlag from '@/components/CountryFlag';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const MyTripsPage = () => {
  const { t } = useTranslation();
  const { user } = useSession();

  const { data: trips, isLoading, error } = useQuery({
    queryKey: ['userTrips', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            is_verified
          )
        `)
        .eq('user_id', user.id)
        .order('trip_date', { ascending: true });

      if (error) {
        console.error("Error fetching user trips:", error);
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!user?.id,
  });

  if (!user) {
    return <div className="container p-4 text-center">{t('mustBeLoggedIn')}</div>;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">{t('loadingTrips')}</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)]">
        <p className="text-red-500">{t('errorLoadingTrips')}: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('myFlights')}</h1>
      
      <div className="max-w-4xl mx-auto">
        {trips && trips.length > 0 ? (
          <div className="space-y-4">
            {trips.map((trip) => (
              <Card key={trip.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Plane className="h-6 w-6 text-primary" />
                      <CountryFlag country={trip.from_country} showName />
                      <span className="text-xl">→</span>
                      <CountryFlag country={trip.to_country} showName />
                    </CardTitle>
                    <Badge variant="secondary" className="text-sm">
                      {trip.free_kg} kg {t('availableWeight')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4" /> 
                      {t('tripDate')}: {format(new Date(trip.trip_date), 'PPP')}
                    </p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" /> 
                      {t('pricePerKg')}: ${trip.charge_per_kg?.toFixed(2) || 'N/A'}
                    </p>
                    <div className="flex items-center gap-2 text-muted-foreground col-span-full">
                      <User className="h-4 w-4" />
                      <span>{trip.profiles?.first_name || t('you')}</span>
                      {trip.profiles?.is_verified && <Badge variant="secondary" className="text-green-600 border-green-600"><BadgeCheck className="h-3 w-3 mr-1" /> {t('verified')}</Badge>}
                    </div>
                  </div>
                  <Link to={`/trips/${trip.id}`}>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      {t('viewTripAndRequest')}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">{t('noTripsYet')}</h3>
            <p className="text-muted-foreground mb-4">{t('travelersEarnMoney')}</p>
            <Link to="/add-trip">
              <Button>{t('addTrip')}</Button>
            </Link>
            {user && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg text-left">
                <p className="text-sm text-muted-foreground font-semibold">
                  Debug Info:
                </p>
                <p className="text-xs break-all">User ID: {user.id}</p>
                <p className="text-xs">Session: {user ? 'Active' : 'None'}</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default MyTripsPage;