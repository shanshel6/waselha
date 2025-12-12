"use client";
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { countries } from '@/lib/countries';
import CountryFlag from '@/components/CountryFlag';
import { calculateShippingCost, ITEM_TYPES, ITEM_SIZES, ItemType, ItemSize } from '@/lib/pricing';
import { DollarSign, Loader2, User, Phone } from 'lucide-react';
import { arabicCountries } from '@/lib/countries-ar';
import ForbiddenItemsDialog from '@/components/ForbiddenItemsDialog';
import { Input } from '@/components/ui/input';

const orderSchema = z.object({
  full_name: z.string().min(1, { message: 'requiredField' }),
  phone: z.string().min(10, { message: 'phoneMustBe10To12Digits' }).max(12, { message: 'phoneMustBe10To12Digits' }).regex(/^\d+$/, { message: 'phoneMustBeNumbers' }),
  from_country: z.string().min(1, { message: 'requiredField' }),
  to_country: z.string().min(1, { message: 'requiredField' }),
  description: z.string().min(10, { message: 'descriptionTooShort' }),
  weight_kg: z.coerce.number().min(1, { message: 'minimumWeight' }).max(50, { message: 'maxWeight' }),
  item_type: z.nativeEnum(ITEM_TYPES),
  item_size: z.nativeEnum(ITEM_SIZES),
});

interface OrderFormProps {
  onSubmit: (values: z.infer<typeof orderSchema>) => void;
  isSubmitting: boolean;
}

export const OrderForm: React.FC<OrderFormProps> = ({ onSubmit, isSubmitting }) => {
  const { t } = useTranslation();
  const [isForbiddenOpen, setIsForbiddenOpen] = useState(false);

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      from_country: 'Iraq',
      to_country: '',
      description: '',
      weight_kg: 1,
      item_type: 'regular',
      item_size: 'S',
    },
  });

  const { from_country, to_country, weight_kg, item_type, item_size } = form.watch();

  React.useEffect(() => {
    if (from_country && from_country !== 'Iraq' && to_country !== 'Iraq') {
      form.setValue('to_country', 'Iraq');
    } else if (to_country && to_country !== 'Iraq' && from_country !== 'Iraq') {
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

  const handleFormSubmit = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setIsForbiddenOpen(true);
    }
  };

  const onConfirmSubmit = () => {
    onSubmit(form.getValues());
  };

  return (
    <>
      <Card className="max-w-2xl mx-auto mb-12">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold text-center">
            أرسل أغراضك الآن
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }} className="space-y-6">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      الاسم الكامل
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسمك الكامل" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      رقم الهاتف
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: 07701234567" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      سيتم استخدام هذا الرقم لإنشاء حسابك إذا لم تكن مسجلاً.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('orderDescription')}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder={t('orderDescriptionPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              {baseCost && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-6 w-6 text-primary" />
                      <div className="text-sm">
                        <p className="font-semibold">{t('estimatedCost')}</p>
                        {baseCost.error ? (
                          <p className="text-xs text-destructive mt-1">{baseCost.error}</p>
                        ) : (
                          <>
                            <p className="mt-1">{baseCost.totalPriceUSD.toFixed(2)} USD</p>
                            <p className="text-xs text-muted-foreground">≈ {baseCost.totalPriceIQD.toLocaleString('ar-IQ')} IQD</p>
                            <p className="text-xs text-muted-foreground mt-1">{t('pricePerKg')}: ${baseCost.pricePerKgUSD.toFixed(2)} USD/kg</p>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <p className="text-xs text-muted-foreground">
                لا تقم بطلب شحن لبضائع ممنوعة أو خطرة.{' '}
                <button
                  type="button"
                  onClick={() => setIsForbiddenOpen(true)}
                  className="underline underline-offset-2 text-primary hover:text-primary/80"
                >
                  انقر هنا لقراءة قائمة المواد المحظورة
                </button>
              </p>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                إرسال الطلب
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <ForbiddenItemsDialog
        isOpen={isForbiddenOpen}
        onOpenChange={setIsForbiddenOpen}
        onConfirm={onConfirmSubmit}
      />
    </>
  );
};