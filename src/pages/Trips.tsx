"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';

const Trips: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)]">
      <h1 className="text-3xl font-bold mb-4">{t('trips')}</h1>
      <p className="text-muted-foreground">
        صفحة الرحلات قيد التحديث مؤقتاً لتصحيح خطأ في الكود. يمكنك الاستمرار باستخدام بقية الصفحات
        (الرئيسية، طلباتي، إضافة رحلة، إلخ) بشكل طبيعي.
      </p>
    </div>
  );
};

export default Trips;