"use client";
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, ShieldCheck, Package, Clock } from 'lucide-react';

export const BenefitsSection: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-8">لماذا ترسل أغراضك مع وصلها؟</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="text-center p-6">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">تكلفة أقل</h3>
          <p className="text-gray-600 text-sm">أسعارنا أرخص بكثير من شركات الشحن التقليدية.</p>
        </Card>
        <Card className="text-center p-6">
          <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-teal-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">سرعة في التوصيل</h3>
          <p className="text-gray-600 text-sm">تصل أغراضك مع المسافرين في وقت قصير.</p>
        </Card>
        <Card className="text-center p-6">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">أمان وموثوقية</h3>
          <p className="text-gray-600 text-sm">نتحقق من هوية المسافرين لضمان الأمان.</p>
        </Card>
        <Card className="text-center p-6">
          <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-teal-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">تتبع الشحنة</h3>
          <p className="text-gray-600 text-sm">تابع حالة طردك خطوة بخطوة داخل التطبيق.</p>
        </Card>
      </div>
    </div>
  );
};