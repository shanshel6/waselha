"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import ImageUpload from '@/components/ImageUpload';

const verificationSchema = z.object({
  full_name: z.string().min(3, { message: "requiredField" }),
  address: z.string().min(10, { message: "requiredField" }),
  id_front_url: z.string().url({ message: "uploadRequired" }),
  id_back_url: z.string().url({ message: "uploadRequired" }),
  resident_card_front_url: z.string().url().optional(),
  resident_card_back_url: z.string().url().optional(),
  face_with_id_url: z.string().url({ message: "uploadRequired" }),
});

const Verification = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof verificationSchema>>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      full_name: "",
      address: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof verificationSchema>) => {
    if (!user) {
      showError(t('mustBeLoggedIn'));
      return;
    }

    const { error } = await supabase.from('verification_requests').insert({
      user_id: user.id,
      ...values,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess(t('verificationSubmitted'));
      navigate('/');
    }
  };

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{t('verifyYourself')}</CardTitle>
          <CardDescription>{t('verificationInstructions')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fullName')}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('address')}</FormLabel>
                    <FormControl><Textarea {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="id_front_url"
                  render={() => (
                    <FormItem>
                      <ImageUpload
                        label={t('idFront')}
                        onUploadSuccess={(url) => form.setValue('id_front_url', url, { shouldValidate: true })}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="id_back_url"
                  render={() => (
                    <FormItem>
                      <ImageUpload
                        label={t('idBack')}
                        onUploadSuccess={(url) => form.setValue('id_back_url', url, { shouldValidate: true })}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="resident_card_front_url"
                  render={() => (
                    <FormItem>
                      <ImageUpload
                        label={t('residentCardFront')}
                        onUploadSuccess={(url) => form.setValue('resident_card_front_url', url, { shouldValidate: true })}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="resident_card_back_url"
                  render={() => (
                    <FormItem>
                      <ImageUpload
                        label={t('residentCardBack')}
                        onUploadSuccess={(url) => form.setValue('resident_card_back_url', url, { shouldValidate: true })}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="face_with_id_url"
                render={() => (
                  <FormItem>
                    <ImageUpload
                      label={t('faceWithId')}
                      onUploadSuccess={(url) => form.setValue('face_with_id_url', url, { shouldValidate: true })}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {t('submitVerification')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Verification;