"use client";
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { countries } from '@/lib/countries';
import CountryFlag from '@/components/CountryFlag';
import { calculateShippingCost, ITEM_TYPES, ITEM_SIZES, ItemType, ItemSize } from '@/lib/pricing';
import { DollarSign, User, Phone } from 'lucide-react';
import { arabicCountries } from '@/lib/countries-ar';
import { Input } from '@/components/ui/input';

interface OrderFormProps {
  form: UseFormReturn<any>;
  currentStep: number;
  isLoggedIn: boolean;
}

export const OrderForm: React.FC<OrderFormProps> = ({ form, currentStep, isLoggedIn }) => {
  const { t } = useTranslation();
  const { from_country, to_country, weight_kg, item_type, item_size } = form.watch();

  const baseCost = useMemo(() => {
    if (from_country && to_country && item_type && item_size) {
      return calculateShippingCost(from_country, to_country, weight_kg, item_type, item_size);
    }
    return null;
  }, [from_country, to_country, weight_kg, item_type, item_size]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Route
        return (
          <div className="space-y-4">
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
        );
      case 2: // Item Details
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('orderDescription')}</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder={t('orderDescriptionPlaceholder')} {...field} />
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
          </div>
        );
      case 3: // Item Properties & Cost
        return (
          <div className="space-y-4">
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
          </div>
        );
      case 4: // Personal Details (guest only)
        if (!isLoggedIn) {
          return (
            <div className="space-y-4">
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
                      رقم الواتساب
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
            </div>
          );
        }
        return null;
      default:
        return null;
    }
  };

  return <div key={currentStep} className="animate-fade-in">{renderStepContent()}</div>;
};