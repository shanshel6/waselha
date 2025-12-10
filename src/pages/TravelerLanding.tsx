"use client";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useVerificationStatus } from '@/hooks/use-verification-status';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { TripForm } from '@/components/traveler-landing/TripForm';
import { BenefitsSection } from '@/components/traveler-landing/BenefitsSection';
import { Loader2 } from 'lucide-react';

const TravelerLanding = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: verificationInfo, isLoading: isVerificationStatusLoading } = useVerificationStatus();
  const queryClient = useQueryClient();
  const [tripData, setTripData] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for pending trip data after login
  useEffect(() => {
    if (user && !tripData) {
      const pendingData = localStorage.getItem('pendingTripData');
      const pendingTicketFileInfo = localStorage.getItem('pendingTicketFileInfo');
      
      if (pendingData && pendingTicketFileInfo) {
        try {
          const data = JSON.parse(pendingData);
          const ticketFileInfo = JSON.parse(pendingTicketFileInfo);
          
          setTripData(data);
          showSuccess('جارٍ إرسال بيانات الرحلة...');
        } catch (e) {
          console.error('Error parsing pending trip data:', e);
        }
      }
    }
  }, [user, tripData]);

  // Submit pending trip after login
  useEffect(() => {
    const submitPendingTrip = async () => {
      if (user && tripData) {
        const pendingTicketFileInfo = localStorage.getItem('pendingTicketFileInfo');
        
        if (!pendingTicketFileInfo) {
          showError('بيانات التذكرة مفقودة. يرجى إعادة ملء النموذج');
          setTripData(null);
          return;
        }
        
        try {
          // Note: In a real implementation, we would need to handle file upload after login
          // For now, we'll show an error since we can't automatically upload the file
          showError('يرجى إعادة تحميل تذكرة الطيران وإرسال الرحلة يدويًا');
          setTripData(null);
          
          // Clear localStorage
          localStorage.removeItem('pendingTripData');
          localStorage.removeItem('pendingTicketFileInfo');
        } catch (err: any) {
          console.error('Error submitting pending trip:', err);
          showError(err.message || 'حدث خطأ أثناء إرسال الرحلة');
          setTripData(null);
        }
      }
    };
    
    submitPendingTrip();
  }, [user, tripData]);

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
      .from('trip-tickets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });
    if (uploadError) {
      console.error('Ticket upload error:', uploadError);
      throw new Error(uploadError.message || 'Failed to upload ticket file.');
    }
    const { data: publicUrlData } = supabase.storage.from('trip-tickets').getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  };

  const createTrip = async (values: any, ticketFile: File, userId: string) => {
    let charge_per_kg = 0;
    // Import calculateTravelerProfit function
    const { calculateTravelerProfit } = await import('@/lib/pricing');
    const profit = calculateTravelerProfit(values.from_country, values.to_country, values.free_kg);
    if (profit) {
      charge_per_kg = profit.pricePerKgUSD;
    }

    const ticketUrl = await uploadTicketAndGetUrl(ticketFile, userId);

    const { error } = await supabase.from('trips').insert({
      user_id: userId,
      from_country: values.from_country,
      to_country: values.to_country,
      trip_date: values.trip_date.toISOString().split('T')[0],
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

    return true;
  };

  const handleSubmit = async (values: any, ticketFile: File | null) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    // If user is not logged in, save data and redirect to login
    if (!user) {
      try {
        // Store form data in localStorage
        localStorage.setItem('pendingTripData', JSON.stringify(values));
        
        // Store ticket file info (we can't store the file itself, but we can store metadata)
        if (ticketFile) {
          const ticketFileInfo = {
            name: ticketFile.name,
            type: ticketFile.type,
            size: ticketFile.size,
            lastModified: ticketFile.lastModified
          };
          localStorage.setItem('pendingTicketFileInfo', JSON.stringify(ticketFileInfo));
        }
        
        showSuccess('يرجى تسجيل الدخول لإكمال إضافة الرحلة');
        navigate('/login');
      } catch (err: any) {
        console.error('Error saving pending trip data:', err);
        showError('حدث خطأ أثناء حفظ بيانات الرحلة');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // User is logged in - proceed with trip creation
    const isVerified = verificationInfo?.status === 'approved';
    if (!isVerified) {
      showError('verificationRequiredTitle');
      navigate('/verification');
      setIsSubmitting(false);
      return;
    }

    if (!ticketFile) {
      showError('ticketRequired');
      setIsSubmitting(false);
      return;
    }

    try {
      await createTrip(values, ticketFile, user.id);
      showSuccess('tripAddedSuccessPending');
      
      // Invalidate queries to refresh the trips list
      queryClient.invalidateQueries({ queryKey: ['userTrips', user.id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['pendingTrips'] });
      
      // Redirect to my-flights page
      navigate('/my-flights');
    } catch (err: any) {
      console.error('Error creating trip:', err);
      showError(err.message || 'tripAddedError');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerificationStatusLoading) {
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