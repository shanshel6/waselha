"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, User, MapPin, Lock } from 'lucide-react';

const signUpSchema = z.object({
  full_name: z.string().min(1, { message: 'requiredField' }),
  phone: z.string().min(10, { message: 'phoneMustBe10To12Digits' }).max(12, { message: 'phoneMustBe10To12Digits' }).regex(/^\d+$/, { message: 'phoneMustBeNumbers' }),
  password: z.string().min(6, { message: 'passwordTooShort' }),
  address: z.string().min(1, { message: 'requiredField' }),
});

const SignUp = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      password: '',
      address: '',
    },
  });

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Handle different phone number formats for Iraq
    if (cleanPhone.startsWith('07')) {
      // Format: 07XXXXXXXXX (10 digits total)
      if (cleanPhone.length === 11 && cleanPhone.startsWith('07')) {
        cleanPhone = cleanPhone.substring(1); // Remove leading 0
      }
    } else if (cleanPhone.startsWith('9647')) {
      // Format: 9647XXXXXXXXX (12 digits total)
      cleanPhone = cleanPhone.substring(3); // Remove country code 964
    } else if (cleanPhone.startsWith('+9647')) {
      // Format: +9647XXXXXXXXX
      cleanPhone = cleanPhone.substring(4); // Remove country code +964
    }
    
    return cleanPhone;
  };

  const onSubmit = async (values: z.infer<typeof signUpSchema>) => {
    try {
      // Format the phone number
      const formattedPhone = formatPhoneNumber(values.phone);
      const fullPhone = `+964${formattedPhone}`;
      
      console.log('Attempting to sign up with phone:', fullPhone);

      // Sign up the user with phone number and password (no auto-login)
      const { data, error } = await supabase.auth.signUp({
        phone: fullPhone,
        password: values.password,
        options: {
          data: {
            full_name: values.full_name,
            phone: values.phone,
            address: values.address,
            role: 'both'
          }
        }
      });

      if (error) {
        console.error('Supabase signup error:', error);
        throw error;
      }

      // Store the password in the database for admin access
      if (data.user) {
        const { error: passwordError } = await supabase
          .from('user_passwords')
          .insert({
            id: data.user.id,
            password: values.password
          });
          
        if (passwordError) {
          console.error('Error storing password:', passwordError);
        }
      }

      showSuccess('تم إنشاء الحساب بنجاح!');
      // Redirect to home page (auto-login usually happens with signUp)
      navigate('/');
    } catch (error: any) {
      console.error('Sign up error:', error);
      showError(error.message || 'حدث خطأ أثناء إنشاء الحساب');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background dark:bg-gray-900">
      <div className="w-full max-w-md">
        <Card className="p-4 rounded-lg shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <div className="bg-primary/10 p-3 rounded-full">
                <User className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">إنشاء حساب</CardTitle>
            <CardDescription>أدخل معلوماتك لإنشاء حساب جديد</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الكامل</FormLabel>
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
                        <Input type="tel" placeholder="مثال: 07701234567" {...field} dir="ltr" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        سيتم استخدام هذا الرقم لتسجيل الدخول
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        كلمة المرور
                      </FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="أدخل كلمة مرور (6 أحرف على الأقل)" {...field} dir="ltr" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        العنوان
                      </FormLabel>
                      <FormControl>
                        <Textarea placeholder="أدخل عنوانك الكامل" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 text-lg" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
                </Button>
              </form>
            </Form>
            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
              لديك حساب بالفعل؟{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                تسجيل الدخول
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;