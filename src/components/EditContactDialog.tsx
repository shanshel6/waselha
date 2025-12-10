"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { isPast, subDays, subMonths, format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Profile } from '@/hooks/use-profile';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Phone, MapPin } from 'lucide-react';

const contactSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
});

interface EditContactDialogProps {
  profile: Profile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditContactDialog: React.FC<EditContactDialogProps> = ({ profile, isOpen, onOpenChange }) => {
  const { t } = useTranslation();
  const { user } = useSession();
  const queryClient = useQueryClient();
  
  const form = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      phone: profile.phone || "",
      address: profile.address || "",
    },
    values: {
      phone: profile.phone || "",
      address: profile.address || "",
    },
  });

  // Check if user can update contact info (once per month)
  const lastUpdate = profile.updated_at ? new Date(profile.updated_at) : null;
  const canUpdateContact = !lastUpdate || isPast(subMonths(lastUpdate, -1));

  const onSubmit = async (values: z.infer<typeof contactSchema>) => {
    if (!user) {
      showError(t('mustBeLoggedIn'));
      return;
    }

    if (!canUpdateContact) {
      showError(t('contactInfoUpdateCooldownError', { 
        date: format(subMonths(lastUpdate!, -1), 'PPP') 
      }));
      return;
    }

    const hasPhoneChanged = values.phone !== profile.phone;
    const hasAddressChanged = values.address !== profile.address;

    if (!hasPhoneChanged && !hasAddressChanged) {
      showError(t('noChangesMade'));
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        phone: values.phone || null,
        address: values.address || null,
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
          <DialogTitle>{t('editContactInfo')}</DialogTitle>
          <DialogDescription>
            {t('updatePhoneAndAddress')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {t('phone')}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {t('address')}
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={form.formState.isSubmitting || !canUpdateContact}
              >
                {t('updateProfile')}
              </Button>
              {!canUpdateContact && lastUpdate && (
                <p className="text-sm text-destructive text-center pt-2">
                  {t('contactInfoUpdateCooldownMessage', { 
                    date: format(subMonths(lastUpdate, -1), 'PPP') 
                  })}
                </p>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditContactDialog;