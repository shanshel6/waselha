"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { forbiddenItemsList, ForbiddenItemCategory } from '@/lib/forbidden-items';
import { XCircle, ShieldAlert } from 'lucide-react';

interface ForbiddenItemsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const ForbiddenItemsDialog: React.FC<ForbiddenItemsDialogProps> = ({ isOpen, onOpenChange, onConfirm }) => {
  const { t } = useTranslation();

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            {t('forbiddenItemsTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('forbiddenItemsDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="max-h-[40vh] overflow-y-auto pr-4 space-y-4">
          {forbiddenItemsList.map((category: ForbiddenItemCategory) => (
            <div key={category.title}>
              <h3 className="font-semibold mb-2 text-foreground">{t(category.title)}</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {category.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <span>{t(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t('agreeAndContinue')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ForbiddenItemsDialog;