"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { showError } from '@/utils/toast';

interface PhotoUploadProps {
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  minPhotos?: number;
  label: string;
  existingPhotos?: string[];
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ 
  onPhotosChange, 
  maxPhotos = 4, 
  minPhotos = 1,
  label,
  existingPhotos = []
}) => {
  const { user } = useSession();
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>(existingPhotos);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      showError("You must be logged in to upload photos");
      return;
    }

    if (photos.length + acceptedFiles.length > maxPhotos) {
      showError(`You can upload a maximum of ${maxPhotos} photos`);
      return;
    }

    setUploading(true);
    
    try {
      const newPhotos = [...photos];
      
      for (const file of acceptedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('item-photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from('item-photos')
          .getPublicUrl(filePath);
        
        newPhotos.push(data.publicUrl);
      }
      
      setPhotos(newPhotos);
      onPhotosChange(newPhotos);
    } catch (error: any) {
      showError(error.message || "Error uploading photos");
    } finally {
      setUploading(false);
    }
  }, [user, photos, maxPhotos, onPhotosChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: maxPhotos - photos.length,
    disabled: uploading
  });

  const removePhoto = async (index: number) => {
    const photoUrl = photos[index];
    
    // Extract file path from URL
    const url = new URL(photoUrl);
    const filePath = url.pathname.split('/').slice(2).join('/');
    
    try {
      await supabase.storage
        .from('item-photos')
        .remove([filePath]);
      
      const newPhotos = photos.filter((_, i) => i !== index);
      setPhotos(newPhotos);
      onPhotosChange(newPhotos);
    } catch (error: any) {
      showError("Error removing photo: " + error.message);
    }
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