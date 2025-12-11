"use client";
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, MapPin, StickyNote } from 'lucide-react';

export const BenefitsSection: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-8">ليش تنشر رحلتك؟</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="text-center p-6">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">طلع فلوس من وزن الشنطة الفاضي</h3>
          <p className="text-gray-600 text-sm">حول مساحتك الزائدة إلى دخل إضافي</p>
        </Card>
        <Card className="text-center p-6">
          <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-teal-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">ساعد الناس توصل أغراضها</h3>
          <p className="text-gray-600 text-sm">ساهم في تسهيل حياة الآخرين</p>
        </Card>
        <Card className="text-center p-6">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <StickyNote className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">الدفع محمي داخل الموقع</h3>
          <p className="text-gray-600 text-sm">معاملات آمنة ومراقبة</p>
        </Card>
        <Card className="text-center p-6">
          <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="bg-teal-600 text-white rounded-full w-8 h-8 flex items-center justify-center">✓</div>
          </div>
          <h3 className="font-semibold text-lg mb-2">المسافرين والمُرسلين يتحققون من هويتهم</h3>
          <p className="text-gray-600 text-sm">بيئة آمنة وموثوقة</p>
        </Card>
      </div>
    </div>
  );
};