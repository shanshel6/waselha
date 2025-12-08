"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Facebook, Phone } from 'lucide-react';

const Contact = () => {
  const facebookUrl = 'https://www.facebook.com/profile.php?id=61584316989204';
  const whatsappNumber = '07779786420';
  // لتحسين التوافق مع واتساب، نستخدم تنسيق دولي إذا أحببت لاحقاً
  const whatsappLink = `https://wa.me/9647779786420`; // مثال: 964 + 7779786420

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">تواصل معنا</h1>
          <p className="text-muted-foreground text-sm">
            إذا واجهت مشكلة في الطلبات أو التسجيل أو لديك استفسار عام عن المنصة، يمكنك التواصل معنا
            مباشرة عبر فيسبوك أو واتساب.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              قنوات الدعم المتاحة
            </CardTitle>
            <CardDescription>
              اختر الطريقة الأنسب لك للتواصل مع فريق دعم وصلها.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                className="flex-1"
                variant="default"
                onClick={() => window.open(facebookUrl, '_blank', 'noopener,noreferrer')}
              >
                <Facebook className="h-4 w-4 ml-1" />
                تواصل عبر فيسبوك
              </Button>

              <Button
                className="flex-1"
                variant="secondary"
                onClick={() => window.open(whatsappLink, '_blank', 'noopener,noreferrer')}
              >
                <Phone className="h-4 w-4 ml-1" />
                تواصل عبر واتساب
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                رقم واتساب للدعم: <span className="font-mono">{whatsappNumber}</span>
              </p>
              <p>
                يُفضّل أن تذكر رقم الطلب (إن وجد) ووصف قصير للمشكلة حتى نتمكن من خدمتك بشكل أسرع.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Contact;