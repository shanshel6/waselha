"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const Verification = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{t('verifyYourself')}</CardTitle>
          <CardDescription>
            {t('verificationInstructions')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            {t('verificationRequiredDescription')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Verification;