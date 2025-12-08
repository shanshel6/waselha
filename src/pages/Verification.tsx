"use client";

import React, { useState, useRef } from 'react";
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UploadCloud, CheckCircle, XCircle, FileImage } from 'lucide-react';

const verificationSchema = z.object({
  id_front_file: z
    .instanceof(File)
    .refine((f) => f.size > 0, { message: 'uploadRequired' }),
  id_back_file: z
    .instanceof(File)
    .refine((f) => f.size > 0, { message: 'uploadRequired' }),
  residential_card_file: z.instanceof(File).optional(),
  photo_id_file: z
    .instanceof(File)
    .refine((f) => f.size > 0, { message: 'uploadRequired' })
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

interface FileUploadFieldProps {
  label: string;
  required?: boolean;
  value: File | undefined;
  onChange: (file: File | undefined) => void;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  label,
  required,
  value,
  onChange
}) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError(t('invalidFileType'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(t('fileTooLarge'));
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    const url = URL.createObjectURL(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(url);
    setProgress(100);
    onChange(file);
    setUploading(false);
  };

  const clearFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onChange(undefined);
    setError(null);
  };

  return (
    <div className="space-y-2">
      <FormLabel className="flex items-center gap-2">
        <FileImage className="h-4 w-4" />
        {label}
        {required && <span className="text-destructive">*</span>}
      </FormLabel>
      {value && previewUrl ? (
        <div className="border rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{t('uploadComplete')}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFile}
              disabled={uploading}
            >
              {t('removeFile')}
            </Button>
          </div>
          <img
            src={previewUrl}
            alt={label}
            className="w-full h-32 object-cover rounded-md border"
          />
        </div>
      ) : (
        <div
          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            className="hidden"
            onChange={handleFileChange}
          />
          <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
          <p className="text-sm text-muted-foreground">{t('clickToUpload')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG / PNG – Max 10MB
          </p>
        </div>
      )}

      {uploading && (
        <div className="space-y-1">
          <Progress value={progress} className="w-full" />
          <p className="text-xs text-muted-foreground text-center">
            {t('uploading')}...
          </p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

const Verification = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const navigate = useNavigate();

  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      id_front_file: undefined as unknown as File,
      id_back_file: undefined as unknown as File,
      residential_card_file: undefined,
      photo_id_file: undefined as unknown as File
    }
  });

  const onSubmit = async (values: VerificationFormValues) => {
    if (!user) {
      showError(t('mustBeLoggedIn'));
      return;
    }

    // We are NOT uploading to storage; we only store placeholder URLs so admin can see that files exist conceptually.
    // In a real app you would upload these Files to a storage bucket and save the real URLs here.
    const fakeUrl = (f?: File) => (f ? `local-file://${f.name}` : null);

    const { error } = await supabase.from('verification_requests').insert({
      user_id: user.id,
      id_front_url: fakeUrl(values.id_front_file),
      id_back_url: fakeUrl(values.id_back_file),
      residential_card_url: fakeUrl(values.residential_card_file || undefined),
      photo_id_url: fakeUrl(values.photo_id_file),
      status: 'pending'
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
                  name="id_front_file"
                  render={({ field }) => (
                    <FormItem>
                      <FileUploadField
                        label={t('idFront')}
                        required
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="id_back_file"
                  render={({ field }) => (
                    <FormItem>
                      <FileUploadField
                        label={t('idBack')}
                        required
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="residential_card_file"
                  render={({ field }) => (
                    <FormItem>
                      <FileUploadField
                        label={t('residentCard')}
                        required={false}
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="photo_id_file"
                  render={({ field }) => (
                    <FormItem>
                      <FileUploadField
                        label={t('faceWithId')}
                        required
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
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