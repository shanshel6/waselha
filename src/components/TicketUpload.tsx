"use client";

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UploadCloud, CheckCircle, XCircle, FileText } from 'lucide-react';

interface TicketUploadProps {
  onUploadSuccess: (filePath: string) => void;
  existingFileUrl?: string;
}

const TicketUpload: React.FC<TicketUploadProps> = ({ onUploadSuccess, existingFileUrl }) => {
  const { t } = useTranslation();
  const { user } = useSession();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(existingFileUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError(t('invalidFileType'));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(t('fileTooLarge'));
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    const fileExt = file.name.split('.').pop();
    const fileName = `ticket_${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/tickets/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('trip-documents')
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
        .from('trip-documents')
        .getPublicUrl(filePath);

      setFileUrl(data.publicUrl);
      onUploadSuccess(data.publicUrl);
      setProgress(100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async () => {
    if (!fileUrl || !user) return;

    try {
      // Extract file path from URL
      const url = new URL(fileUrl);
      const filePath = url.pathname.split('/').slice(2).join('/');
      
      const { error } = await supabase.storage
        .from('trip-documents')
        .remove([filePath]);

      if (error) {
        setError(error.message);
        return;
      }

      setFileUrl(null);
      onUploadSuccess('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="font-medium flex items-center gap-2">
        <FileText className="h-5 w-5" />
        {t('flightTicket')}
      </div>
      
      {fileUrl ? (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">{t('ticketUploaded')}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={removeFile}
              disabled={uploading}
            >
              {t('removeFile')}
            </Button>
          </div>
          <div className="mt-2">
            <a 
              href={fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              {t('viewTicket')}
            </a>
          </div>
        </div>
      ) : (
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={uploading}
          />
          <UploadCloud className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground mb-1">{t('clickToUploadTicket')}</p>
          <p className="text-xs text-muted-foreground">
            {t('supportedFormats')}: PDF, JPG, PNG (Max 10MB)
          </p>
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">{t('uploading')}...</p>
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

export default TicketUpload;