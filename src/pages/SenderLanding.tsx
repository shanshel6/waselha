"use client";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useVerificationStatus } from '@/hooks/use-verification-status';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { OrderForm } from '@/components/sender-landing/OrderForm';
import { BenefitsSection } from '@/components/sender-landing/BenefitsSection';
import { Loader2 } from 'lucide-react';

const SenderLanding = () => {
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();
  const { data: verificationInfo, isLoading: isVerificationStatusLoading } = useVerificationStatus();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (values: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let userIdForOrder: string;
      let isNewUser = false;

      if (!user) {
        isNewUser = true;
        const randomPassword = Math.floor(100000 + Math.random() * 900000).toString();
        const formattedPhone = formatPhoneNumber(values.phone);
        const fullPhone = `+964${formattedPhone}`;
        
        const fullNameParts = values.full_name.trim().split(/\s+/);
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
        showSuccess('تم إنشاء الحساب وإضافة الطلب بنجاح! يمكنك الآن تسجيل الدخول.');
        navigate('/login');
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

  if (isSessionLoading || isVerificationStatusLoading) {
    return (
      <div className="container p-4 flex items-center justify-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <OrderForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      <BenefitsSection />
    </div>
  );
};

export default SenderLanding;