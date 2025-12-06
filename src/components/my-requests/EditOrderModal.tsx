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

const editOrderSchema = z.object({
  weight_kg: z.coerce.number().min(1, { message: "positiveNumber" }).max(50, { message: "maxWeight" }),
  description: z.string().min(10, { message: "descriptionTooShort" }),
});

interface EditOrderModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: any; // The order object to edit
  onSubmit: (values: z.infer<typeof editOrderSchema>) => void;
  isSubmitting: boolean;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({ isOpen, onOpenChange, order, onSubmit, isSubmitting }) => {
  const { t } = useTranslation();

  const form = useForm<z.infer<typeof editOrderSchema>>({
    resolver: zodResolver(editOrderSchema),
    defaultValues: {
      weight_kg: order?.weight_kg || 1,
      description: order?.description || "",
    },
  });

  React.useEffect(() => {
    if (order) {
      form.reset({
        weight_kg: order.weight_kg,
        description: order.description,
      });
    }
  }, [order, form]);

  const handleFormSubmit = (values: z.infer<typeof editOrderSchema>) => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editOrder')}</DialogTitle>
          <DialogDescription>
            {order?.status === 'claimed' ? t('editClaimedOrderDescription') : t('editNewOrderDescription')}
          </DialogDescription>
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