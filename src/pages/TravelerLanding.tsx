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
  const hasSubmittedRef = useRef(false); // Use ref to persist across re-renders

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
    // Remove all non-digit characters
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Handle different phone number formats for Iraq
    if (cleanPhone.startsWith('07')) {
      // Format: 07XXXXXXXXX (10 digits total)
      if (cleanPhone.length === 11 && cleanPhone.startsWith('07')) {
        cleanPhone = cleanPhone.substring(1); // Remove leading 0
      }
    } else if (cleanPhone.startsWith('9647')) {
      // Format: 9647XXXXXXXXX (12 digits total)
      cleanPhone = cleanPhone.substring(3); // Remove country code 964
    } else if (cleanPhone.startsWith('+9647')) {
      // Format: +9647XXXXXXXXX
      cleanPhone = cleanPhone.substring(4); // Remove country code +964
    }
    
    return cleanPhone;
  };

  const generateEmailFromPhone = (phone: string): string => {
    const cleanPhone = formatPhoneNumber(phone);
    // Ensure we have a valid 10-digit Iraqi phone number
    if (cleanPhone.length === 10 && cleanPhone.startsWith('7')) {
      return `user-${cleanPhone}@waslaha.app`;
    }
    // If it's not a standard format, use the cleaned version with prefix
    return `user-${cleanPhone}@waslaha.app`;
  };

  const createTemporaryUser = async (phone: string, fullName: string) => {
    // Generate a simple password
    const password = Math.random().toString(36).slice(-8);
    
    // Create a valid email using phone number
    const email = generateEmailFromPhone(phone);
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format generated');
    }
    
    try {
      // Sign up the user without email confirmation
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: 'traveler',
            is_temporary: true
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // If user already exists, try to sign in
      if (data.user && !data.session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });
        if (signInError) {
          throw new Error(signInError.message);
        }
        return signInData;
      }

      // Update profile with phone number
      if (data.user) {
        // Small delay to ensure user is created in profiles table
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ phone: phone })
          .eq('id', data.user.id);
        if (updateError) {
          console.error('Error updating profile with phone:', updateError);
        }
      }

      // Log password for debugging (in production, send via SMS)
      console.log(`Temporary password for ${phone}: ${password}`);
      return data;
    } catch (error: any) {
      console.error('Error creating temporary user:', error);
      throw error;
    }
  };

  const handleSubmit = async (values: any) => {
    // Prevent multiple submissions
    if (isSubmitting || hasSubmittedRef.current) return;
    setIsSubmitting(true);
    hasSubmittedRef.current = true;
    
    try {
      let currentUser = user;
      
      // If user is not logged in, create a temporary user
      if (!currentUser) {
        const userData = await createTemporaryUser(values.phone, values.full_name);
        currentUser = userData.user;
        // Show success message about account creation
        showSuccess('تم إنشاء حساب مؤقت لك. سيتم إرسال كلمة المرور إلى المسؤول.');
      }
      
      // Check if user is verified (if logged in)
      let isVerified = false;
      if (currentUser) {
        const { data: verificationData } = await supabase
          .from('profiles')
          .select('is_verified')
          .eq('id', currentUser.id)
          .single();
        isVerified = verificationData?.is_verified || false;
      }
      
      // Check if ticket file is provided
      if (!values.ticket_file) {
        throw new Error('يرجى تحميل تذكرة الطيران');
      }
      
      // Upload ticket and get URL
      const ticketUrl = await uploadTicketAndGetUrl(values.ticket_file, currentUser!.id);
      
      let charge_per_kg = 0;
      const { calculateTravelerProfit } = await import('@/lib/pricing');
      const profit = calculateTravelerProfit(values.from_country, values.to_country, values.free_kg);
      if (profit) {
        charge_per_kg = profit.pricePerKgUSD;
      }
      
      const { error } = await supabase.from('trips').insert({
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
      
      if (error) {
        console.error('Error adding trip:', error);
        throw new Error(error.message || 'Failed to create trip');
      }
      
      showSuccess('تمت إضافة الرحلة بنجاح! في انتظار موافقة المسؤول.');
      
      // Invalidate queries to refresh the trips list
      queryClient.invalidateQueries({ queryKey: ['userTrips', currentUser!.id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['pendingTrips'] });
      
      // Redirect to my-flights page
      navigate('/my-flights');
    } catch (err: any) {
      console.error('Error creating trip:', err);
      showError(err.message || 'حدث خطأ أثناء إضافة الرحلة');
      hasSubmittedRef.current = false; // Reset on error
    } finally {
      setIsSubmitting(false);
      // Clear pending data
      localStorage.removeItem('pendingTripData');
      localStorage.removeItem('pendingTripFile');
    }
  };

  // Submit pending trip after login - run only once
  useEffect(() => {
    // Only run if user is logged in and we have pending data
    if (!user) return;
    
    const pendingData = localStorage.getItem('pendingTripData');
    const pendingFileData = localStorage.getItem('pendingTripFile');
    
    // If no pending data, nothing to do
    if (!pendingData || !pendingFileData) return;
    
    // If already submitted, don't run again
    if (hasSubmittedRef.current) return;
    
    // Mark as submitted to prevent multiple runs
    hasSubmittedRef.current = true;
    
    const submitPendingTrip = async () => {
      try {
        const data = JSON.parse(pendingData);
        const fileData = JSON.parse(pendingFileData);
        
        // Check if user is verified
        const { data: verificationData } = await supabase
          .from('profiles')
          .select('is_verified')
          .eq('id', user.id)
          .single();
        const isVerified = verificationData?.is_verified;
        
        if (!isVerified) {
          showError('verificationRequiredTitle');
          navigate('/verification');
          hasSubmittedRef.current = false; // Reset so user can try again after verification
          return;
        }
        
        // Reconstruct the file from stored data
        const blob = await fetch(fileData.data).then(res => res.blob());
        const file = new File([blob], fileData.name, { type: fileData.type });
        
        // Upload ticket and get URL
        const ticketUrl = await uploadTicketAndGetUrl(file, user.id);
        
        let charge_per_kg = 0;
        const { calculateTravelerProfit } = await import('@/lib/pricing');
        const profit = calculateTravelerProfit(data.from_country, data.to_country, data.free_kg);
        if (profit) {
          charge_per_kg = profit.pricePerKgUSD;
        }
        
        const { error } = await supabase.from('trips').insert({
          user_id: user.id,
          from_country: data.from_country,
          to_country: data.to_country,
          trip_date: data.trip_date,
          free_kg: data.free_kg,
          traveler_location: data.traveler_location,
          notes: data.notes,
          charge_per_kg: charge_per_kg,
          ticket_file_url: ticketUrl,
          is_approved: false,
        });
        
        if (error) {
          console.error('Error adding trip:', error);
          throw new Error(error.message || 'Failed to create trip');
        }
        
        // Clear localStorage after successful submission
        localStorage.removeItem('pendingTripData');
        localStorage.removeItem('pendingTripFile');
        
        showSuccess('تمت إضافة الرحلة بنجاح! في انتظار موافقة المسؤول.');
        
        // Invalidate queries to refresh the trips list
        queryClient.invalidateQueries({ queryKey: ['userTrips', user.id] });
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        queryClient.invalidateQueries({ queryKey: ['pendingTrips'] });
        
        // Redirect to my-flights page after a short delay to show the success message
        setTimeout(() => {
          navigate('/my-flights');
        }, 2000);
      } catch (err: any) {
        console.error('Error submitting pending trip:', err);
        showError(err.message || 'حدث خطأ أثناء إرسال الرحلة');
        // Clear pending data on error to prevent infinite loop
        localStorage.removeItem('pendingTripData');
        localStorage.removeItem('pendingTripFile');
        hasSubmittedRef.current = false; // Reset on error
      }
    };
    
    submitPendingTrip();
    
    // Cleanup function
    return () => {
      hasSubmittedRef.current = false;
    };
  }, [user, navigate, queryClient]);

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