"use client";

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showError } from '@/utils/toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import CountryFlag from '@/components/CountryFlag';
import { arabicCountries } from '@/lib/countries-ar';
import { useVerificationStatus } from '@/hooks/use-verification-status';

interface Trip {
  id: string;
  from_country: string;
  to_country: string;
  trip_date: string;
  free_kg: number;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    is_verified: boolean;
  } | null;
}

const TripsList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: verificationInfo, isLoading: isVerificationLoading } = useVerificationStatus();

  const [filters, setFilters] = useState({
    from_country: '',
    to_country: '',
    trip_date: undefined as Date | undefined,
  });

  const {
    data: trips,
    isLoading,
    error,
  } = useQuery<Trip[], Error>({
    queryKey: ['trips', filters],
    queryFn: async () => {
      let query = supabase
        .from('trips')
        .select(
          `
          *,
          profiles (
            first_name,
            last_name,
            is_verified
          )
        `,
        )
        .order('trip_date', { ascending: true });

      if (filters.from_country) {
        query = query.eq('from_country', filters.from_country);
      }
      if (filters.to_country) {
        query = query.eq('to_country', filters.to_country);
      }
      if (filters.trip_date) {
        // Filter by date (start of day)
        const dateString = format(filters.trip_date, 'yyyy-MM-dd');
        query = query.gte('trip_date', dateString);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);
      return data as Trip[];
    },
  });

  const allCountries = useMemo(() => Object.keys(arabicCountries), []);

  const handleFilterChange = (name: string, value: string | Date | undefined) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const isVerified = verificationInfo?.status === 'approved';

  const handleTripClick = (tripId: string) => {
    if (!user) {
      showError(t('mustBeLoggedIn'));
      navigate('/login');
      return;
    }

    // Enforce verification check before allowing access to trip details
    if (!isVerified) {
      showError(t('verificationRequiredTitle'));
      navigate('/verification');
      return;
    }

    // If verified, proceed to trip details
    navigate(`/trips/${tripId}`);
  };

  if (isLoading || isVerificationLoading)
    return (
      <div className="container p-4 flex items-center justify-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  if (error)
    return (
      <div className="container p-4 text-red-500">
        {t('errorLoadingTrips')}: {error.message}
      </div>
    );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">{t('availableTrips')}</h1>

      {/* Filter Section */}
      <Card className="mb-8 p-4">
        <CardHeader>
          <CardTitle className="text-xl">{t('filterTrips')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            onValueChange={(value) => handleFilterChange('from_country', value)}
            value={filters.from_country}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('fromCountry')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('allCountries')}</SelectItem>
              {allCountries.map((countryCode) => (
                <SelectItem key={countryCode} value={countryCode}>
                  <CountryFlag country={countryCode} showName />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) => handleFilterChange('to_country', value)}
            value={filters.to_country}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('toCountry')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('allCountries')}</SelectItem>
              {allCountries.map((countryCode) => (
                <SelectItem key={countryCode} value={countryCode}>
                  <CountryFlag country={countryCode} showName />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !filters.trip_date && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.trip_date ? (
                  format(filters.trip_date, 'PPP')
                ) : (
                  <span>{t('selectDate')}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.trip_date}
                onSelect={(date) => handleFilterChange('trip_date', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            onClick={() =>
              setFilters({
                from_country: '',
                to_country: '',
                trip_date: undefined,
              })
            }
          >
            {t('clearFilters')}
          </Button>
        </CardContent>
      </Card>

      {/* Trips List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips && trips.length > 0 ? (
          trips.map((trip) => (
            <Card
              key={trip.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleTripClick(trip.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xl font-semibold text-primary">
                    <CountryFlag country={trip.from_country} showName />
                    <span className="text-2xl">→</span>
                    <CountryFlag country={trip.to_country} showName />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(trip.trip_date), 'PPP')}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>
                  {t('availableWeight')}:{' '}
                  <span className="font-medium">{trip.free_kg} kg</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('traveler')}:{' '}
                  {trip.profiles?.first_name || t('anonymous')}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center p-10 text-muted-foreground">
            {t('noTripsFound')}
          </div>
        )}
      </div>
    </div>
  );
};

export default TripsList;