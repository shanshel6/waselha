"use client";

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { countries } from '@/lib/countries';
import CountryFlag from '@/components/CountryFlag';
import { calculateShippingCost } from '@/lib/pricing';
import { DollarSign, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ForbiddenItemsDialog from '@/components/ForbiddenItemsDialog';

const orderSchema = z.object({
  from_country: z.string().min(1, { message: "requiredField" }),
  to_country: z.string().min(1, { message: "requiredField" }),
  description: z.string().min(10, { message: "descriptionTooShort" }),
  weight_kg: z.coerce.number().min(1, { message: "minimumWeight" }).max(50, { message: "maxWeight" }),
  insurance_percentage: z.coerce.number().min(0).max(100).default(0),
});

const PlaceOrder = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const navigate = useNavigate();
  const [showHelper, setShowHelper] = useState(false);
  const [isForbiddenOpen, setIsForbiddenOpen] = useState(false);

  useEffect(() => {
    const key = 'hasSeenHelper_placeOrder';
    const seen = typeof window !== 'undefined' ? window.localStorage.getItem(key) : 'true';
    if (!seen) {
      setShowHelper(true);
    }
  }, []);

  const dismissHelper = () => {
    setShowHelper(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('hasSeenHelper_placeOrder', 'true');
    }
  };

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      from_country: "Iraq",
      to_country: "",
      description: "",
      weight_kg: 1,
      insurance_percentage: 0,
    },
  });

  const { from_country, to_country, weight_kg, insurance_percentage } = form.watch();

  React.useEffect(() => {
    if (from_country && from_country !== "Iraq" && to_country !== "Iraq") {
      form.setValue("to_country", "Iraq");
    } else if (to_country && to_country !== "Iraq" && from_country !== "Iraq") {
      form.setValue("from_country", "Iraq");
    } else if (from_country === "Iraq" && to_country === "Iraq") {
      form.setValue("to_country", "");
    }
  }, [from_country, to_country, form]);

  const baseCost = React.useMemo(() => {
    if (from_country && to_country) {
      return calculateShippingCost(from_country, to_country, weight_kg);
    }
    return null;
  }, [from_country, to_country, weight_kg]);

  const insuranceMultiplier = React.useMemo(() => {
    const percentage = insurance_percentage;
    if (percentage === 0) return 1;
    if (percentage === 25) return 1.5;
    if (percentage === 50) return 2;
    if (percentage === 75) return 2.5;
    if (percentage === 100) return 3;
    return 1;
  }, [insurance_percentage]);

  const finalCost = React.useMemo(() => {
    if (!baseCost || baseCost.error) return null;
    
    return {
      totalPriceUSD: baseCost.totalPriceUSD * insuranceMultiplier,
      totalPriceIQD: baseCost.totalPriceIQD * insuranceMultiplier,
      pricePerKgUSD: baseCost.pricePerKgUSD * insuranceMultiplier,
      error: null
    };
  }, [baseCost, insuranceMultiplier]);

  const onSubmit = async (values: z.infer<typeof orderSchema>) => {
    if (!user) {
      showError(t('mustBeLoggedIn'));
      navigate('/login');
      return;
    }

    try {
      const { error } = await supabase
        .from('general_orders')
        .insert({
          user_id: user.id,
          from_country: values.from_country,
          to_country: values.to_country,
          description: values.description,
          weight_kg: values.weight_kg,
          is_valuable: values.insurance_percentage > 0,
          insurance_requested: values.insurance_percentage > 0,
          insurance_percentage: values.insurance_percentage,
          status: 'new',
        });

      if (error) throw error;

      showSuccess(t('orderSubmittedSuccess'));
      navigate('/my-requests');
    } catch (error: any) {
      console.error('Error placing order:', error);
      showError(t('orderSubmittedError'));
    }
  };

  const getInsuranceLabel = (percentage: number) => {
    switch (percentage) {
      case 0: return t('noInsurance');
      case 25: return t('insurance25');
      case 50: return t('insurance50');
      case 75: return t('insurance75');
      case 100: return t('insurance100');
      default: return `${percentage}%`;
    }
  };

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-2xl">{t('placeOrder')}</CardTitle>
            <CardDescription>{t('orderDescriptionPlaceholder')}</CardDescription>
          </CardHeader>
        </Card>

        {showHelper && (
          <div className="mb-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-3 flex items-start gap-2 text-xs md:text-sm">
            <div className="flex-1">
              <p className="font-semibold">ما هو طلب الشحن العام؟</p>
              <p className="text-muted-foreground mt-1">
                عند إنشاء &quot;طلب شحن عام&quot;, سيبحث النظام تلقائياً عن رحلات مطابقة من وإلى نفس الدول،
                ويقوم بإنشاء طلب عادي مع المسافر المناسب. يمكنك متابعة هذه الطلبات من صفحة &quot;طلباتي&quot;.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissHelper}
              className={cn(
                "ml-2 mt-1 text-muted-foreground hover:text-foreground transition-colors"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">تفاصيل الطلب</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* ... باقي الفورم كما هو ... */}

                <div className="text-xs text-muted-foreground">
                  لا تقم بطلب شحن لبضائع ممنوعة أو خطرة.{" "}
                  <button
                    type="button"
                    onClick={() => setIsForbiddenOpen(true)}
                    className="underline underline-offset-2 text-primary hover:text-primary/80"
                  >
                    انقر هنا لقراءة قائمة المواد المحظورة
                  </button>
                </div>

                <Button type="submit" className="w-full">
                  {t('submit')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <ForbiddenItemsDialog
        isOpen={isForbiddenOpen}
        onOpenChange={setIsForbiddenOpen}
        readOnly
      />
    </div>
  );
};

export default PlaceOrder;