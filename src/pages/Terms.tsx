"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const Terms = () => {
  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">شروط الاستخدام</h1>
          <p className="text-muted-foreground text-sm">
            يرجى قراءة هذه الشروط بعناية قبل استخدام منصة "وصلها". باستخدامك للخدمة، فإنك توافق
            على الالتزام بهذه الشروط وكافة السياسات المرتبطة بها.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>١. التعريف بالخدمة</CardTitle>
            <CardDescription>ما هي منصة وصلها؟</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <p>
              "وصلها" منصة إلكترونية تربط بين:
            </p>
            <ul className="list-disc pr-4 space-y-1">
              <li>المسافرين الذين لديهم وزن فارغ في حقائبهم.</li>
              <li>الأشخاص الراغبين في إرسال طرود بين الدول أو داخل البلد.</li>
            </ul>
            <p>
              المنصة ليست شركة شحن ولا تقوم بنقل الطرود بنفسها، بل توفر وسيلة تواصل وتنسيق وتتبع
              بين الأطراف فقط.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>٢. حساب المستخدم</CardTitle>
            <CardDescription>إنشاء الحساب ومسؤوليته</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <ul className="list-disc pr-4 space-y-1">
              <li>يجب أن تكون جميع البيانات التي تقدمها عند التسجيل صحيحة ومحدثة.</li>
              <li>أنت مسؤول عن سرية بيانات تسجيل الدخول الخاصة بك وعدم مشاركتها مع أي طرف آخر.</li>
              <li>أي استخدام يتم من خلال حسابك يُعتبر صادرًا عنك شخصيًا.</li>
              <li>يحق للمنصة تعليق أو إيقاف الحساب في حال الاشتباه بسوء استخدام أو مخالفة للشروط.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>٣. محتوى الطرود والمسؤولية القانونية</CardTitle>
            <CardDescription>مسؤولية المرسل والمسافر</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <ul className="list-disc pr-4 space-y-1">
              <li>المرسل مسؤول مسؤولية كاملة عن محتويات الطرد وملاءمتها للقوانين المحلية والدولية.</li>
              <li>يُمنع إرسال أي مواد محظورة أو مخالفة لقوانين الجمارك أو الطيران أو الأمن.</li>
              <li>المسافر ملزم بفحص الطرد قدر الإمكان قبل قبوله، وطلب صور وفحص للطرد عند التسليم.</li>
              <li>المنصة لا تتحمل أي مسؤولية قانونية عن محتوى الطرود أو الأضرار الناتجة عنها.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>٤. المدفوعات والتعاملات المالية</CardTitle>
            <CardDescription>الاتفاق بين المسافر والمرسل</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <ul className="list-disc pr-4 space-y-1">
              <li>سعر الشحن يُقدَّر بناءً على الوزن والدولة، ويمكن تعديله بالاتفاق بين الطرفين.</li>
              <li>أي دفع نقدي أو تحويل يتم خارج المنصة هو اتفاق مباشر بين المسافر والمرسل.</li>
              <li>المنصة لا تضمن سداد المبالغ ولا تُعد طرفًا في أي نزاع مالي بين المستخدمين.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>٥. استخدام المنصة</CardTitle>
            <CardDescription>ما يُسمح وما لا يُسمح به</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <ul className="list-disc pr-4 space-y-1">
              <li>يُمنع استخدام المنصة لأي أغراض غير قانونية أو احتيالية أو ضارة.</li>
              <li>يُمنع محاولة اختراق أو تعطيل المنصة أو أنظمتها بأي شكل.</li>
              <li>يُمنع نشر أي محتوى مسيء أو عنصري أو مخالف للآداب العامة.</li>
              <li>يحق للمنصة حظر أو إزالة أي محتوى أو حساب يخالف هذه الشروط.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>٦. الإخلاء من المسؤولية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <p>
              تُقدَّم الخدمة "كما هي" بدون أي ضمانات صريحة أو ضمنية. لا تضمن المنصة:
            </p>
            <ul className="list-disc pr-4 space-y-1">
              <li>وصول الطرود في وقت محدد.</li>
              <li>التزام أي مستخدم بوعوده أو اتفاقاته.</li>
              <li>عدم وقوع أضرار أو فقدان للأمتعة أو الطرود.</li>
            </ul>
            <p>
              أنت تستخدم الخدمة على مسؤوليتك الشخصية، وتُقر بأن المنصة ليست طرفًا في التعاقد المباشر
              بين المسافر والمرسل.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>٧. التعديلات على الشروط</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <p>
              قد نقوم بتحديث هذه الشروط من وقت لآخر. سيتم نشر أي تعديل على هذه الصفحة، ويُعتبر
              استمرار استخدامك للمنصة بعد التعديل موافقة ضمنية على الشروط المحدثة.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;