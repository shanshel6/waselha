"use client";

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { countries } from '@/lib/countries';
import { calculateShippingCost } from '@/lib/pricing';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DollarSign, Package } from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';
import { Badge } from '@/components/ui/badge';

const orderSchema = z.object({
  from_country: z.string().min(1, { message: "requiredField" }),
  to_country: z.string().min(1, { message: "requiredField" }),
  description: z.string().min(10, { message: "descriptionTooShort" }),
  is_valuable: z.boolean().default(false),
  has_insurance: z.boolean().default(false),
  weight_kg: z.coerce.number().min(1, { message: "minimumWeight" }).max(50, { message: "maxWeight" }),
});

const PlaceOrder = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      from_country: "Iraq",
      to_country: "",
      description: "",
      is_valuable: false,
      has_insurance: false,
      weight_kg: 1,
    },
  });

  const { from_country, to_country, weight_kg, has_insurance, is_valuable } = form.watch();

  // Auto-manage Iraq selection (same logic as AddTrip)
  React.useEffect(() => {
    // If from_country is changed and it's not Iraq, set to_country to Iraq
    if (from_country && from_country !== "Iraq" && to_country && to_country !== "Iraq") {
      form.setValue("to_country", "Iraq");
    }
    // If to_country is changed and it's not Iraq, set from_country to Iraq
    else if (to_country && to_country !== "Iraq" && from_country && from_country !== "Iraq") {
      form.setValue("from_country", "Iraq");
    }
    // If both are Iraq (somehow), reset to_country
    else if (from_country === "Iraq" && to_country === "Iraq") {
      form.setValue("to_country", "");
    }
  }, [from_country, to_country, form]);

  const priceCalculation = useMemo(() => {
    if (!from_country || !to_country || from_country === to_country || (from_country !== 'Iraq' && to_country !== 'Iraq')) {
      return null;
    }
    
    const result = calculateShippingCost(from_country, to_country, weight_kg);
    
    if (result.error) return result;

    let totalPriceUSD = result.totalPriceUSD;
    
    if (has_insurance) {
      totalPriceUSD *= 2; // Double price for insurance
    }
    
    const totalPriceIQD = totalPriceUSD * 1400; // Assuming 1400 IQD/USD rate from pricing.ts

    return {
      pricePerKgUSD: result.pricePerKgUSD,
      totalPriceUSD,
      totalPriceIQD,
      error: null
    };
  }, [from_country, to_country, weight_kg, has_insurance]);

  const onSubmit = async (values: z.infer<typeof orderSchema>) => {
    if (!user) {
      showError(t('mustBeLoggedIn'));
      navigate('/login');
      return;
    }

    if (!priceCalculation || priceCalculation.error) {
        showError(t('orderSubmittedError'));
        return;
    }

    const { error } = await supabase
      .from('general_orders')
      .insert({
        user_id: user.id,
        from_country: values.from_country,
        to_country: values.to_country,
        description: values.description,
        weight_kg: values.weight_kg,
        is_valuable: values.is_valuable,
        has_insurance: values.has_insurance,
      });

    if (error) {
      console.error('Error placing order:', error);
      showError(t('orderSubmittedError'));
    } else {
      showSuccess(t('orderSubmittedSuccess'));
      navigate('/my-requests'); 
    }
  };

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('placeOrder')}</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl mx-auto">
          
          <Card>
            <CardHeader><CardTitle>{t('tripRoute')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
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
              <div className="text-sm text-muted-foreground p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                {t('eitherFromOrToIraq')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('packageDetails')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('packageWeightKg')}</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="1" max="50" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('orderDescription')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t('orderDescriptionPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="is_valuable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                            field.onChange(checked);
                            // Reset insurance if not valuable
                            if (!checked) {
                                form.setValue('has_insurance', false);
                            }
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t('isValuable')}</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              {is_valuable && (
                <FormField
                  control={form.control}
                  name="has_insurance"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 bg-blue-50 dark:bg-blue-900/30">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('insuranceOption')}</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {priceCalculation && !priceCalculation.error && (
            <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 p-4">
              <CardHeader className="p-0">
                <CardTitle className="text-lg flex items-center gap-2 text-green-800 dark:text-green-300">
                  <DollarSign className="h-5 w-5" />
                  {t('estimatedCost')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-2 flex justify-between items-center">
                <div>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-200">
                    ${priceCalculation.totalPriceUSD.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {priceCalculation.totalPriceIQD.toLocaleString('en-US')} IQD
                  </p>
                </div>
                {has_insurance && (
                    <Badge variant="default" className="bg-blue-600 hover:bg-blue-600/90">
                        {t('insuranceOption')}
                    </Badge>
                )}
              </CardContent>
            </Card>
          )}
          
          {priceCalculation && priceCalculation.error && (
             <div className="text-sm text-destructive text-center p-3 border border-destructive rounded-md">
                {priceCalculation.error}
             </div>
          )}

          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={form.formState.isSubmitting || !priceCalculation || !!priceCalculation.error}>
            {t('placeOrder')}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default PlaceOrder;