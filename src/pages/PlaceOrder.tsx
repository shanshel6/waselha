"use client";

import React from 'react';
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
import { DollarSign } from 'lucide-react';

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

  // Auto-manage Iraq selection
  React.useEffect(() => {
    if (from_country && from_country !== "Iraq" && to_country !== "Iraq") {
      form.setValue("to_country", "Iraq");
    } else if (to_country && to_country !== "Iraq" && from_country !== "Iraq") {
      form.setValue("from_country", "Iraq");
    } else if (from_country === "Iraq" && to_country === "Iraq") {
      form.setValue("to_country", "");
    }
  }, [from_country, to_country, form]);

  // Calculate base shipping cost
  const baseCost = React.useMemo(() => {
    if (from_country && to_country) {
      return calculateShippingCost(from_country, to_country, weight_kg);
    }
    return null;
  }, [from_country, to_country, weight_kg]);

  // Calculate insurance multiplier based on percentage
  const insuranceMultiplier = React.useMemo(() => {
    const percentage = insurance_percentage;
    if (percentage === 0) return 1;
    if (percentage === 25) return 1.5;
    if (percentage === 50) return 2;
    if (percentage === 75) return 2.5;
    if (percentage === 100) return 3;
    return 1;
  }, [insurance_percentage]);

  // Calculate final cost with insurance
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
          weight_kg: values.weight_kg, // Include weight_kg
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
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t('placeOrder')}</CardTitle>
            <CardDescription>{t('orderDescriptionPlaceholder')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            {countries.map((country) => (
                              <SelectItem key={country} value={country} className="flex items-center">
                                <CountryFlag country={country} showName />
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
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectCountry')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country} value={country} className="flex items-center">
                                <CountryFlag country={country} showName />
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="text-sm text-muted-foreground p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                  {t('eitherFromOrToIraq')}
                </div>
                
                <FormField
                  control={form.control}
                  name="weight_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('packageWeightKg')} ({field.value} kg)
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={50}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="mt-4"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="insurance_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('insuranceCoverage')} ({getInsuranceLabel(field.value)})
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={25}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="mt-4"
                        />
                      </FormControl>
                      <div className="text-sm text-muted-foreground mt-2">
                        {field.value === 0 && t('noExtraCost')}
                        {field.value === 25 && t('insurance25Description')}
                        {field.value === 50 && t('insurance50Description')}
                        {field.value === 75 && t('insurance75Description')}
                        {field.value === 100 && t('insurance100Description')}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="text-sm text-muted-foreground p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  {t('insuranceExplanation')}
                </div>
                
                {finalCost && finalCost.totalPriceUSD > 0 && (
                  <Card className="bg-primary/10 dark:bg-primary/20 p-6 rounded-lg space-y-4 border border-primary/20">
                    <h3 className="text-xl font-semibold text-center text-primary">{t('estimatedCost')}</h3>
                    {finalCost.error ? (
                      <p className="text-red-500 text-center font-medium">{finalCost.error}</p>
                    ) : (
                      <>
                        <div className="text-center">
                          <span className="text-sm text-muted-foreground">Total (USD)</span>
                          <p className="text-4xl font-bold text-foreground flex items-center justify-center">
                            <DollarSign className="h-7 w-7 mr-1 text-primary" />
                            {finalCost.totalPriceUSD.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center">
                          <span className="text-sm text-muted-foreground">Total (IQD)</span>
                          <p className="text-2xl font-bold text-foreground">
                            {finalCost.totalPriceIQD.toLocaleString('en-US')} IQD
                          </p>
                        </div>
                        <div className="text-center border-t pt-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {t('pricePerKg')}: ${finalCost.pricePerKgUSD.toFixed(2)}
                          </span>
                        </div>
                        {insurance_percentage > 0 && (
                          <div className="text-center">
                            <span className="text-xs text-muted-foreground">
                              {t('includesInsurance')} ({insurance_percentage}%)
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    <p className="text-xs text-center text-muted-foreground pt-4">
                      {t('priceCalculatorNote')}
                    </p>
                  </Card>
                )}
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('orderDescription')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t('orderDescriptionPlaceholder')} 
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full">
                  {t('submit')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlaceOrder;