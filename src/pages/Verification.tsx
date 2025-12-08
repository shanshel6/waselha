"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import ImageUpload from '@/components/ImageUpload';

const verificationSchema = z.object({
  id_front_url: z.string().url({ message: "uploadRequired" }),
  id_back_url: z.string().url({ message: "uploadRequired" }),
  residential_card_url: z.string().url().optional(),
  photo_id_url: z.string().url({ message: "uploadRequired" }),
});

const Verification = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const navigate = useNavigate();
  
  const form = useForm<z.infer<typeof verificationSchema>>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      id_front_url: "",
      id_back_url: "",
      residential_card_url: "",
      photo_id_url: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof verificationSchema>) => {
    if (!user) {
      showError(t('mustBeLoggedIn'));
      return;
    }

    const { error } = await supabase.from('verification_requests').insert({
      user_id: user.id,
      id_front_url: values.id_front_url,
      id_back_url: values.id_back_url,
      residential_card_url: values.residential_card_url || null,
      photo_id_url: values.photo_id_url,
      status: 'pending',
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="id_front_url"
                  render={() => (
                    <FormItem>
                      <FormLabel>{t('idFront')}</FormLabel>
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
                      <FormLabel>{t('idBack')}</FormLabel>
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
                  name="residential_card_url"
                  render={() => (
                    <FormItem>
                      <FormLabel>{t('residentCardFront')}</FormLabel>
                      <ImageUpload 
                        label={t('residentCardFront')} 
                        onUploadSuccess={(url) => form.setValue('residential_card_url', url, { shouldValidate: true })} 
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="photo_id_url"
                  render={() => (
                    <FormItem>
                      <FormLabel>{t('faceWithId')}</FormLabel>
                      <ImageUpload 
                        label={t('faceWithId')} 
                        onUploadSuccess={(url) => form.setValue('photo_id_url', url, { shouldValidate: true })} 
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
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