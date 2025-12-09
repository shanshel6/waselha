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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';

const signUpSchema = z
  .object({
    first_name: z.string().min(1, { message: 'requiredField' }),
    last_name: z.string().min(1, { message: 'requiredField' }),
    email: z.string().email({ message: 'invalidEmail' }),
    password: z.string().min(6, { message: 'passwordTooShort' }),
    confirm_password: z.string().min(6, { message: 'passwordTooShort' }),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  });

const SignUp = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirm_password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof signUpSchema>) => {
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
          // Default role to 'both' and phone to null/undefined
          role: 'both',
        },
      },
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess(t('signUpSuccessCheckEmail'));
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background dark:bg-gray-900">
      <div className="w-full max-w-md">
        <Card className="p-4 rounded-lg shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">{t('signUp')}</CardTitle>
            <CardDescription>{t('createAccountToStart')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('firstName')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('lastName')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('password')}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('confirmPassword')}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? t('signingUp') ?? 'جاري إنشاء الحساب...' : t('signUp')}
                </Button>
              </form>
            </Form>

            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
              {t('haveAccount')}{' '}
              <Link
                to="/login"
                className="font-medium text-primary hover:underline"
              >
                {t('login')}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;