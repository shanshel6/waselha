"use client";

import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, XCircle, CheckCircle } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import type { Profile } from '@/hooks/use-profile';

const BUCKET_NAME = 'profile-avatars';

interface UploadAvatarProps {
  profile: Profile | null;
}

const UploadAvatar: React.FC<UploadAvatarProps> = ({ profile }) => {
  const { t } = useTranslation();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const initials = (() => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (profile?.first_name) {
      return profile.first_name[0].toUpperCase();
    }
    if (profile?.last_name) {
      return profile.last_name[0].toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  })();

  const ensureBucketExists = async () => {
    const { data, error } = await supabase.functions.invoke('create-profile-avatars-bucket');
    if (error) {
      console.error('Avatar bucket ensure error:', error);
      throw new Error(error.message || 'Failed to prepare storage for avatars.');
    }
    if (!data?.success) {
      console.error('Avatar bucket ensure returned non-success payload:', data);
      throw new Error('Failed to prepare storage for avatars.');
    }
  };

  const uploadAvatarAndGetUrl = async (file: File, userId: string) => {
    await ensureBucketExists();

    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/${Date.now()}-avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      throw new Error(uploadError.message || 'Failed to upload avatar.');
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg(t('invalidFileType'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(t('fileTooLarge'));
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const publicUrl = await uploadAvatarAndGetUrl(file, user.id);
      setProgress(70);

      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Avatar profile update error:', error);
        throw new Error(error.message || 'Failed to update profile avatar.');
      }

      setProgress(100);
      showSuccess(t('profileUpdatedSuccess'));

      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    } catch (err: any) {
      console.error('Avatar upload flow error:', err);
      setErrorMsg(err.message || t('tripAddedError'));
      showError(err.message || t('tripAddedError'));
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-16 w-16">
          {profile?.avatar_url ? (
            // eslint-disable-next-line jsx-a11y/img-redundant-alt
            <img
              src={profile.avatar_url}
              alt="Profile avatar"
              className="h-full w-full object-cover rounded-full"
            />
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      <div className="flex-1 space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2"
        >
          <Camera className="h-4 w-4" />
          <span>{profile?.avatar_url ? 'تغيير الصورة' : 'إضافة صورة شخصية'}</span>
        </Button>

        {uploading && (
          <div className="space-y-1">
            <Progress value={progress} className="w-40" />
            <p className="text-xs text-muted-foreground">
              {t('uploading')}...
            </p>
          </div>
        )}

        {errorMsg && (
          <Alert variant="destructive" className="w-full max-w-xs">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
          </Alert>
        )}

        {!uploading && !errorMsg && profile?.avatar_url && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="h-3 w-3" />
            <span>{t('uploadComplete')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadAvatar;