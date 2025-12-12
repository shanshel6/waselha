"use client";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showError } from '@/utils/toast';
import { OrderForm } from '@/components/sender-landing/OrderForm';
import { BenefitsSection } from '@/components/sender-landing/BenefitsSection';
import { Loader2 } from 'lucide-react';

const SenderLanding = () => {
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();

  const handleSubmit = (values: any) => {
    localStorage.setItem('pendingOrder', JSON.stringify(values));
    showError('يجب عليك تسجيل الدخول أولاً لإكمال الطلب.');
    navigate('/login');
  };

  if (isSessionLoading) {
    return (
      <div className="container p-4 flex items-center justify-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <OrderForm onSubmit={handleSubmit} isSubmitting={false} />
      <BenefitsSection />
    </div>
  );
};

export default SenderLanding;