"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { Plane, Package, DollarSign, CalendarDays } from 'lucide-react';

const Trips = () => {
  const { t } = useTranslation();
  const { user, isLoading: isSessionLoading } = useSession();

  const { data: trips, isLoading: isTripsLoading, error } = useQuery({
    queryKey: ['userTrips', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('trip_date', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!user?.id, // Only run the query if user.id is available
  });

  if (isSessionLoading || isTripsLoading) {
    return (
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">{t('loadingTrips')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)]">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('trips')}</h1>
        <p className="text-red-500">{t('errorLoadingTrips')}: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('trips')}</h1>
      <Link to="/add-trip">
        <Button className="mb-6 bg-primary text-primary-foreground hover:bg-primary/90">{t('addTrip')}</Button>
      </Link>

      {trips && trips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <Card key={trip.id} className="shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Plane className="h-5 w-5" /> {trip.from_country} <span className="text-gray-500 dark:text-gray-400">→</span> {trip.to_country}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CalendarDays className="h-4 w-4" /> {format(new Date(trip.trip_date), 'PPP')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Package className="h-4 w-4" /> {t('freeKg')}: {trip.free_kg} kg
                </p>
                <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <DollarSign className="h-4 w-4" /> {t('chargePerKg')}: ${trip.charge_per_kg}
                </p>
                {trip.traveler_location && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('travelerLocation')}: {trip.traveler_location}
                  </p>
                )}
                {trip.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('notes')}: {trip.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400">
          {t('noTripsYet')}
        </p>
      )}
    </div>
  );
};

export default Trips;