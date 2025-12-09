"use client";
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, DollarSign, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const formSchema = z.object({
  from_country: z.string().min(1, { message: "requiredField" }),
  to_country: z.string().min(1, { message: "requiredField" }),
  trip_date: z.date({ required_error: "dateRequired" }),
  free_kg: z.coerce.number().min(1, { message: "minimumWeight" }).max(50, { message: "maxWeight" }),
  traveler_location: z.string().min(1, { message: "requiredField" }),
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
      from_country: "Iraq",
      to_country: "",
      free_kg: 1,
      traveler_location: "",
      notes: "",
    },
  });

  const { from_country, to_country, free_kg } = form.watch();

  React.useEffect(() => {
    if (from_country && from_country !== "Iraq" && to_country !== "Iraq") {
      form.setValue("to_country", "Iraq");
    } else if (to_country && to_country !== "Iraq" && from_country !== "Iraq") {
      form.setValue("from_country", "Iraq");
    } else if (from_country === "Iraq" && to_country === "Iraq") {
      form.setValue("to_country", "");
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

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

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

      const { error } = await supabase
        .from('trips')
        .insert({
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
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('addTrip')}</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl mx-auto">
          {/* ... الحقول السابقة كما هي ... */}

          <TicketUpload
            onFileSelected={setTicketFile}
          />

          <p className="text-xs text-muted-foreground">
            لا تقبل أي طرد دون التأكد من خلوّه من المواد المحظورة.{" "}
            <button
              type="button"
              onClick={() => setIsForbiddenOpen(true)}
              className="underline underline-offset-2 text-primary hover:text-primary/80"
            >
              انقر هنا لقراءة قائمة المواد المحظورة
            </button>
          </p>

          {/* ... بقية الحقول (traveler_location, notes, التنبيه, زر الإنشاء) ... */}

          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            {t('createTrip')}
          </Button>
        </form>
      </Form>

      <ForbiddenItemsDialog
        isOpen={isForbiddenOpen}
        onOpenChange={setIsForbiddenOpen}
        readOnly
      />
    </div>
  );
};

export default AddTrip;