"use client";

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UploadCloud, CheckCircle, XCircle } from 'lucide-react';

interface ImageUploadProps {
  onUploadSuccess: (filePath: string) => void;
  label: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onUploadSuccess, label }) => {
  const { t } = useTranslation();
  const { user } = useSession();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('verification-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from('verification-documents')
      .getPublicUrl(filePath);

    setFileUrl(data.publicUrl);
    onUploadSuccess(data.publicUrl);
    setUploading(false);
    setProgress(100);
  };

  return (
    <div className="space-y-2">
      <label className="font-medium">{label}</label>
      <div
        className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary"
        onClick={() => fileInputRef.current?.click()}
      >
        <Input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
          disabled={uploading || !!fileUrl}
        />
        {!fileUrl && !uploading && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <UploadCloud className="h-8 w-8" />
            <span>{t('clickToUpload')}</span>
          </div>
        )}
        {uploading && <Progress value={progress} className="w-full" />}
        {fileUrl && (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            <span>{t('uploadComplete')}</span>
          </div>
        )}
      </div>
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ImageUpload;