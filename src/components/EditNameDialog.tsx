"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { isPast, subDays, format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Profile } from '@/hooks/use-profile';
import { showSuccess, showError } from '@/utils/toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, User } from 'lucide-react';

const profileSchema = z.object({
  first_name: z.string().min(1, { message: "requiredField" }),
  last_name: z.string().min(1, { message: "requiredField" }),
});

interface EditNameDialogProps {
  profile: Profile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const NAME_CHANGE_COOLDOWN_DAYS = 30;

const EditNameDialog: React.FC<EditNameDialogProps> = ({ profile, isOpen, onOpenChange }) => {
  const { t } = useTranslation();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
    },
    values: {
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
    },
  });

  const lastUpdate = profile.updated_at ? new Date(profile.updated_at) : null;
  const canChangeName = !lastUpdate || isPast(subDays(lastUpdate, -NAME_CHANGE_COOLDOWN_DAYS));
  
  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user) {
      showError(t('mustBeLoggedIn'));
      return;
    }

    if (!canChangeName) {
      showError(t('nameChangeCooldownError'));
      return;
    }

    const hasNameChanged = values.first_name !== profile.first_name || values.last_name !== profile.last_name;

    if (!hasNameChanged) {
        showError(t('noChangesMade'));
        return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: values.first_name,
        last_name: values.last_name,
        updated_at: new Date().toISOString(), 
      })
      .eq('id', user.id);

    if (error) {
      showError(error.message);
    } else {
      showSuccess(t('profileUpdatedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      onOpenChange(false); // Close dialog on success
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('editProfile')}</DialogTitle>
          <DialogDescription>
            {t('completeProfileDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <Alert variant="default" className="bg-yellow-50/50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('important')}</AlertTitle>
          <AlertDescription>
            {t('nameChangeWarning')}
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('firstName')}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
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
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={form.formState.isSubmitting || !canChangeName}
            >
              {t('updateProfile')}
            </Button>

            {!canChangeName && lastUpdate && (
              <p className="text-sm text-destructive text-center pt-2">
                {t('nameChangeCooldownMessage', { 
                  date: format(subDays(lastUpdate, -NAME_CHANGE_COOLDOWN_DAYS), 'PPP') 
                })}
              </p>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditNameDialog;