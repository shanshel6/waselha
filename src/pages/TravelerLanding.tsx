"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useVerificationStatus } from '@/hooks/use-verification-status';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { TripForm } from '@/components/traveler-landing/TripForm';
import { BenefitsSection } from '@/components/traveler-landing/BenefitsSection';
import { Loader2 } from 'lucide-react';

const BUCKET_NAME = 'trip-tickets';

const TravelerLanding = () => {
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();
  const { data: verificationInfo, isLoading: isVerificationStatusLoading } = useVerificationStatus();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const createTemporaryUser = async (values: any) => {
    const password = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedPhone = formatPhoneNumber(values.phone);
    const fullPhone = `+964${formattedPhone}`;
    
    const fullNameParts = values.full_name.trim().split(/\s+/);
    const firstName = fullNameParts[0] || '';
    const lastName = fullNameParts.slice(1).join(' ') || '';

    const { data, error } = await supabase.auth.signUp({
      phone: fullPhone,
      password: password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: values.phone,
          address: values.traveler_location,
          role: 'traveler',
        },
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        throw new Error('رقم الهاتف هذا مسجل بالفعل. يرجى تسجيل الدخول.');
      }
      throw error;
    }

    if (data.user) {
      const { error: passwordError } = await supabase
        .from('user_passwords')
        .insert({
          id: data.user.id,
          password: password,
        });
        
      if (passwordError) {
        console.error('Error storing password:', passwordError);
      }
    }

    return data;
  };

  const handleSubmit = async (values: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      let currentUser = user;
      let isNewUser = false;
      
      if (!currentUser) {
        isNewUser = true;
        const userData = await createTemporaryUser(values);
        currentUser = userData.user;
        if (!currentUser) {
            throw new Error("فشل في إنشاء حساب المستخدم.");
        }
        showSuccess('تم إنشاء حساب مؤقت لك. سيتم إرسال كلمة المرور إلى المسؤول.');
      } else {
        const isVerified = verificationInfo?.status === 'approved';
        if (!isVerified) {
          showError('verificationRequiredTitle');
          navigate('/verification');
          setIsSubmitting(false);
          return;
        }
      }
      
      if (!values.ticket_file) {
        throw new Error('يرجى تحميل تذكرة الطيران');
      }
      
      const ticketUrl = await uploadTicketAndGetUrl(values.ticket_file, currentUser!.id);
      
      const { calculateTravelerProfit } = await import('@/lib/pricing');
      const profit = calculateTravelerProfit(values.from_country, values.to_country, values.free_kg);
      const charge_per_kg = profit ? profit.pricePerKgUSD : 0;
      
      const { error: tripError } = await supabase.from('trips').insert({
        user_id: currentUser!.id,
        from_country: values.from_country,
        to_country: values.to_country,
        trip_date: values.trip_date,
        free_kg: values.free_kg,
        traveler_location: values.traveler_location,
        notes: values.notes,
        charge_per_kg: charge_per_kg,
        ticket_file_url: ticketUrl,
        is_approved: false,
      });
      
      if (tripError) {
        throw tripError;
      }
      
      if (isNewUser) {
        await supabase.auth.signOut();
        showSuccess('تمت إضافة الرحلة بنجاح! يمكنك الآن تسجيل الدخول بحسابك الجديد.');
        navigate('/login');
      } else {
        showSuccess('تمت إضافة الرحلة بنجاح! في انتظار موافقة المسؤول.');
        queryClient.invalidateQueries({ queryKey: ['userTrips', currentUser!.id] });
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        queryClient.invalidateQueries({ queryKey: ['pendingTrips'] });
        navigate('/my-flights');
      }
      
    } catch (err: any) {
      console.error('Error creating trip:', err);
      showError(err.message || 'حدث خطأ أثناء إضافة الرحلة');
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
      <TripForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      <BenefitsSection />
    </div>
  );
};

export default TravelerLanding;