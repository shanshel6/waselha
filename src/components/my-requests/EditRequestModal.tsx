"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const editRequestSchema = z.object({
  weight_kg: z.coerce.number().min(1, { message: "positiveNumber" }).max(50, { message: "maxWeight" }),
  description: z.string().min(10, { message: "descriptionTooShort" }),
});

interface EditRequestModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  request: any; // The request object to edit
  onSubmit: (values: z.infer<typeof editRequestSchema>) => void;
  isSubmitting: boolean;
}

export const EditRequestModal: React.FC<EditRequestModalProps> = ({ isOpen, onOpenChange, request, onSubmit, isSubmitting }) => {
  const { t } = useTranslation();

  const form = useForm<z.infer<typeof editRequestSchema>>({
    resolver: zodResolver(editRequestSchema),
    defaultValues: {
      weight_kg: request?.weight_kg || 1,
      description: request?.description || "",
    },
  });

  React.useEffect(() => {
    if (request) {
      form.reset({
        weight_kg: request.weight_kg,
        description: request.description,
      });
    }
  }, [request, form]);

  const handleFormSubmit = (values: z.infer<typeof editRequestSchema>) => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editRequest')}</DialogTitle>
          <DialogDescription>{t('editRequestDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="weight_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('packageWeightKg')}</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" min="1" max="50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('packageContents')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('packageContentsPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
              <Button type="submit" disabled={isSubmitting}>{t('submitChanges')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};