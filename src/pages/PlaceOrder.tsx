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
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { countries } from '@/lib/countries';
import CountryFlag from '@/components/CountryFlag';
import { calculateShippingCost } from '@/lib/pricing';

const orderSchema = z.object({
  from_country: z.string().min(1, { message: "requiredField" }),
  to_country: z.string().min(1, { message: "requiredField" }),
  description: z.string().min(10, { message: "descriptionTooShort" }),
  weight_kg: z.coerce.number().min(1, { message: "minimumWeight" }).max(50, { message: "maxWeight" }),
  is_valuable: z.boolean().default(false),
  insurance_requested: z.boolean().default(false),
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
      is_valuable: false,
      insurance_requested: false,
    },
  });

  const { from_country, to_country, is_valuable, weight_kg } = form.watch();

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

  // Calculate estimated cost
  const estimatedCost = React.useMemo(() => {
    if (from_country && to_country) {
      return calculateShippingCost(from_country, to_country, weight_kg);
    }
    return null;
  }, [from_country, to_country, weight_kg]);

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
          is_valuable: values.is_valuable,
          insurance_requested: values.insurance_requested && values.is_valuable,
          status: 'new',
        });

      if (error) throw error;

      showSuccess(t('orderSubmittedSuccess'));
      // Redirect to My Requests page instead of General Orders
      navigate('/my-requests');
    } catch (error: any) {
      console.error('Error placing order:', error);
      showError(t('orderSubmittedError'));
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
                
                {estimatedCost && estimatedCost.totalPriceUSD > 0 && (
                  <Card className="bg-primary/10 p-4">
                    <CardTitle className="text-lg mb-2 text-center">
                      {t('estimatedCost')}
                    </CardTitle>
                    <div className="flex justify-around text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Total (USD)</p>
                        <p className="font-bold text-xl">${estimatedCost.totalPriceUSD.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total (IQD)</p>
                        <p className="font-bold text-xl">{estimatedCost.totalPriceIQD.toLocaleString('en-US')}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {t('pricePerKg')}: ${estimatedCost.pricePerKgUSD.toFixed(2)}
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
                
                <FormField
                  control={form.control}
                  name="is_valuable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          {t('isValuable')}
                        </FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {is_valuable && (
                  <FormField
                    control={form.control}
                    name="insurance_requested"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-blue-50 dark:bg-blue-900/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            {t('insuranceOption')}
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                
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