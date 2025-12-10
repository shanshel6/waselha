"use client";

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useProfile } from '@/hooks/use-profile';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
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
import { User } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const profileSchema = z.object({
  first_name: z.string().min(1, { message: "requiredField" }),
  last_name: z.string().min(1, { message: "requiredField" }),
});

const CompleteProfile = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
    },
    values: {
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
    },
  });

  useEffect(() => {
    if (!isLoadingProfile && profile && profile.first_name && profile.last_name) {
      // If profile is complete, redirect to home
      navigate('/');
    }
  }, [profile, isLoadingProfile, navigate]);

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user) {
      showError(t('mustBeLoggedIn'));
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: values.first_name,
        last_name: values.last_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      showError(error.message);
    } else {
      showSuccess(t('profileUpdatedSuccess'));
      // Invalidate profile query to refresh data and trigger redirect in useEffect
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      navigate('/');
    }
  };

  if (isLoadingProfile) {
    return <div className="min-h-screen flex items-center justify-center">{t('loading')}...</div>;
  }

  // If profile is already complete, the useEffect handles redirection.
  // If we reach here and profile is null or incomplete, show the form.

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background dark:bg-gray-900">
      <div className="w-full max-w-md">
        <Card className="p-4 rounded-lg shadow-lg">
          <CardHeader className="text-center">
            <User className="h-10 w-10 text-primary mx-auto mb-2" />
            <CardTitle className="text-2xl font-bold">{t('completeProfileTitle')}</CardTitle>
            <CardDescription>{t('completeProfileDescription')}</CardDescription>
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
                        <FormControl><Input {...field} /></FormControl>
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
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {t('saveAndContinue')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompleteProfile;