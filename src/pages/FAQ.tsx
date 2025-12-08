"use client";

import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const FAQ = () => {
  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">الأسئلة الشائعة</h1>
          <p className="text-muted-foreground">
            هنا تجد إجابات لأكثر الأسئلة تكراراً حول استخدام منصة وصلها للمسافرين والمرسلين.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>أسئلة عامة</CardTitle>
            <CardDescription>معلومات أساسية عن طريقة عمل المنصة.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full space-y-2">
              <AccordionItem value="what-is-waslaha">
                <AccordionTrigger>ما هي وصلها؟</AccordionTrigger>
                <AccordionContent>
                  وصلها منصة تربط بين المسافرين وأصحاب الطرود، بحيث يستفيد المسافر من الوزن
                  الفارغ في حقيبته، ويستفيد المرسل من سعر شحن أقل من شركات الشحن التقليدية.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="how-long-delivery">
                <AccordionTrigger>متى من المفترض أن يصل الطرد؟</AccordionTrigger>
                <AccordionContent>
                  يعتمد وقت وصول الطرد على تاريخ رحلة المسافر والاتفاق بينكما. بعد قبول الطلب،
                  يمكنك متابعة حالة الطلب من صفحة "طلباتي" ورؤية كل مرحلة من مراحل التتبع
                  (قبول – صور – فحص – في الطريق – تم التسليم – مكتمل).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="who-is-responsible">
                <AccordionTrigger>من يتحمل مسؤولية الطرد؟</AccordionTrigger>
                <AccordionContent>
                  المرسل يتحمل مسؤولية قانونية عن محتويات الطرد والتأكد من خلوّه من أي عناصر
                  محظورة. المسافر يتحمل مسؤولية المحافظة على الطرد وتسليمه في الوقت والمكان
                  المتفق عليه. دور المنصة هو توفير وسيلة للتواصل والتتبع فقط.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>أسئلة المرسلين</CardTitle>
            <CardDescription>إذا كنت ترغب في إرسال طرد، فهذه الأسئلة تهمك.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full space-y-2">
              <AccordionItem value="how-to-send">
                <AccordionTrigger>كيف أرسل طرداً عبر وصلها؟</AccordionTrigger>
                <AccordionContent>
                  يمكنك إما:
                  <br />- البحث عن رحلة مناسبة من صفحة "الرحلات" ثم فتح تفاصيل الرحلة وتعبئة نموذج الطلب.
                  <br />- أو إنشاء "طلب شحن عام" من صفحة "طلب شحن جديد"، وسيتم مطابقة طلبك تلقائياً مع رحلات مناسبة.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="how-price-calculated">
                <AccordionTrigger>كيف يتم احتساب تكلفة الشحن؟</AccordionTrigger>
                <AccordionContent>
                  التكلفة تعتمد على الدولة، والوزن، ونوع المنطقة (قريبة / متوسطة / بعيدة).
                  يمكنك استخدام حاسبة الأسعار في الصفحة الرئيسية لمعرفة المبلغ التقريبي
                  قبل إرسال الطلب.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="what-if-problem">
                <AccordionTrigger>ماذا أفعل إذا حدثت مشكلة مع المسافر؟</AccordionTrigger>
                <AccordionContent>
                  أولاً حاول التواصل مع المسافر عبر المحادثة داخل التطبيق. إذا استمرت المشكلة
                  يمكنك التواصل مع دعم المنصة وإرسال تفاصيل الطلب وسير المحادثة ليتم مراجعة الحالة.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>أسئلة المسافرين</CardTitle>
            <CardDescription>إذا كنت مسافراً وتريد الربح من الوزن الفارغ، اقرأ التالي.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full space-y-2">
              <AccordionItem value="how-to-earn">
                <AccordionTrigger>كيف أستفيد كمُسافر؟</AccordionTrigger>
                <AccordionContent>
                  تقوم بنشر رحلتك وتحديد الوزن المتاح، وعندما يرسل لك المستخدمون طلبات،
                  يمكنك قبول الطلبات التي تناسبك. ستحصل على مبلغ متفق عليه مقابل حمل الطرد.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="forbidden-items">
                <AccordionTrigger>ما هي الأشياء الممنوعة؟</AccordionTrigger>
                <AccordionContent>
                  أي مواد متفجرة، قابلة للاشتعال، مخدرات، أدوية بدون وصفة، أجهزة إلكترونية
                  مخالفة لتعليمات الطيران، أو أي شيء يخالف قوانين الجمارك والطيران.
                  داخل التطبيق ستجد قائمة بالعناصر المحظورة قبل إرسال أو قبول الطلب.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="am-i-protected">
                <AccordionTrigger>هل أنا محمي قانونياً كمُسافر؟</AccordionTrigger>
                <AccordionContent>
                  يجب عليك دائماً التأكد من محتوى الطرد قبل قبوله، وطلب صور وفحص الطرد
                  (وهو ما يوفره النظام داخل التطبيق). في النهاية يبقى التزامك بالقوانين
                  المحلية والدولية هو خط الدفاع الأساسي لك.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FAQ;