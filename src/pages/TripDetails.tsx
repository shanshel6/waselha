"use client";
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { calculateShippingCost } from '@/lib/pricing';
import { arabicCountries } from '@/lib/countries-ar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plane, Package, User, MapPin, Calendar, Info } from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';

const requestSchema = z.object({
  weight_kg: z.coerce.number().min(1, { message: "positiveNumber" }).max(30, { message: "maxWeight" }),
  description: z.string().min(10, { message: "descriptionTooShort" }),
  destination_city: z.string().min(2, { message: "requiredField" }),
  receiver_details: z.string().min(10, { message: "requiredField" }),
});

const TripDetails = () => {
  const { t } = useTranslation();
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(` *, profiles ( first_name, last_name ) `)
        .eq('id', tripId)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!tripId,
  });

  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      weight_kg: 1,
      description: "",
      destination_city: "",
      receiver_details: "",
    },
  });

  const weight = form.watch('weight_kg');
  const priceCalculation = useMemo(() => {
    if (!trip) return null;
    return calculateShippingCost(trip.from_country, trip.to_country, weight || 0);
  }, [weight, trip]);

  const onSubmit = async (values: z.infer<typeof requestSchema>) => {
    if (!user) {
      showError(t('mustBeLoggedIn'));
      navigate('/login');
      return;
    }

    if (!trip) {
      showError(t('tripNotFound'));
      return;
    }

    // Verification check disabled for testing
    /* if (!profile?.is_verified) {
      setVerificationModalOpen(true);
      return;
    } */

    const { error } = await supabase.from('requests').insert({
      trip_id: trip.id,
      sender_id: user.id,
      ...values,
    });

    if (error) {
      console.error("Error creating request:", error);
      showError(t('requestFailed'));
    } else {
      showSuccess(t('requestSentSuccess'));
      navigate('/my-requests');
    }
  };

  if (isLoading) return <div className="container p-4">{t('loadingTrips')}...</div>;
  if (error) return <div className="container p-4 text-red-500">{t('errorLoadingTrips')}: {error.message}</div>;
  if (!trip) return <div className="container p-4">{t('tripNotFound')}</div>;

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark-bg-gray-900">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Trip Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl text-primary">
              <Plane className="h-6 w-6" />
              <CountryFlag country={trip.from_country} showName />
              <span className="text-2xl">→</span>
              <CountryFlag country={trip.to_country} showName />
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(new Date(trip.trip_date), 'PPP')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" />
              {t('traveler')}: {trip.profiles?.first_name || 'N/A'} {trip.profiles?.last_name || ''}
            </p>
            <p className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-500" />
              {t('availableWeight')}: {trip.free_kg} kg
            </p>
            {trip.traveler_location && (
              <p className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-500" />
                {t('travelerLocation')}: {trip.traveler_location}
              </p>
            )}
            {trip.notes && (
              <div className="pt-2">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Info className="h-5 w-5 text-gray-500" />
                  {t('notesFromTraveler')}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                  {trip.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Send Request Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sendRequestToTraveler')}</CardTitle>
            <CardDescription>{t('fillFormToSend')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="weight_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('packageWeightKg')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="1" max="30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {priceCalculation && priceCalculation.totalPriceUSD > 0 && (
                  <Card className="bg-primary/10 p-4">
                    <CardTitle className="text-lg mb-2 text-center">{t('estimatedCost')}</CardTitle>
                    <div className="flex justify-around text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Total (USD)</p>
                        <p className="font-bold text-xl">${priceCalculation.totalPriceUSD.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total (IQD)</p>
                        <p className="font-bold text-xl">{priceCalculation.totalPriceIQD.toLocaleString('en-US')}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {t('pricePerKg')}: ${priceCalculation.pricePerKgUSD.toFixed(2)}
                    </p>
                  </Card>
                )}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('packageContents')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('packageContentsPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destination_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('destinationCity')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('destinationCityPlaceholder', { country: arabicCountries[trip.to_country] || trip.to_country })} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="receiver_details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('receiverDetails')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('receiverDetailsPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">{t('sendRequest')}</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TripDetails;