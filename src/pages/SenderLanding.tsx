"use client";
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useVerificationStatus } from '@/hooks/use-verification-status';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { OrderForm } from '@/components/sender-landing/OrderForm';
import { BenefitsSection } from '@/components/sender-landing/BenefitsSection';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { ITEM_SIZES, ITEM_TYPES } from '@/lib/pricing';
import ForbiddenItemsDialog from '@/components/ForbiddenItemsDialog';
import { SuccessModal } from '@/components/sender-landing/SuccessModal';

const getFormSchema = (isLoggedIn: boolean) => {
  const baseSchema = z.object({
    from_country: z.string().min(1, { message: 'requiredField' }),
    to_country: z.string().min(1, { message: 'requiredField' }),
    description: z.string().min(10, { message: 'descriptionTooShort' }),
    weight_kg: z.coerce.number().min(1, { message: 'minimumWeight' }).max(50, { message: 'maxWeight' }),
    item_type: z.nativeEnum(ITEM_TYPES),
    item_size: z.nativeEnum(ITEM_SIZES),
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

const SenderLanding = () => {
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();
  const { data: verificationInfo, isLoading: isVerificationStatusLoading } = useVerificationStatus();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isForbiddenOpen, setIsForbiddenOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const formSchema = useMemo(() => getFormSchema(!!user), [user]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      from_country: 'Iraq',
      to_country: '',
      description: '',
      weight_kg: 1,
      item_type: 'regular',
      item_size: 'S',
    },
  });

  const totalSteps = useMemo(() => (user ? 3 : 4), [user]);
  const progress = useMemo(() => (currentStep / totalSteps) * 100, [currentStep, totalSteps]);

  const stepFields: (keyof z.infer<typeof formSchema>)[][] = useMemo(() => {
    const steps: (keyof z.infer<typeof formSchema>)[][] = [
      ['from_country', 'to_country'],
      ['description', 'weight_kg'],
      ['item_type', 'item_size'],
    ];

    if (!user) {
      steps.push(['full_name', 'phone']);
    }

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

  const formatPhoneNumber = (phone: string): string => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('07')) {
      cleanPhone = cleanPhone.substring(1);
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('9647')) {
      cleanPhone = cleanPhone.substring(3);
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith('+9647')) {
      cleanPhone = cleanPhone.substring(4);
    }
    return cleanPhone;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let userIdForOrder: string;
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
              address: 'N/A',
              role: 'sender',
            },
          },
        });

        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            throw new Error('رقم الهاتف هذا مسجل بالفعل. يرجى تسجيل الدخول.');
          }
          throw signUpError;
        }

        if (!signUpData.user) throw new Error("فشل في إنشاء حساب المستخدم. يرجى المحاولة مرة أخرى.");
        userIdForOrder = signUpData.user.id;

        const { error: passwordError } = await supabase
          .from('user_passwords')
          .insert({ id: userIdForOrder, password: randomPassword });

        if (passwordError) console.error('Error storing password:', passwordError);
      } else {
        const isVerified = verificationInfo?.status === 'approved';
        if (!isVerified) {
          showError('verificationRequiredTitle');
          navigate('/verification');
          return;
        }
        userIdForOrder = user.id;
      }

      const { error: orderError } = await supabase.from('general_orders').insert({
        user_id: userIdForOrder,
        from_country: values.from_country,
        to_country: values.to_country,
        description: values.description,
        weight_kg: values.weight_kg,
        item_type: values.item_type,
        item_size: values.item_size,
        is_valuable: false,
        insurance_requested: false,
        insurance_percentage: 0,
        status: 'new',
      });

      if (orderError) throw orderError;

      if (isNewUser) {
        await supabase.auth.signOut();
        setShowSuccessModal(true);
      } else {
        showSuccess('تم إرسال طلب الشحن العام بنجاح!');
        queryClient.invalidateQueries({ queryKey: ['sentRequests', userIdForOrder] });
        navigate('/my-requests');
      }
    } catch (err: any) {
      console.error('Error in order submission flow:', err);
      showError(err.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setIsForbiddenOpen(true);
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
    <>
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
        <Card className="max-w-2xl mx-auto mb-12">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl font-bold text-center">
              أرسل أغراضك الآن
            </CardTitle>
            <Progress value={progress} className="mt-4" />
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                <OrderForm form={form} currentStep={currentStep} isLoggedIn={!!user} />
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
                    <Button type="button" onClick={handleFinalSubmit} className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      إرسال الطلب
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        <BenefitsSection />
      </div>
      <ForbiddenItemsDialog 
        isOpen={isForbiddenOpen} 
        onOpenChange={setIsForbiddenOpen} 
        onConfirm={() => form.handleSubmit(onSubmit)()} 
      />
      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="تم إنشاء حسابك بنجاح! ستصلك رسالة نصية بكلمة المرور خلال ساعة."
      />
    </>
  );
};

export default SenderLanding;