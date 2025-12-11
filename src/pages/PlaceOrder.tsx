"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { countries } from '@/lib/countries';
import CountryFlag from '@/components/CountryFlag';
import { calculateShippingCost, ITEM_TYPES, ITEM_SIZES, ItemType, ItemSize } from '@/lib/pricing';
import { DollarSign, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ForbiddenItemsDialog from '@/components/ForbiddenItemsDialog';
import { useVerificationStatus } from '@/hooks/use-verification-status';
import { arabicCountries } from '@/lib/countries-ar';

const orderSchema = z.object({
  from_country: z.string().min(1, { message: 'requiredField' }),
  to_country: z.string().min(1, { message: 'requiredField' }),
  description: z.string().min(10, { message: 'descriptionTooShort' }),
  weight_kg: z
    .coerce.number()
    .min(1, { message: 'minimumWeight' })
    .max(50, { message: 'maxWeight' }),
  item_type: z.nativeEnum(ITEM_TYPES),
  item_size: z.nativeEnum(ITEM_SIZES),
});

const PlaceOrder = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const navigate = useNavigate();
  const { data: verificationInfo, isLoading: isVerificationLoading } = useVerificationStatus();
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
      from_country: 'Iraq',
      to_country: '',
      description: '',
      weight_kg: 1,
      item_type: 'regular',
      item_size: 'S',
    },
  });

  const { from_country, to_country, weight_kg, item_type, item_size } = form.watch();

  // Ensure exactly one side is Iraq (like Trips/AddTrip)
  useEffect(() => {
    if (from_country && from_country !== 'Iraq' && to_country !== 'Iraq') {
      form.setValue('to_country', 'Iraq');
    } else if (
      to_country && to_country !== 'Iraq' && from_country !== 'Iraq'
    ) {
      form.setValue('from_country', 'Iraq');
    } else if (from_country === 'Iraq' && to_country === 'Iraq') {
      form.setValue('to_country', '');
    }
  }, [from_country, to_country, form]);

  const baseCost = useMemo(() => {
    if (from_country && to_country && item_type && item_size) {
      return calculateShippingCost(from_country, to_country, weight_kg, item_type, item_size);
    }
    return null;
  }, [from_country, to_country, weight_kg, item_type, item_size]);

  const onSubmit = async (values: z.infer<typeof orderSchema>) => {
    if (!user) {
      showError(t('mustBeLoggedIn'));
      navigate('/login');
      return;
    }

    // Enforce verification check
    if (verificationInfo?.status !== 'approved') {
      showError(t('verificationRequiredTitle'));
      navigate('/verification');
      return;
    }

    try {
      const { error } = await supabase.from('general_orders').insert({
        user_id: user.id,
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

      if (error) throw error;

      showSuccess(t('orderSubmittedSuccess'));
      navigate('/my-requests');
    } catch (error: any) {
      console.error('Error placing order:', error);
      showError(t('orderSubmittedError'));
    }
  };

  if (isVerificationLoading) {
    return (
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900 flex items-center justify-center">
        <span className="text-sm text-muted-foreground">{t('loading')}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-2xl">{t('placeOrder')}</CardTitle>
            <CardDescription>
              {t('orderDescriptionPlaceholder') || 'أنشئ طلب شحن عام ليتم مطابقته تلقائياً مع رحلات مناسبة.'}
            </CardDescription>
          </CardHeader>
        </Card>

        {showHelper && (
          <div className="mb-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-3 flex items-start gap-2 text-xs md:text-sm">
            <div className="flex-1">
              <p className="font-semibold">ما هو طلب الشحن العام؟</p>
              <p className="text-muted-foreground mt-1">
                عند إنشاء "طلب شحن عام"، سيبحث النظام تلقائياً عن رحلات مطابقة من وإلى نفس الدول، ويقوم بإنشاء طلب عادي مع المسافر المناسب. يمكنك متابعة هذه الطلبات من صفحة "طلباتي".
              </p>
            </div>
            <button
              type="button"
              onClick={dismissHelper}
              className={cn(
                'ml-2 mt-1 text-muted-foreground hover:text-foreground transition-colors',
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
                {/* من / إلى الدول */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="from_country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('fromCountry')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectCountry')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map((c) => (
                              <SelectItem key={c} value={c}>
                                <div className="flex items-center gap-2">
                                  <CountryFlag country={c} />
                                  <span>{arabicCountries[c] || c}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="to_country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('toCountry')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectCountry')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map((c) => (
                              <SelectItem key={c} value={c}>
                                <div className="flex items-center gap-2">
                                  <CountryFlag country={c} />
                                  <span>{arabicCountries[c] || c}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* وصف البضائع */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('orderDescription')}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder={
                            t('orderDescriptionPlaceholder') || 'مثال: ملابس، أجهزة إلكترونية خفيفة، هدايا، كتب...'
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* الوزن */}
                <FormField
                  control={form.control}
                  name="weight_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('packageWeightKg')} ({field.value} kg)
                      </FormLabel>
                      <FormControl>
                        <div className="mt-2">
                          <Slider
                            min={1}
                            max={50}
                            step={1}
                            value={[field.value]}
                            onValueChange={(val) => field.onChange(val[0])}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>1 kg</span>
                            <span>50 kg</span>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Item Type and Size */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="item_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('itemType')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('itemType')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.keys(ITEM_TYPES).map((key) => (
                              <SelectItem key={key} value={key}>
                                {t(`itemType${key.charAt(0).toUpperCase() + key.slice(1)}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="item_size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('itemSize')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('itemSize')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.keys(ITEM_SIZES).map((key) => (
                              <SelectItem key={key} value={key}>
                                {t(`itemSize${key}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* ملخص التكلفة */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-6 w-6 text-primary" />
                      <div className="text-sm">
                        <p className="font-semibold">
                          {t('estimatedCost')}
                        </p>
                        {(!baseCost || baseCost.error) && (
                          <p className="text-xs text-destructive mt-1">
                            {baseCost?.error || t('eitherFromOrToIraq') || 'اختر من/إلى بلد واحد على الأقل العراق واحرص على إدخال وزن صحيح.'}
                          </p>
                        )}
                        {baseCost && !baseCost.error && (
                          <>
                            <p className="mt-1">
                              {baseCost.totalPriceUSD.toFixed(2)} USD
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ≈{' '}
                              {baseCost.totalPriceIQD.toLocaleString(
                                'ar-IQ',
                              )}{' '}
                              IQD
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('pricePerKg')}:{" "}
                              {baseCost.pricePerKgUSD.toFixed(2)} USD/kg
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="text-xs text-muted-foreground">
                  لا تقم بطلب شحن لبضائع ممنوعة أو خطرة.{' '}
                  <button
                    type="button"
                    onClick={() => setIsForbiddenOpen(true)}
                    className="underline underline-offset-2 text-primary hover:text-primary/80"
                  >
                    انقر هنا لقراءة قائمة المواد المحظورة
                  </button>
                </div>

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? t('loading') || 'جاري الإرسال...' : t('submit') || 'إرسال الطلب'}
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