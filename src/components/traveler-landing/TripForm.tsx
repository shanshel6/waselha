"use client";
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CalendarIcon, DollarSign, MapPin, StickyNote, FileText, User, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { countries } from '@/lib/countries';
import { calculateTravelerProfit } from '@/lib/pricing';
import CountryFlag from '@/components/CountryFlag';
import { arabicCountries } from '@/lib/countries-ar';
import TicketUpload from '@/components/TicketUpload';
import { UseFormReturn } from 'react-hook-form';

interface TripFormProps {
  form: UseFormReturn<any>;
  currentStep: number;
  isLoggedIn: boolean;
}

const MIN_KG = 1;
const MAX_KG = 50;

export const TripForm: React.FC<TripFormProps> = ({ form, currentStep, isLoggedIn }) => {
  const { t } = useTranslation();
  const { from_country, to_country, free_kg } = form.watch();

  const estimatedProfit = useMemo(() => {
    if (from_country && to_country && free_kg > 0) {
      return calculateTravelerProfit(from_country, to_country, free_kg);
    }
    return null;
  }, [from_country, to_country, free_kg]);

  const handleTicketFileSelected = (file: File | null) => {
    form.setValue('ticket_file', file);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Trip Route
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
      case 2: // Travel Date
        return (
          <FormField
            control={form.control}
            name="trip_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t('tripDate')}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full justify-between text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), 'PPP', { locale: ar })
                        ) : (
                          <span>{t('selectDate')}</span>
                        )}
                        <CalendarIcon className="h-4 w-4 opacity-70" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date ? date.toISOString() : '')}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      locale={ar}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 3: // Luggage Capacity
        return (
          <>
            <FormField
              control={form.control}
              name="free_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('freeKg')} ({field.value} kg)
                  </FormLabel>
                  <FormControl>
                    <div className="mt-2">
                      <Slider
                        min={MIN_KG}
                        max={MAX_KG}
                        step={1}
                        value={[field.value]}
                        onValueChange={(val) => field.onChange(val[0])}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>50 kg</span>
                        <span>1 kg</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {estimatedProfit && !estimatedProfit.error && (
              <Card className="border-primary/30 bg-primary/5 mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    {t('estimatedProfit')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-1">
                  <div className="text-3xl font-bold text-primary">
                    {free_kg <= 3
                      ? `$${estimatedProfit.totalPriceUSD.toFixed(2)}`
                      : `$${(estimatedProfit.totalPriceUSD + 10).toFixed(2)} - $${(estimatedProfit.totalPriceUSD + 50).toFixed(2)}`}
                    <span className="text-lg"> USD</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('basedOnWeightAndDestination')}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        );
      case 4:
        if (isLoggedIn) {
          // Location & Notes for logged-in user
          return (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="traveler_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {t('travelerLocation')}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t('travelerLocationPlaceholder')} {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t('travelerLocationDescription')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <StickyNote className="h-4 w-4" />
                      {t('notes')}
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder={t('notes')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          );
        } else {
          // Personal Details for guest
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
                      رقم الهاتف
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: 07701234567" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      سيتم استخدام هذا الرقم كاسم مستخدم وكلمة المرور سيتم إرسالها عبر الرسائل القصيرة
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          );
        }
      case 5:
        if (isLoggedIn) {
          // Ticket Upload for logged-in user
          return (
            <FormField
              control={form.control}
              name="ticket_file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    تحميل تذكرة الطيران
                  </FormLabel>
                  <FormControl>
                    <TicketUpload 
                      onFileSelected={handleTicketFileSelected} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        } else {
          // Location & Notes for guest
          return (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="traveler_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {t('travelerLocation')}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t('travelerLocationPlaceholder')} {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t('travelerLocationDescription')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <StickyNote className="h-4 w-4" />
                      {t('notes')}
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder={t('notes')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          );
        }
      case 6:
        if (!isLoggedIn) {
          // Ticket Upload for guest
          return (
            <FormField
              control={form.control}
              name="ticket_file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    تحميل تذكرة الطيران
                  </FormLabel>
                  <FormControl>
                    <TicketUpload 
                      onFileSelected={handleTicketFileSelected} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        }
        return null;
      default:
        return null;
    }
  };

  return <div key={currentStep} className="animate-fade-in">{renderStepContent()}</div>;
};