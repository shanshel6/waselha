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
import { forbiddenItemsList } from '@/lib/forbidden-items';
import { ShieldAlert } from 'lucide-react';
import IconRenderer from './IconRenderer';

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
        
        <div className="max-h-[40vh] overflow-y-auto pr-4">
          <ul className="space-y-2 text-sm">
            {forbiddenItemsList.map((item) => (
              <li key={item.key} className="flex items-center gap-3 p-2 rounded-md bg-gray-50 dark:bg-gray-800/50">
                <IconRenderer name={item.icon} className="h-5 w-5 text-destructive flex-shrink-0" />
                <span className="text-foreground">{t(item.key)}</span>
              </li>
            ))}
          </ul>
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