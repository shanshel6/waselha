"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X } from 'lucide-react';
import { showError } from '@/utils/toast';

interface PhotoUploadProps {
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  minPhotos?: number;
  label: string;
  existingPhotos?: string[];
}

/**
 * NOTE:
 * This component NO LONGER uses Supabase storage.
 * It only creates local object URLs (via URL.createObjectURL).
 * These URLs are valid only in the browser session, but they avoid any "Bucket not found" errors.
 */
const PhotoUpload: React.FC<PhotoUploadProps> = ({ 
  onPhotosChange, 
  maxPhotos = 4, 
  minPhotos = 1,
  label,
  existingPhotos = []
}) => {
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>(existingPhotos);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (photos.length + acceptedFiles.length > maxPhotos) {
      showError(`You can upload a maximum of ${maxPhotos} photos`);
      return;
    }

    setUploading(true);

    try {
      const newPhotos = [...photos];

      for (const file of acceptedFiles) {
        const objectUrl = URL.createObjectURL(file);
        newPhotos.push(objectUrl);
      }

      setPhotos(newPhotos);
      onPhotosChange(newPhotos);
    } catch (error: any) {
      showError(error?.message || "Error handling photos");
    } finally {
      setUploading(false);
    }
  }, [photos, maxPhotos, onPhotosChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: maxPhotos - photos.length,
    disabled: uploading
  });

  const removePhoto = (index: number) => {
    const photoUrl = photos[index];
    URL.revokeObjectURL(photoUrl);

    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    onPhotosChange(newPhotos);
  };

  return (
    <div className="space-y-4">
      <div className="font-medium">{label}</div>
      
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          {isDragActive 
            ? "Drop the files here" 
            : `Drag & drop photos here, or click to select files (max ${maxPhotos})`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {uploading ? "Uploading..." : "Supports JPG, PNG, GIF"}
        </p>
      </div>
      
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <Card key={index} className="relative group">
              <CardContent className="p-2">
                <div className="relative aspect-square">
                  <img 
                    src={photo} 
                    alt={`Item photo ${index + 1}`} 
                    className="w-full h-full object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(index);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <div className="text-sm text-muted-foreground">
        {photos.length} of {maxPhotos} photos uploaded
        {photos.length < minPhotos && (
          <p className="text-destructive mt-1">
            Please upload at least {minPhotos} photo{minPhotos > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};

export default PhotoUpload;