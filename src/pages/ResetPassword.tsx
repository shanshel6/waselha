"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { showError, showSuccess } from '@/utils/toast';
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

const resetSchema = z.object({
  email: z.string().email({ message: 'invalidEmail' }),
});

const ResetPassword: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof resetSchema>) => {
    const redirectTo = `${window.location.origin}/login`;

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo,
    });

    if (error) {
      showError(error.message);
      return;
    }

    showSuccess(t('resetPasswordEmailSent') ?? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background dark:bg-gray-900">
      <div className="w-full max-w-md">
        <Card className="p-4 rounded-lg shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {t('forgotPassword') ?? 'نسيت كلمة المرور'}
            </CardTitle>
            <CardDescription>
              {t('resetPasswordDescription') ?? 'أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting
                    ? t('loading') ?? 'جاري الإرسال...'
                    : t('sendResetLink') ?? 'إرسال رابط إعادة التعيين'}
                </Button>
              </form>
            </Form>
            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
              <Link
                to="/login"
                className="font-medium text-primary hover:underline"
              >
                {t('backToLogin') ?? 'العودة إلى تسجيل الدخول'}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;