"use client";
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { countries } from '@/lib/countries';
import { calculateTravelerProfit } from '@/lib/pricing';
import CountryFlag from '@/components/CountryFlag';
import { useQueryClient } from '@tanstack/react-query';
import { Slider } from '@/components/ui/slider';
import TicketUpload from '@/components/TicketUpload';
import { useVerificationCheck } from '@/hooks/use-verification-check';
import ForbiddenItemsDialog from '@/components/ForbiddenItemsDialog';

const MIN_KG = 1;
const MAX_KG = 50;

const formSchema = z.object({
  from_country: z.string().min(1, { message: 'requiredField' }),
  to_country: z.string().min(1, { message: 'requiredField' }),
  trip_date: z.date({ required_error: 'dateRequired' }),
  free_kg: z
    .coerce.number()
    .min(MIN_KG, { message: 'minimumWeight' })
    .max(MAX_KG, { message: 'maxWeight' }),
  traveler_location: z.string().min(1, { message: 'requiredField' }),
  notes: z.string().optional(),
});

const BUCKET_NAME = 'trip-tickets';

const AddTrip = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const { isVerified, isLoading: isVerificationLoading } = useVerificationCheck(false);
  const queryClient = useQueryClient();
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [isForbiddenOpen, setIsForbiddenOpen] = useState(false);

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

  const ensureBucketExists = async () => {
    const { data, error } = await supabase.functions.invoke('create-trip-tickets-bucket');
    if (error) {
      console.error('Bucket ensure error (edge function):', error);
      throw new Error(error.message || 'Failed to prepare storage bucket for tickets.');
    }
    if (!data?.success) {
      console.error('Bucket ensure error: function returned non-success payload', data);
      throw new Error('Failed to prepare storage bucket for tickets.');
    }
  };

  const uploadTicketAndGetUrl = async (file: File, userId: string) => {
    await ensureBucketExists();

    const ext = file.name.split('.').pop() || 'pdf';
    const filePath = `${userId}/${Date.now()}-ticket.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Ticket upload error:', uploadError);
      throw new Error(uploadError.message || 'Failed to upload ticket file.');
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError(t('mustBeLoggedIn'));
      navigate('/login');
      return;
    }

    if (!isVerified) {
      showError(t('verificationRequiredTitle'));
      navigate('/my-profile');
      return;
    }

    if (!ticketFile) {
      showError(t('ticketRequired'));
      return;
    }

    try {
      const ticketUrl = await uploadTicketAndGetUrl(ticketFile, user.id);

      let charge_per_kg = 0;
      if (estimatedProfit) {
        charge_per_kg = estimatedProfit.pricePerKgUSD;
      }

      const { error } = await supabase.from('trips').insert({
        user_id: user.id,
        from_country: values.from_country,
        to_country: values.to_country,
        trip_date: format(values.trip_date, 'yyyy-MM-dd'),
        free_kg: values.free_kg,
        traveler_location: values.traveler_location,
        notes: values.notes,
        charge_per_kg: charge_per_kg,
        ticket_file_url: ticketUrl,
        is_approved: false,
      });

      if (error) {
        console.error('Error adding trip:', error);
        showError(t('tripAddedError'));
      } else {
        showSuccess(t('tripAddedSuccessPending'));
        queryClient.invalidateQueries({ queryKey: ['userTrips', user.id] });
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        queryClient.invalidateQueries({ queryKey: ['pendingTrips'] });
        navigate('/my-flights');
      }
    } catch (err: any) {
      console.error('Error uploading ticket or adding trip:', err);
      showError(err.message || t('tripAddedError'));
    }
  };

  if (isVerificationLoading) {
    return (
      <div className="container p-4 flex items-center justify-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold">
            {t('addTrip')}
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            {t('travelersEarnMoney')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                <span>{c}</span>
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
                                <span>{c}</span>
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
                            variant="outline"
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
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Free kg slider: بصرياً من اليمين لليسار عبر direction:ltr مع نص 1–50 عادي */}
              <FormField
                control={form.control}
                name="free_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('freeKg')} ({field.value} kg)
                    </FormLabel>
                    <FormControl>
                      <div className="mt-2" style={{ direction: 'ltr' }}>
                        <Slider
                          min={MIN_KG}
                          max={MAX_KG}
                          step={1}
                          value={[field.value]}
                          onValueChange={(val) => field.onChange(val[0])}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1" style={{ direction: 'rtl' }}>
                          {/* 1kg على اليسار بصرياً، 50kg على اليمين */}
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
                      <Input
                        placeholder={t('travelerLocationPlaceholder')}
                        {...field}
                      />
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
                      <Textarea
                        rows={3}
                        placeholder={t('notes')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Ticket upload */}
              <TicketUpload onFileSelected={setTicketFile} />

              {/* Safety note + forbidden items link */}
              <p className="text-xs text-muted-foreground">
                لا تقبل أي طرد دون التأكد من خلوّه من المواد المحظورة.{' '}
                <button
                  type="button"
                  onClick={() => setIsForbiddenOpen(true)}
                  className="underline underline-offset-2 text-primary hover:text-primary/80"
                >
                  انقر هنا لقراءة قائمة المواد المحظورة
                </button>
              </p>

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
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {t('createTrip')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <ForbiddenItemsDialog
        isOpen={isForbiddenOpen}
        onOpenChange={setIsForbiddenOpen}
        readOnly
      />
    </div>
  );
};

export default AddTrip;