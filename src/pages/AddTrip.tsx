"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, DollarSign } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { countries } from '@/lib/countries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  from_country: z.string().min(1, { message: "requiredField" }),
  to_country: z.string().min(1, { message: "requiredField" }),
  trip_date: z.date({
    required_error: "dateRequired",
  }),
  free_kg: z.coerce.number().min(0, { message: "positiveNumber" }),
  charge_per_kg: z.coerce.number().min(0, { message: "positiveNumber" }),
  traveler_location: z.string().optional(),
  notes: z.string().optional(),
});

const AddTrip = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const [estimatedProfit, setEstimatedProfit] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      from_country: "",
      to_country: "",
      free_kg: 0,
      charge_per_kg: 0,
      traveler_location: "",
      notes: "",
    },
  });

  const freeKg = form.watch('free_kg');
  const chargePerKg = form.watch('charge_per_kg');

  useEffect(() => {
    const kg = Number(freeKg);
    const charge = Number(chargePerKg);

    if (!isNaN(kg) && !isNaN(charge) && kg > 0 && charge > 0) {
      setEstimatedProfit(kg * charge);
    } else {
      setEstimatedProfit(0);
    }
  }, [freeKg, chargePerKg]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError(t('tripAddedError'));
      navigate('/login');
      return;
    }

    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: user.id,
        from_country: values.from_country,
        to_country: values.to_country,
        trip_date: format(values.trip_date, 'yyyy-MM-dd'),
        free_kg: values.free_kg,
        charge_per_kg: values.charge_per_kg,
        traveler_location: values.traveler_location,
        notes: values.notes,
      });

    if (error) {
      console.error('Error adding trip:', error);
      showError(t('tripAddedError'));
    } else {
      showSuccess(t('tripAddedSuccess'));
      navigate('/trips');
    }
  };

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('addTrip')}</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl mx-auto">
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
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="to_country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('toCountry')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectCountry')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="trip_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t('tripDate')}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>{t('selectDate')}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="free_kg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('freeKg')}</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="charge_per_kg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('chargePerKg')}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="traveler_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('travelerLocation')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('notes')}</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {estimatedProfit > 0 && (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardHeader className="text-center">
                <CardTitle className="text-green-800 dark:text-green-300">{t('estimatedProfit')}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-4xl font-bold text-green-600 dark:text-green-400 flex items-center justify-center">
                  <DollarSign className="h-8 w-8 mr-2" />
                  {estimatedProfit.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          )}

          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            {t('createTrip')}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default AddTrip;