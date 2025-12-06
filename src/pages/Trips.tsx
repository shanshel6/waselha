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
import { Plane, Package, User, MapPin, Search, PlusCircle, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { countries } from '@/lib/countries';
import { arabicCountries } from '@/lib/countries-ar';
import { Badge } from '@/components/ui/badge';
import CountryFlag from '@/components/CountryFlag';
import { useSession } from '@/integrations/supabase/SessionContextProvider';

const searchSchema = z.object({
  from_country: z.string().optional(),
  to_country: z.string().optional(),
});

type SearchFilters = z.infer<typeof searchSchema>;

const Trips = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<SearchFilters>({ from_country: "Iraq" });
  const { user } = useSession();
  
  const form = useForm<SearchFilters>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      from_country: "Iraq",
      to_country: "",
    },
  });

  const { data: trips, isLoading, error } = useQuery({
    queryKey: ['trips', filters, user?.id],
    queryFn: async () => {
      let tripIdsToExclude: string[] = [];
      if (user) {
        const { data: activeRequests } = await supabase
          .from('requests')
          .select('trip_id')
          .eq('sender_id', user.id)
          .in('status', ['pending', 'accepted']);
        
        if (activeRequests) {
          tripIdsToExclude = activeRequests.map(r => r.trip_id);
        }
      }

      let query = supabase
        .from('trips')
        .select(
          `*, profiles (
            first_name,
            last_name,
            is_verified
          )`
        )
        .gte('trip_date', format(new Date(), 'yyyy-MM-dd'));

      if (filters.from_country) {
        query = query.eq('from_country', filters.from_country);
      }
      
      if (filters.to_country) {
        query = query.eq('to_country', filters.to_country);
      }

      if (tripIdsToExclude.length > 0) {
        query = query.not('id', 'in', `(${tripIdsToExclude.join(',')})`);
      }

      const { data, error: queryError } = await query.order('trip_date', { ascending: true });
      
      if (queryError) {
        throw new Error(queryError.message);
      }
      
      return data;
    },
    enabled: !!filters.from_country || !!filters.to_country,
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
            <Link 
              key={trip.id} 
              to={`/trips/${trip.id}`} 
              className="block h-full group"
            >
              <Card className="flex flex-col transition-all duration-300 h-full group-hover:shadow-xl group-hover:-translate-y-1">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Plane className="h-5 w-5 text-primary" />
                        <CountryFlag country={trip.from_country} showName className="text-base" />
                        <span className="text-lg">→</span>
                        <CountryFlag country={trip.to_country} showName className="text-base" />
                      </CardTitle>
                      <CardDescription>{format(new Date(trip.trip_date), 'PPP')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{trip.profiles?.first_name || 'N/A'}</span>
                    {trip.profiles?.is_verified && <Badge variant="secondary" className="text-green-600 border-green-600"><BadgeCheck className="h-3 w-3 mr-1" /> Verified</Badge>}
                  </div>
                  <div className="border-t pt-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary/80" />
                    <div>
                      <p className="font-semibold">{trip.free_kg} kg</p>
                      <p className="text-xs text-muted-foreground">{t('availableWeight')}</p>
                    </div>
                  </div>
                  {trip.traveler_location && <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> {trip.traveler_location}</p>}
                </CardContent>
                {/* Footer element acting as a button visual cue */}
                <div className="p-4 pt-0 mt-auto">
                  <div className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 bg-primary text-primary-foreground group-hover:bg-primary/90">
                    {t('viewTripAndRequest')}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      );
    }
    
    return (
      <Card className="text-center p-12">
        <h3 className="text-xl font-semibold">{t('noTripsFound')}</h3>
        <p className="text-muted-foreground mt-2">Try adjusting your search filters or be the first to add a trip!</p>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold">{t('trips')}</h1>
          <p className="text-muted-foreground">Find travelers who can carry your packages.</p>
        </div>
        <Link to="/add-trip">
          <Button size="lg"><PlusCircle className="mr-2 h-5 w-5" />{t('addTrip')}</Button>
        </Link>
      </div>
      
      <Card className="mb-8">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
              <FormField
                control={form.control}
                name="from_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fromCountry')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectCountry')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c} value={c} className="flex items-center">
                            <CountryFlag country={c} showName />
                          </SelectItem>
                        ))}
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
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectCountry')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c} value={c} className="flex items-center">
                            <CountryFlag country={c} showName />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <div className="flex gap-2 col-span-1 md:col-span-1 lg:col-span-2">
                <Button type="submit" className="w-full"><Search className="mr-2 h-4 w-4" />{t('searchNow')}</Button>
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