"use client";
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, DollarSign, Loader2, MapPin, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { countries } from '@/lib/countries';
import { calculateTravelerProfit } from '@/lib/pricing';
import CountryFlag from '@/components/CountryFlag';
import TicketUpload from '@/components/TicketUpload';
import { arabicCountries } from '@/lib/countries-ar';

const MIN_KG = 1;
const MAX_KG = 50;

const formSchema = z.object({
  from_country: z.string().min(1, { message: 'requiredField' }),
  to_country: z.string().min(1, { message: 'requiredField' });
  trip_date: z.date({ required_error: 'dateRequired' }),
  free_kg: z
    .coerce.number()
    .min(MIN_KG, { message: 'minimumWeight' })
    .max(MAX_KG, { message: 'maxWeight' }),
  traveler_location: z.string().min(1, { message: 'requiredField' }),
  notes: z.string().optional(),
});

interface TripFormProps {
  onSubmit: (values: z.infer<typeof formSchema>, ticketFile: File | null) => void;
  isSubmitting: boolean;
}

export const TripForm: React.FC<TripFormProps> = ({ onSubmit, isSubmitting }) => {
  const { t } = useTranslation();
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      from_country: 'Iraq',
      to_country: '',
      free_kg: MIN_KG,
      traveler_location: '',
      notes: '',
    },
  });

  const { from_country, to_country, free_kg } = form.watch();

  // Ensure exactly one side is Iraq
  React.useEffect(() => {
    if (from_country && from_country !== 'Iraq' && to_country !== 'Iraq') {
      form.setValue('to_country', 'Iraq');
    } else if (to_country && to_country !== 'Iraq' && from_country !== 'Iraq') {
      form.setValue('from_country', 'Iraq');
    } else if (from_country === 'Iraq' && to_country === 'Iraq') {
      form.setValue('to_country', '');
    }
  }, [from_country, to_country, form]);

  const estimatedProfit = useMemo(() => {
    if (from_country && to_country && free_kg > 0) {
      return calculateTravelerProfit(from_country, to_country, free_kg);
    }
    return null;
  }, [from_country, to_country, free_kg]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values, ticketFile);
  };

  return (
    <Card className="max-w-2xl mx-auto mb-12">
      <CardHeader>
        <CardTitle className="text-2xl md:text-3xl font-bold text-center">
          أضف رحلتك الآن
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* From / To countries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="from_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fromCountry')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectCountry')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c} value={c}>
                            <div className="flex items-center gap-2">
                              <CountryFlag country={c} />
                              <span>{arabicCountries[c] || c}</span>
                            </div>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectCountry')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c} value={c}>
                            <div className="flex items-center gap-2">
                              <CountryFlag country={c} />
                              <span>{arabicCountries[c] || c}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Trip date */}
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
                          variant={'outline'}
                          className={cn(
                            'w-full justify-between text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>{t('selectDate')}</span>
                          )}
                          <CalendarIcon className="h-4 w-4 opacity-70" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Free kg slider */}
            <FormField
              control={form.control}
              name="free_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('freeKg')} ({field.value} kg)
                  </FormLabel>
                  <FormControl>
                    <div className="mt-2">
                      <Slider
                        min={MIN_KG}
                        max={MAX_KG}
                        step={1}
                        value={[field.value]}
                        onValueChange={(val) => field.onChange(val[0])}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>1 kg</span>
                        <span>50 kg</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Traveler location */}
            <FormField
              control={form.control}
              name="traveler_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {t('travelerLocation')}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t('travelerLocationPlaceholder')} {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t('travelerLocationDescription')}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    {t('notes')}
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder={t('notes')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ticket upload */}
            <TicketUpload onFileSelected={setTicketFile} />

            {/* Estimated profit (USD only) */}
            {estimatedProfit && !estimatedProfit.error && (
              <Card className="mt-4 border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    {t('estimatedProfit')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    {estimatedProfit.totalPriceUSD.toFixed(2)} USD
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('basedOnWeightAndDestination')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Info about admin review */}
            <p className="text-xs text-muted-foreground">
              {t('tripPendingApprovalNote')}
            </p>
            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isSubmitting || form.formState.isSubmitting}
            >
              {(isSubmitting || form.formState.isSubmitting) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              إضافة رحلتي
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};