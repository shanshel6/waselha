"use client";

import React, { useState, useRef } from "react";
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
import { UploadCloud, CheckCircle, XCircle, FileImage, Loader2, IdCard, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useVerificationStatus } from '@/hooks/use-verification-status';

const verificationSchema = z.object({
  first_name: z.string().min(1, { message: 'requiredField' }),
  last_name: z.string().min(1, { message: 'requiredField' }),
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

const VERIFICATION_BUCKET = 'verification-documents';

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

const uploadVerificationFile = async (file: File, userId: string, key: string) => {
  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `${userId}/${key}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase.storage
    .from(VERIFICATION_BUCKET)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
};

/**
 * Simple infographic-style illustration:
 * A stylized person holding an ID card, with small step captions underneath
 * so users can visually copy the pose for their "photo with ID".
 */
const VerificationIllustration: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="mb-6 rounded-2xl border bg-muted/40 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        {/* Person + ID graphic */}
        <div className="relative flex items-center justify-center">
          {/* Person */}
          <div className="relative flex flex-col items-center">
            {/* Head */}
            <div className="h-12 w-12 rounded-full bg-blue-300 dark:bg-blue-700 mb-1 border border-blue-400 dark:border-blue-500" />
            {/* Body */}
            <div className="w-20 h-16 rounded-3xl bg-blue-500 dark:bg-blue-600 flex items-center justify-center shadow-md">
              {/* Shoulders / arms implied by card placement */}
              <IdCard className="h-8 w-8 text-blue-100" />
            </div>
          </div>

          {/* ID card held in front */}
          <div className="absolute -right-4 sm:-right-6 top-7 sm:top-8">
            <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 shadow-lg border px-3 py-2">
              <div className="h-6 w-6 rounded-full bg-blue-200 dark:bg-blue-700" />
              <div className="space-y-1">
                <div className="h-1.5 w-14 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-1.5 w-10 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Textual guidance */}
        <div className="flex-1 space-y-2 text-sm">
          <p className="font-semibold text-foreground text-center sm:text-right">
            {t('faceWithId')}
          </p>
          <ul className="space-y-1 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-4 w-4 rounded-full bg-blue-500 text-[11px] text-white flex items-center justify-center">
                1
              </span>
              <span>
                قم بالوقوف في مكان مضيء، واجعل وجهك واضحاً بالكامل في الصورة.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-4 w-4 rounded-full bg-blue-500 text-[11px] text-white flex items-center justify-center">
                2
              </span>
              <span>
                أمسك الهوية بيدك أمام صدرك بحيث يظهر <strong>الاسم والصورة</strong> بوضوح.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-4 w-4 rounded-full bg-blue-500 text-[11px] text-white flex items-center justify-center">
                3
              </span>
              <span>
                تأكد أن النص الموجود على الهوية غير مغطى أو مشوّه، ثم التقط الصورة وارفعها هنا.
              </span>
            </li>
          </ul>

          <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
            <Camera className="h-3 w-3" />
            <span>
              حاول أن تجعل صورتك مشابهة لهذا الرسم التوضيحي قدر الإمكان لسهولة مراجعة طلبك.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Verification = () => {
  const { t } = useTranslation();
  const { user, session } = useSession();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { data: verificationInfo, isLoading: isVerificationLoading } = useVerificationStatus();

  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      id_front_file: undefined as unknown as File,
      id_back_file: undefined as unknown as File,
      residential_card_file: undefined,
      photo_id_file: undefined as unknown as File
    }
  });

  const status = verificationInfo?.status || 'none';
  const isPending = status === 'pending';
  const isApproved = status === 'approved';

  // If already verified, do not allow re-verification at all
  if (isVerificationLoading) {
    return (
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isApproved) {
    navigate('/my-profile', { replace: true });
    return null;
  }

  const onSubmit = async (values: VerificationFormValues) => {
    if (!user || !session) {
      showError(t('mustBeLoggedIn'));
      navigate('/login');
      return;
    }

    // Re-check latest status just before submitting
    if (verificationInfo?.status === 'pending') {
      showError(t('pendingVerification'));
      return;
    }
    if (verificationInfo?.status === 'approved') {
      showError(t('verificationApproved'));
      navigate('/my-profile');
      return;
    }

    setSubmitting(true);

    try {
      const [idFrontUrl, idBackUrl, residentialCardUrl, photoIdUrl] =
        await Promise.all([
          uploadVerificationFile(values.id_front_file, user.id, 'id-front'),
          uploadVerificationFile(values.id_back_file, user.id, 'id-back'),
          values.residential_card_file
            ? uploadVerificationFile(values.residential_card_file, user.id, 'residential-card')
            : Promise.resolve<string | null>(null),
          uploadVerificationFile(values.photo_id_file, user.id, 'photo-id'),
        ]);

      const { error } = await supabase.from('verification_requests').insert({
        user_id: user.id,
        id_front_url: idFrontUrl,
        id_back_url: idBackUrl,
        residential_card_url: residentialCardUrl,
        photo_id_url: photoIdUrl,
        status: 'pending'
      });

      if (error) {
        throw error;
      }

      await supabase
        .from('profiles')
        .update({
          first_name: values.first_name,
          last_name: values.last_name
        })
        .eq('id', user.id);

      showSuccess(t('verificationSubmitted'));
      navigate('/');
    } catch (error: any) {
      console.error('Verification submit error:', error);
      showError(error.message || 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  const submitDisabled = isPending || submitting || form.formState.isSubmitting;

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{t('verifyYourself')}</CardTitle>
          <CardDescription>{t('verificationInstructions')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* New infographic-style illustration */}
          <VerificationIllustration />

          {status === 'pending' && (
            <Alert className="mb-4">
              <AlertDescription>{t('pendingVerification')}</AlertDescription>
            </Alert>
          )}

          {status === 'rejected' && (
            <Alert className="mb-4" variant="destructive">
              <AlertDescription>{t('verificationRejected')}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('firstName')}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={submitDisabled} />
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
                        <Input {...field} disabled={submitDisabled} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                disabled={submitDisabled}
              >
                {submitDisabled ? t('pendingVerification') : t('submitVerification')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Verification;