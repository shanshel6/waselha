"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Plane, Package, Handshake } from 'lucide-react';

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">عن وصلها</h1>
          <p className="text-muted-foreground">
            وصلها منصة تربط بين المسافرين والأشخاص الذين يرغبون في إرسال طرود إلى خارج أو داخل البلد
            بطريقة آمنة ومرنة وأرخص من شركات الشحن التقليدية.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-primary" />
              كيف تعمل المنصة؟
            </CardTitle>
            <CardDescription>فكرة بسيطة مبنية على مشاركة الوزن الفارغ في حقائب السفر.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <ol className="list-decimal pr-4 space-y-1">
              <li>المسافر ينشر رحلته ويحدد من أي دولة إلى أي دولة وكم كيلوجرام متوفر لديه.</li>
              <li>المرسل يبحث عن رحلة مناسبة لوجهته ويقدّم طلب شحن للطرد.</li>
              <li>يتم التواصل عبر المحادثة داخل المنصة لتنسيق مكان التسليم ووقت الاستلام.</li>
              <li>بعد تسليم الطرد ووصوله، يتم تحديث حالة الطلب حتى يطمئن الطرفان.</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              الأمان والتحقق
            </CardTitle>
            <CardDescription>نحرص على تجربة آمنة للطرفين قدر الإمكان.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <ul className="list-disc pr-4 space-y-1">
              <li>يمكن للمستخدم طلب توثيق حسابه برفع هوية شخصية وبطاقة سكن وصورة شخصية.</li>
              <li>المسؤولون يراجعون طلبات التحقق ويمنحون شارة "مستخدم موثّق" للحسابات الموثوقة.</li>
              <li>يُنصح بعدم تسليم أو استلام أي طرد يخالف قائمة العناصر المحظورة داخل التطبيق.</li>
              <li>كل طلب يحتوي على تتبع لحالة الطرد من لحظة القبول حتى التسليم والإكمال.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              الرسوم والتكاليف
            </CardTitle>
            <CardDescription>اتفاق عادل بين المسافر والمرسل.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              تعتمد تكلفة الشحن في وصلها على:
            </p>
            <ul className="list-disc pr-4 space-y-1">
              <li>نوع الدول (قريبة / متوسطة / بعيدة) – يتم احتسابها تلقائياً في حاسبة الأسعار.</li>
              <li>وزن الطرد بالكيلوجرام – كلما زاد الوزن انخفض سعر الكيلو.</li>
              <li>في بعض الحالات يمكن إضافة تأمين اختياري لرفع نسبة التعويض عند فقدان الطرد.</li>
            </ul>
            <p className="text-muted-foreground">
              المبلغ النهائي يظهر للمرسل قبل إرسال الطلب، ويمكن للطرفين الاتفاق على تفاصيل إضافية
              عبر المحادثة داخل التطبيق.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-primary" />
              مسؤولية كل طرف
            </CardTitle>
            <CardDescription>وضوح الأدوار يحمي الجميع.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <ul className="list-disc pr-4 space-y-1">
              <li>المرسل مسؤول عن محتويات الطرد والتأكد من خلوّه من أي مواد ممنوعة.</li>
              <li>المسافر مسؤول عن الحفاظ على الطرد وتسليمه في المكان والوقت المتفق عليه.</li>
              <li>المنصة توفّر وسيلة تواصل وتتبع، ولا تتحمّل مسؤولية قانونية عن محتويات الطرود.</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              باستخدامك للمنصة، أنت توافق ضمنياً على الالتزام بشروط الاستخدام وقائمة العناصر المحظورة
              والقوانين المحلية والدولية للشحن والسفر.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;