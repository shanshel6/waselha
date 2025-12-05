"use client";

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { calculateShippingCost, zonedCountries } from '@/lib/pricing';

const PriceCalculator = () => {
  const { t } = useTranslation();
  const [origin, setOrigin] = useState<string>('Iraq');
  const [destination, setDestination] = useState<string>('Turkey');
  const [weight, setWeight] = useState<number>(1);

  const calculation = useMemo(() => {
    return calculateShippingCost(origin, destination, weight);
  }, [origin, destination, weight]);

  const handleWeightChange = (value: number[]) => {
    setWeight(value[0]);
  };

  return (
    <section className="w-full max-w-4xl py-12 md:py-16">
      <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">{t('priceCalculator')}</CardTitle>
          <CardDescription>{t('priceCalculatorDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mt-6">
          {/* Form Section */}
          <div className="space-y-6">
            <div>
              <Label htmlFor="origin-country" className="font-semibold">{t('fromCountry')}</Label>
              <Select onValueChange={setOrigin} defaultValue={origin}>
                <SelectTrigger id="origin-country" className="mt-2">
                  <SelectValue placeholder={t('selectCountry')} />
                </SelectTrigger>
                <SelectContent>
                  {zonedCountries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="destination-country" className="font-semibold">{t('toCountry')}</Label>
              <Select onValueChange={setDestination} defaultValue={destination}>
                <SelectTrigger id="destination-country" className="mt-2">
                  <SelectValue placeholder={t('selectCountry')} />
                </SelectTrigger>
                <SelectContent>
                  {zonedCountries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="weight-slider" className="font-semibold">{t('packageWeightKg')} ({weight} kg)</Label>
              <Slider
                id="weight-slider"
                min={1}
                max={30}
                step={1}
                value={[weight]}
                onValueChange={handleWeightChange}
                className="mt-4"
              />
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg space-y-4 border">
            <h3 className="text-xl font-semibold text-center text-gray-900 dark:text-white">{t('estimatedCost')}</h3>
            {calculation.error ? (
              <p className="text-red-500 text-center font-medium">{t(calculation.error)}</p>
            ) : (
              <>
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-600 dark:text-gray-400">{t('pricePerKg')}</span>
                  <span className="text-2xl font-bold text-primary">${calculation.pricePerKgUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-600 dark:text-gray-400">{t('totalPriceUSD')}</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">${calculation.totalPriceUSD.toFixed(2)}</span>
                </div>
              </>
            )}
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-4">
              {t('priceCalculatorNote')}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default PriceCalculator;