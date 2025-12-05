"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Plane, Package, DollarSign, User, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { countries } from '@/lib/countries';

const searchSchema = z.object({
  from_country: z.string().optional(),
  to_country: z.string().optional(),
});

type SearchFilters = z.infer<typeof searchSchema>;

const Trips = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<SearchFilters>({ from_country: "Iraq" });
  const exchangeRateUSDToIQD = 1500;

  const form = useForm<SearchFilters>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      from_country: "Iraq",
      to_country: "",
    },
  });

  const { data: trips, isLoading, error } = useQuery({
    queryKey: ['trips', filters],
    queryFn: async () => {
      let query = supabase
        .from('trips')
        .select(
          `*,
          profiles (
            first_name,
            last_name
          )`
        )
        .gte('trip_date', format(new Date(), 'yyyy-MM-dd'));

      if (filters.from_country) {
        query = query.eq('from_country', filters.from_country);
      }
      if (filters.to_country) {
        query = query.eq('to_country', filters.to_country);
      }

      const { data, error: queryError } = await query.order('trip_date', { ascending: true });

      if (queryError) {
        throw new Error(queryError.message);
      }
      return data;
    },
  });

  const onSubmit = (values: SearchFilters) => {
    setFilters(values);
  };
  
  const resetFilters = () => {
    form.reset({ from_country: "Iraq", to_country: "" });
    setFilters({ from_country: "Iraq" });
  };

  const renderContent = () => {
    if (isLoading) {
      return <p>{t('loadingTrips')}</p>;
    }

    if (error) {
      return <p className="text-red-500">{t('errorLoadingTrips')}: {error.message}</p>;
    }

    if (trips && trips.length > 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <Card key={trip.id} className="shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Plane className="h-5 w-5" /> {trip.from_country} → {trip.to_country}
                </CardTitle>
                <CardDescription>{format(new Date(trip.trip_date), 'PPP')}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <p className="flex items-center gap-2"><User className="h-4 w-4 text-gray-500" /> {t('traveler')}: {trip.profiles?.first_name || 'N/A'}</p>
                <p className="flex items-center gap-2"><Package className="h-4 w-4 text-gray-500" /> {t('availableWeight')}: {trip.free_kg} kg</p>
                <p className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-gray-500" /> {t('pricePerKg')}: ${trip.charge_per_kg} <span className="text-xs text-gray-500">({t('approxIQD')} {new Intl.NumberFormat().format(trip.charge_per_kg * exchangeRateUSDToIQD)} IQD)</span></p>
                {trip.traveler_location && <p className="flex items-center gap-2 text-sm text-gray-600"><MapPin className="h-4 w-4" /> {trip.traveler_location}</p>}
              </CardContent>
              <div className="p-4 pt-0">
                <Link to={`/trips/${trip.id}`} className="w-full">
                  <Button className="w-full">{t('viewTripAndRequest')}</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      );
    }

    return <p>{t('noTripsFound')}</p>;
  };

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('trips')}</h1>
        <Link to="/add-trip">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">{t('addTrip')}</Button>
        </Link>
      </div>
      
      <Card className="mb-8">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <FormField
                control={form.control}
                name="from_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fromCountry')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={t('selectCountry')} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="to_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('toCountry')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={t('selectCountry')} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" className="w-full">{t('searchNow')}</Button>
                <Button type="button" variant="outline" onClick={resetFilters} className="w-full">{t('resetFilters')}</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {renderContent()}
    </div>
  );
};

export default Trips;