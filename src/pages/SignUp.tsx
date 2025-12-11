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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, User } from 'lucide-react';

const signUpSchema = z.object({
  full_name: z.string().min(1, { message: 'requiredField' }),
  phone: z.string().min(10, { message: 'phoneMustBe10To12Digits' }).max(12, { message: 'phoneMustBe10To12Digits' }).regex(/^\d+$/, { message: 'phoneMustBeNumbers' }),
});

const SignUp = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      full_name: '',
      phone: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof signUpSchema>) => {
    try {
      // Create email from phone number
      const email = `user+${values.phone.replace(/\+/g, '')}@waslaha.app`;
      const password = values.phone; // Use phone as password for simplicity
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: values.full_name,
            phone: values.phone,
            role: 'both'
          }
        }
      });

      if (error) {
        throw error;
      }

      showSuccess('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
      navigate('/login');
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