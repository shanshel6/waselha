"use client";
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useVerificationStatus } from '@/hooks/use-verification-status';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { TripForm } from '@/components/traveler-landing/TripForm';
import { BenefitsSection } from '@/components/traveler-landing/BenefitsSection';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { SuccessModal } from '@/components/traveler-landing/SuccessModal';

const BUCKET_NAME = 'trip-tickets';

const getFormSchema = (isLoggedIn: boolean) => {
  const baseSchema = z.object({
    from_country: z.string().min(1, { message: 'requiredField' }),
    to_country: z.string().min(1, { message: 'requiredField' }),
    trip_date: z.string({ required_error: 'dateRequired' }),
    free_kg: z.coerce.number().min(1).max(50),
    traveler_location: z.string().min(1, { message: 'requiredField' }),
    notes: z.string().optional(),
    ticket_file: z.instanceof(File).nullable(),
    full_name: z.string().optional(),
    phone: z.string().optional(),
  });

  if (!isLoggedIn) {
    return baseSchema.extend({
      full_name: z.string().min(1, { message: 'requiredField' }),
      phone: z.string().min(10, { message: 'phoneMustBe10To12Digits' }).max(12, { message: 'phoneMustBe10To12Digits' }).regex(/^\d+$/, { message: 'phoneMustBeNumbers' }),
    });
  }

  return baseSchema;
};

const TravelerLanding = () => {
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();
  const { data: verificationInfo, isLoading: isVerificationStatusLoading } = useVerificationStatus();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const formSchema = useMemo(() => getFormSchema(!!user), [user]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      from_country: 'Iraq',
      to_country: '',
      trip_date: '',
      free_kg: 1,
      traveler_location: '',
      notes: '',
      ticket_file: null,
    },
  });

  const totalSteps = useMemo(() => (user ? 5 : 6), [user]);
  const progress = useMemo(() => (currentStep / totalSteps) * 100, [currentStep, totalSteps]);

  const stepFields: (keyof z.infer<typeof formSchema>)[][] = useMemo(() => {
    const steps: (keyof z.infer<typeof formSchema>)[][] = [
      ['from_country', 'to_country'], // 1
      ['trip_date'], // 2
      ['free_kg'], // 3
    ];

    if (!user) {
      steps.push(['full_name', 'phone']); // 4 (guest)
    }

    steps.push(['traveler_location', 'notes']); // 4 (user) or 5 (guest)
    steps.push(['ticket_file']); // 5 (user) or 6 (guest)

    return steps;
  }, [user]);

  const handleNextStep = async () => {
    const fieldsToValidate = stepFields[currentStep - 1];
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const ensureBucketExists = async () => {
    const { data, error } = await supabase.functions.invoke('create-trip-tickets-bucket');
    if (error) throw new Error(error.message || 'Failed to prepare storage bucket for tickets.');
    if (!data?.success) throw new Error('Failed to prepare storage bucket for tickets.');
  };

  const uploadTicketAndGetUrl = async (file: File, userId: string) => {
    await ensureBucketExists();
    const ext = file.name.split('.').pop() || 'pdf';
    const filePath = `${userId}/${Date.now()}-ticket.${ext}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  };

  const formatPhoneNumber = (phone: string): string => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('07')) cleanPhone = cleanPhone.substring(1);
    else if (cleanPhone.length === 12 && cleanPhone.startsWith('9647')) cleanPhone = cleanPhone.substring(3);
    else if (cleanPhone.length === 13 && cleanPhone.startsWith('+9647')) cleanPhone = cleanPhone.substring(4);
    return cleanPhone;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let userIdForTrip: string;
      let isNewUser = false;

      if (!user) {
        isNewUser = true;
        const randomPassword = Math.floor(100000 + Math.random() * 900000).toString();
        const formattedPhone = formatPhoneNumber(values.phone!);
        const fullPhone = `+964${formattedPhone}`;
        const fullNameParts = values.full_name!.trim().split(/\s+/);
        const firstName = fullNameParts[0] || '';
        const lastName = fullNameParts.slice(1).join(' ') || '';

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          phone: fullPhone,
          password: randomPassword,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              phone: values.phone,
              address: values.traveler_location,
              role: 'traveler'
            }
          },
        });

        if (signUpError) {
          if (signUpError.message.includes('User already registered')) throw new Error('رقم الهاتف هذا مسجل بالفعل. يرجى تسجيل الدخول.');
          throw signUpError;
        }

        if (!signUpData.user) throw new Error("فشل في إنشاء حساب المستخدم. يرجى المحاولة مرة أخرى.");
        userIdForTrip = signUpData.user.id;

        const { error: passwordError } = await supabase
          .from('user_passwords')
          .insert({ id: userIdForTrip, password: randomPassword });

        if (passwordError) console.error('Error storing password:', passwordError);
      } else {
        const isVerified = verificationInfo?.status === 'approved';
        if (!isVerified) {
          showError('verificationRequiredTitle');
          navigate('/verification');
          return;
        }
        userIdForTrip = user.id;
      }

      if (!values.ticket_file) throw new Error('يرجى تحميل تذكرة الطيران');
      const ticketUrl = await uploadTicketAndGetUrl(values.ticket_file, userIdForTrip);

      const { calculateTravelerProfit } = await import('@/lib/pricing');
      const profit = calculateTravelerProfit(values.from_country, values.to_country, values.free_kg);
      const charge_per_kg = profit ? profit.pricePerKgUSD : 0;

      const { error: tripError } = await supabase.from('trips').insert({
        user_id: userIdForTrip,
        from_country: values.from_country,
        to_country: values.to_country,
        trip_date: format(new Date(values.trip_date), 'yyyy-MM-dd'),
        free_kg: values.free_kg,
        traveler_location: values.traveler_location,
        notes: values.notes,
        charge_per_kg: charge_per_kg,
        ticket_file_url: ticketUrl,
        is_approved: false,
      });

      if (tripError) throw tripError;

      if (isNewUser) {
        await supabase.auth.signOut();
        setSuccessMessage("تم إنشاء حسابك بنجاح! ستصلك رسالة نصية بكلمة المرور خلال ساعة.");
        setShowSuccessModal(true);
      } else {
        showSuccess('تمت إضافة الرحلة بنجاح! في انتظار موافقة المسؤول.');
        queryClient.invalidateQueries({ queryKey: ['userTrips', userIdForTrip] });
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        queryClient.invalidateQueries({ queryKey: ['pendingTrips'] });
        navigate('/my-flights');
      }
    } catch (err: any) {
      showError(err.message || 'حدث خطأ أثناء إضافة الرحلة');
      setIsSubmitting(false);
    }
  };

  if (isSessionLoading || isVerificationStatusLoading) {
    return (
      <div className="container p-4 flex items-center justify-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <Card className="max-w-2xl mx-auto mb-12">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold text-center">
            أضف رحلتك الآن
          </CardTitle>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <TripForm form={form} currentStep={currentStep} isLoggedIn={!!user} />
              <div className="flex gap-4 justify-between mt-8">
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={handlePrevStep}>
                    السابق
                  </Button>
                )}
                {currentStep < totalSteps && (
                  <Button type="button" onClick={handleNextStep} className="ml-auto">
                    التالي
                  </Button>
                )}
                {currentStep === totalSteps && (
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    إضافة رحلتي
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <BenefitsSection />
      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />
    </div>
  );
};

export default TravelerLanding;