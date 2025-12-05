"use client";

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const profileFormSchema = z.object({
  first_name: z.string().min(1, { message: "requiredField" }).optional(),
  last_name: z.string().min(1, { message: "requiredField" }).optional(),
  phone: z.string().optional(),
  role: z.enum(["traveler", "sender", "both"], {
    required_error: "requiredField",
  }),
});

const MyProfile = () => {
  const { t } = useTranslation();
  const { user, isLoading: isSessionLoading } = useSession();
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      role: "both",
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setIsLoadingProfile(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone, role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          showError(t('errorLoadingProfile'));
        } else if (data) {
          form.reset(data);
        }
        setIsLoadingProfile(false);
      }
    };

    if (!isSessionLoading) {
      fetchProfile();
    }
  }, [user, isSessionLoading, form, t]);

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    if (!user) {
      showError(t('profileUpdatedError'));
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update(values)
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      showError(t('profileUpdatedError'));
    } else {
      showSuccess(t('profileUpdatedSuccess'));
    }
  };

  if (isSessionLoading || isLoadingProfile) {
    return (
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">{t('loadingProfile')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('myProfile')}</h1>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{t('updateProfile')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('phone')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('role')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectRole')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="traveler">{t('roleTraveler')}</SelectItem>
                        <SelectItem value="sender">{t('roleSender')}</SelectItem>
                        <SelectItem value="both">{t('roleBoth')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {t('updateProfile')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyProfile;