"use client";
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { calculateShippingCost, zonedCountries } from '@/lib/pricing';
import { DollarSign } from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';

const PriceCalculator = () => {
  const { t } = useTranslation();
  const [origin, setOrigin] = useState<string>('Iraq');
  const [destination, setDestination] = useState<string>('Turkey');
  const [weight, setWeight] = useState<number>(1);

  const calculation = useMemo(() => {
    if (origin !== 'Iraq' && destination !== 'Iraq') {
      return { pricePerKgUSD: 0, totalPriceUSD: 0, error: t('eitherFromOrToIraq') };
    }
    const result = calculateShippingCost(origin, destination, weight);
    return {
      pricePerKgUSD: result.pricePerKgUSD,
      totalPriceUSD: result.totalPriceUSD,
      error: result.error,
    };
  }, [origin, destination, weight, t]);

  const handleWeightChange = (value: number[]) => {
    setWeight(value[0]);
  };

  return (
    <section className="w-full bg-muted/50 dark:bg-gray-900/50 py-16 md:py-24">
      <div className="container max-w-4xl bg-background p-6 sm:p-8 rounded-2xl shadow-lg border">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">{t('priceCalculator')}</h2>
          <p className="text-muted-foreground mt-2">{t('priceCalculatorDescription')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          {/* Form Section */}
          <div className="space-y-6 md:col-span-3">
            <div>
              <Label htmlFor="origin-country" className="font-semibold">{t('fromCountry')}</Label>
              <Select onValueChange={setOrigin} value={origin}>
                <SelectTrigger id="origin-country" className="mt-2">
                  <SelectValue placeholder={t('selectCountry')} />
                </SelectTrigger>
                <SelectContent>
                  {zonedCountries.map((c) => (
                    <SelectItem key={c} value={c} className="flex items-center">
                      <CountryFlag country={c} showName />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="destination-country" className="font-semibold">{t('toCountry')}</Label>
              <Select onValueChange={setDestination} value={destination}>
                <SelectTrigger id="destination-country" className="mt-2">
                  <SelectValue placeholder={t('selectCountry')} />
                </SelectTrigger>
                <SelectContent>
                  {zonedCountries.map((c) => (
                    <SelectItem key={c} value={c} className="flex items-center">
                      <CountryFlag country={c} showName />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="weight-slider" className="font-semibold">
                {t('packageWeightKg')} ({weight} kg)
              </Label>
              <Slider
                id="weight-slider"
                min={1}
                max={50}
                step={1}
                value={[weight]}
                onValueChange={handleWeightChange}
                className="mt-4"
              />
            </div>
          </div>
          
          {/* Results Section */}
          <div className="bg-primary/10 dark:bg-primary/20 p-6 rounded-lg space-y-4 border border-primary/20 md:col-span-2 flex flex-col justify-center h-full">
            <h3 className="text-xl font-semibold text-center text-primary">{t('estimatedCost')}</h3>
            {calculation.error ? (
              <p className="text-red-500 text-center font-medium">{calculation.error}</p>
            ) : (
              <>
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">Total (USD)</span>
                  <p className="text-4xl font-bold text-foreground flex items-center justify-center">
                    <DollarSign className="h-7 w-7 mr-1 text-primary" />
                    {calculation.totalPriceUSD.toFixed(2)}
                  </p>
                </div>
                <div className="text-center border-t pt-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {t('pricePerKg')}: ${calculation.pricePerKgUSD.toFixed(2)}
                  </span>
                </div>
              </>
            )}
            <p className="text-xs text-center text-muted-foreground pt-4">
              {t('priceCalculatorNote')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PriceCalculator;