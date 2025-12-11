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
  const { user, isLoading: isSessionLoading } = useSession();
  const { data: verificationInfo, isLoading: isVerificationStatusLoading } = useVerificationStatus();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = async (values: any) => {
    if (isSubmitting || hasSubmitted) return;
    setIsSubmitting(true);

    // If user is not logged in, save data and redirect to login
    if (!user) {
      try {
        // Store form data in localStorage
        localStorage.setItem('pendingTripData', JSON.stringify(values));
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

    try {
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
        is_approved: false,
      });

      if (error) {
        console.error('Error adding trip:', error);
        throw new Error(error.message || 'Failed to create trip');
      }

      setHasSubmitted(true);
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
    } finally {
      setIsSubmitting(false);
      // Clear pending data
      localStorage.removeItem('pendingTripData');
    }
  };

  // Submit pending trip after login - run only once
  useEffect(() => {
    const submitPendingTrip = async () => {
      if (user && !hasSubmitted) {
        const pendingData = localStorage.getItem('pendingTripData');
        if (pendingData) {
          try {
            // Mark as submitted immediately to prevent duplicate runs
            setHasSubmitted(true);
            const data = JSON.parse(pendingData);
            
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
              return;
            }

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
              is_approved: false,
            });

            if (error) {
              console.error('Error adding trip:', error);
              throw new Error(error.message || 'Failed to create trip');
            }

            // Clear localStorage after successful submission
            localStorage.removeItem('pendingTripData');
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
          }
        }
      }
    };

    submitPendingTrip();
    
    // Cleanup function to prevent memory leaks
    return () => {
      // Any cleanup if needed
    };
  }, [user, navigate, queryClient, hasSubmitted]);

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