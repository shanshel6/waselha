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

  const handleSubmit = async (values: any) => {
    // Prevent multiple submissions
    if (isSubmitting || hasSubmittedRef.current) return;
    
    setIsSubmitting(true);
    hasSubmittedRef.current = true;

    // If user is not logged in, save data and redirect to login
    if (!user) {
      try {
        // Store form data in localStorage
        localStorage.setItem('pendingTripData', JSON.stringify({
          ...values,
          ticket_file: null // Don't store the file object
        }));
        
        // Store the file separately as a blob URL if it exists
        if (values.ticket_file) {
          const fileReader = new FileReader();
          fileReader.onload = function() {
            localStorage.setItem('pendingTripFile', JSON.stringify({
              name: values.ticket_file.name,
              type: values.ticket_file.type,
              size: values.ticket_file.size,
              data: fileReader.result
            }));
            showSuccess('يرجى تسجيل الدخول لإكمال إضافة الرحلة');
            navigate('/login');
          };
          fileReader.readAsDataURL(values.ticket_file);
        } else {
          showSuccess('يرجى تسجيل الدخول لإكمال إضافة الرحلة');
          navigate('/login');
        }
      } catch (err: any) {
        console.error('Error saving pending trip data:', err);
        showError('حدث خطأ أثناء حفظ بيانات الرحلة');
      } finally {
        setIsSubmitting(false);
        hasSubmittedRef.current = false; // Reset on error
      }
      return;
    }

    // User is logged in - proceed with trip creation
    const isVerified = verificationInfo?.status === 'approved';
    if (!isVerified) {
      showError('verificationRequiredTitle');
      navigate('/verification');
      setIsSubmitting(false);
      hasSubmittedRef.current = false; // Reset so user can try again after verification
      return;
    }

    // Check if ticket file is provided
    if (!values.ticket_file) {
      showError('يرجى تحميل تذكرة الطيران');
      setIsSubmitting(false);
      hasSubmittedRef.current = false;
      return;
    }

    try {
      // Upload ticket and get URL
      const ticketUrl = await uploadTicketAndGetUrl(values.ticket_file, user.id);
      
      let charge_per_kg = 0;
      const { calculateTravelerProfit } = await import('@/lib/pricing');
      const profit = calculateTravelerProfit(values.from_country, values.to_country, values.free_kg);
      if (profit) {
        charge_per_kg = profit.pricePerKgUSD;
      }

      const { error } = await supabase.from('trips').insert({
        user_id: user.id,
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
      queryClient.invalidateQueries({ queryKey: ['userTrips', user.id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['pendingTrips'] });

      // Redirect to my-flights page
      navigate('/my-flights');
    } catch (err: any) {
      console.error('Error creating trip:', err);
      showError(err.message || 'tripAddedError');
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
    const submitPendingTrip = async () => {
      // Prevent multiple submissions
      if (hasSubmittedRef.current || !user) return;
      
      const pendingData = localStorage.getItem('pendingTripData');
      const pendingFileData = localStorage.getItem('pendingTripFile');
      
      if (pendingData && pendingFileData && !hasSubmittedRef.current) {
        // Mark as submitted immediately to prevent duplicate runs
        hasSubmittedRef.current = true;
        
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
          
          // Add the reconstructed file to the data
          const tripData = {
            ...data,
            ticket_file: file
          };

          // Upload ticket and get URL
          const ticketUrl = await uploadTicketAndGetUrl(file, user.id);
          
          let charge_per_kg = 0;
          const { calculateTravelerProfit } = await import('@/lib/pricing');
          const profit = calculateTravelerProfit(tripData.from_country, tripData.to_country, tripData.free_kg);
          if (profit) {
            charge_per_kg = profit.pricePerKgUSD;
          }

          const { error } = await supabase.from('trips').insert({
            user_id: user.id,
            from_country: tripData.from_country,
            to_country: tripData.to_country,
            trip_date: tripData.trip_date,
            free_kg: tripData.free_kg,
            traveler_location: tripData.traveler_location,
            notes: tripData.notes,
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
      }
    };

    submitPendingTrip();
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