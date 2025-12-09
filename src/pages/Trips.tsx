"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';

const Trips: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-4">{t('trips')}</h1>
      <p className="text-muted-foreground">
        هذه نسخة مبسطة من صفحة الرحلات لإصلاح خطأ في الكود. إذا نجح البناء الآن، يمكننا إعادة
        منطق البحث والفلترة خطوة بخطوة.
      </p>
    </div>
  );
};

export default Trips;