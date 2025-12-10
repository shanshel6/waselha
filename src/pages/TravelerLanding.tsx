import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plane, DollarSign, Handshake, ShieldCheck, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { countries } from '@/lib/countries';
import CountryFlag from '@/components/CountryFlag';
import { useQueryClient } from '@tanstack/react-query';
import { Slider } from '@/components/ui/slider';

const formSchema = z.object({
  from_country: z.string().min(1, { message: 'requiredField' }),
  to_country: z.string().min(1, { message: 'requiredField' }),
  trip_date: z.date({ required_error: 'dateRequired' }),
  free_kg: z.coerce.number().min(1, { message: 'minimumWeight' }).max(50, { message: 'maxWeight' }),
  charge_per_kg: z.coerce.number().min(0, { message: 'invalidNumber' }),
  notes: z.string().optional(),
});

const TravelerLanding = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      from_country: 'Iraq',
      to_country: '',
      free_kg: 5,
      charge_per_kg: 5,
      notes: '',
    },
  });

  const { free_kg, charge_per_kg } = form.watch();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError('Please log in to register your trip');
      navigate('/login');
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.from('trips').insert({
        user_id: user.id,
        from_country: values.from_country,
        to_country: values.to_country,
        trip_date: format(values.trip_date, 'yyyy-MM-dd'),
        free_kg: values.free_kg,
        charge_per_kg: values.charge_per_kg,
        notes: values.notes,
        is_approved: false,
      });

      if (error) {
        console.error('Error adding trip:', error);
        showError('Failed to register trip. Please try again.');
      } else {
        showSuccess('Trip registered successfully! Our team will review it shortly.');
        queryClient.invalidateQueries({ queryKey: ['userTrips', user.id] });
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        navigate('/my-flights');
      }
    } catch (err: any) {
      console.error('Error registering trip:', err);
      showError(err.message || 'Failed to register trip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-teal-50">
      {/* Hero Section */}
      <section className="py-12 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Traveling Soon? Turn Your Free Luggage Space Into Cash.
          </h1>
          <p className="text-lg text-gray-700 mb-8">
            Share your empty baggage space and get paid for every kilo you carry.
          </p>
          <Button 
            size="lg" 
            className="bg-teal-600 hover:bg-teal-700 text-white text-lg py-6 px-8 rounded-full shadow-lg"
            onClick={() => {
              const element = document.getElementById('register-form');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            Register Your Trip Now
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-gray-900">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plane className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Add your trip details</h3>
              <p className="text-gray-600 text-sm">Share your travel plans with us</p>
            </div>
            <div className="text-center">
              <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-teal-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Set your price per kilo</h3>
              <p className="text-gray-600 text-sm">Decide how much you want to earn</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Handshake className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Travelers contact you</h3>
              <p className="text-gray-600 text-sm">Connect with people who need your service</p>
            </div>
            <div className="text-center">
              <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-teal-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Earn money when you deliver</h3>
              <p className="text-gray-600 text-sm">Get paid after successful delivery</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 px-4 bg-gradient-to-r from-blue-500 to-teal-500 text-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Benefits for Travelers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white/10 border-none text-white">
              <CardContent className="p-6 text-center">
                <DollarSign className="h-10 w-10 mx-auto mb-4 text-yellow-300" />
                <h3 className="font-semibold text-lg mb-2">Make extra money easily</h3>
                <p className="text-sm">Turn your unused luggage space into cash</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-none text-white">
              <CardContent className="p-6 text-center">
                <Plane className="h-10 w-10 mx-auto mb-4 text-yellow-300" />
                <h3 className="font-semibold text-lg mb-2">No effort, you're already traveling</h3>
                <p className="text-sm">Just carry items you'd normally pack</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-none text-white">
              <CardContent className="p-6 text-center">
                <ShieldCheck className="h-10 w-10 mx-auto mb-4 text-yellow-300" />
                <h3 className="font-semibold text-lg mb-2">Safe & verified senders</h3>
                <p className="text-sm">All users are verified for your safety</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-none text-white">
              <CardContent className="p-6 text-center">
                <Handshake className="h-10 w-10 mx-auto mb-4 text-yellow-300" />
                <h3 className="font-semibold text-lg mb-2">Payments protected</h3>
                <p className="text-sm">Secure transactions inside the platform</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Quick Form */}
      <section id="register-form" className="py-12 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">Register Your Trip</h2>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* From / To countries */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="from_country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Country</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {countries.map((c) => (
                                <SelectItem key={c} value={c}>
                                  <div className="flex items-center gap-2">
                                    <CountryFlag country={c} />
                                    <span>{c}</span>
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
                          <FormLabel>To Country</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {countries.map((c) => (
                                <SelectItem key={c} value={c}>
                                  <div className="flex items-center gap-2">
                                    <CountryFlag country={c} />
                                    <span>{c}</span>
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

                  {/* Trip date */}
                  <FormField
                    control={form.control}
                    name="trip_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Trip Date</FormLabel>
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
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Select date</span>
                                )}
                                <CalendarIcon className="h-4 w-4 opacity-70" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Free kg slider */}
                  <FormField
                    control={form.control}
                    name="free_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Free Weight ({field.value} kg)
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

                  {/* Price per kg */}
                  <FormField
                    control={form.control}
                    name="charge_per_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per kg ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="5" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any additional information about your trip..." 
                            className="resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Registering Trip...' : 'Register Your Trip'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default TravelerLanding;