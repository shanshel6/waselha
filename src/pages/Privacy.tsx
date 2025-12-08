"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const Privacy = () => {
  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">سياسة الخصوصية</h1>
          <p className="text-muted-foreground text-sm">
            نحرص في "وصلها" على حماية خصوصيتك وبياناتك الشخصية. توضح هذه السياسة نوع البيانات التي
            نجمعها وكيف نستخدمها ونحافظ عليها.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>١. البيانات التي نجمعها</CardTitle>
            <CardDescription>أثناء التسجيل واستخدام المنصة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <ul className="list-disc pr-4 space-y-1">
              <li>بيانات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف، نوع الدور (مسافر/مرسل).</li>
              <li>بيانات الملف الشخصي: العنوان، صورة الحساب (إن وُجدت)، حالة التحقق.</li>
              <li>بيانات الرحلات والطلبات: تفاصيل الرحلة، الوزن المتاح، تفاصيل الطرود.</li>
              <li>بيانات المحادثات: الرسائل المتبادلة بين المستخدمين داخل التطبيق.</li>
              <li>بيانات فنية: مثل عنوان الـ IP، نوع المتصفح، وبعض معلومات الاستخدام لتحسين الخدمة.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>٢. كيفية استخدام البيانات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <ul className="list-disc pr-4 space-y-1">
              <li>إنشاء حسابك وتمكينك من تسجيل الدخول واستخدام المنصة.</li>
              <li>تسهيل الربط بين المسافرين والمرسلين وعرض الرحلات والطلبات بشكل مناسب.</li>
              <li>إرسال إشعارات مهمة مثل تحديث حالة الطلب أو الرسائل الجديدة أو التحقق من الهوية.</li>
              <li>تحليل استخدام المنصة لتحسين الأداء وتجربة المستخدم.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>٣. مشاركة البيانات مع أطراف ثالثة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <p>لا نقوم ببيع بياناتك الشخصية لأي طرف ثالث.</p>
            <p>قد نشارك بعض البيانات في الحالات التالية فقط:</p>
            <ul className="list-disc pr-4 space-y-1">
              <li>مع مزودي الخدمات التقنيّة (مثل مزود استضافة قاعدة البيانات) وفقًا لاتفاقيات حماية البيانات.</li>
              <li>عند الطلب القانوني من جهة حكومية أو قضائية وفق القوانين المعمول بها.</li>
              <li>لأغراض الحماية ومنع الاحتيال أو الانتهاكات الأمنية.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>٤. تخزين البيانات وحمايتها</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <ul className="list-disc pr-4 space-y-1">
              <li>نستخدم مزود خدمة معتمد لتخزين البيانات مع طبقات أمنية قياسية.</li>
              <li>نحد من الوصول إلى البيانات الحساسة على الموظفين أو الأنظمة التي تحتاج إليها فقط.</li>
              <li>نوصي المستخدمين باستخدام كلمات مرور قوية وعدم مشاركتها مع أي شخص.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>٥. ملفات تعريف الارتباط (Cookies)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <p>
              قد نستخدم ملفات تعريف الارتباط وتقنيات مشابهة لتحسين تجربة الاستخدام، مثل:
            </p>
            <ul className="list-disc pr-4 space-y-1">
              <li>تذكر تفضيلاتك وإعدادات الواجهة.</li>
              <li>الحفاظ على جلسة تسجيل الدخول الخاصة بك.</li>
              <li>تحليل كيفية استخدامك للمنصة لتحسين الأداء.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>٦. حقوقك كمستخدم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <ul className="list-disc pr-4 space-y-1">
              <li>طلب تصحيح بياناتك الشخصية إذا كانت غير دقيقة.</li>
              <li>طلب حذف حسابك من المنصة (مع مراعاة المتطلبات القانونية وحفظ السجلات).</li>
              <li>طلب معلومات حول كيفية معالجة بياناتك.</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              لممارسة هذه الحقوق يمكنك التواصل مع فريق الدعم من خلال صفحة التواصل أو البريد الإلكتروني
              المخصص للدعم (إن وُجد).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>٧. تحديثات سياسة الخصوصية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <p>
              قد نقوم بتحديث سياسة الخصوصية من وقتٍ لآخر. سيتم نشر أي تحديث على هذه الصفحة،
              ويُعتبر استمرار استخدامك للخدمة بعد التحديث موافقة ضمنية على السياسة المحدثة.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;