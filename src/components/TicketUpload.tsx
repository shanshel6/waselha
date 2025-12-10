"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UploadCloud, CheckCircle, XCircle, FileText } from 'lucide-react';

interface TicketUploadProps {
  onFileSelected: (file: File | null) => void;
  existingFileUrl?: string;
}

/**
 * This component is now a pure client-side file picker + preview.
 * It does NOT talk to Supabase directly; the parent is responsible for uploading the file.
 */
const TicketUpload: React.FC<TicketUploadProps> = ({ onFileSelected, existingFileUrl }) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState<boolean>(!!existingFileUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If an existingFileUrl is provided (e.g., editing), show it as the preview source
  useEffect(() => {
    if (existingFileUrl) {
      setPreviewUrl(existingFileUrl);
      setHasFile(true);
    }
  }, [existingFileUrl]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
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

    try {
      // Create a local preview URL if (previewUrl && !existingFileUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      setHasFile(true);
      setProgress(100);
      onFileSelected(file);
    } catch (err: any) {
      setError(err.message || 'An error occurred during file selection');
      onFileSelected(null);
      setHasFile(false);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    if (previewUrl && !existingFileUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setHasFile(false);
    setError(null);
    onFileSelected(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="font-medium flex items-center gap-2">
        <FileText className="h-5 w-5" />
        {"تحميل تذكرة السفر"}
      </div>
      {hasFile && previewUrl ? (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium text-sm">{"تم تحميل التذكرة"}</span>
            </div>
            <Button variant="outline" size="sm" onClick={removeFile} disabled={uploading}>
              {"إزالة الملف"}
            </Button>
          </div>
          <div className="mt-2">
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">
              {"عرض التذكرة"}
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
          <p className="text-muted-foreground mb-1">{"انقر لتحميل التذكرة"}</p>
          <p className="text-xs text-muted-foreground">
            {"الصيغ المدعومة: PDF, JPG, PNG (الحجم الأقصى 10MB)"}
          </p>
        </div>
      )}
      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">{"جاري التحميل..."}</p>
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