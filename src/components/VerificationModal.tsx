"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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

interface VerificationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const VerificationModal: React.FC<VerificationModalProps> = ({ isOpen, onOpenChange }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleConfirm = () => {
    navigate('/verification');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('verificationRequiredTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('verificationRequiredDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>{t('verifyNow')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default VerificationModal;