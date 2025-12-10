import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Plane, Package, DollarSign, Handshake, ShieldCheck, MessageSquare, ShieldAlert } from 'lucide-react';
import PriceCalculator from '@/components/PriceCalculator';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useVerificationStatus } from '@/hooks/use-verification-status';

const Index = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const { data: verificationInfo } = useVerificationStatus();
  
  const isLoggedIn = !!user;
  const isVerified = verificationInfo?.status === 'approved';

  const howItWorksSteps = [
    {
      icon: <Plane className="h-10 w-10 text-primary" />,
      title: t('step1Title'),
      description: t('step1Description'),
    },
    {
      icon: <Package className="h-10 w-10 text-primary" />,
      title: t('step2Title'),
      description: t('step2Description'),
    },
    {
      icon: <Handshake className="h-10 w-10 text-primary" />,
      title: t('step3Title'),
      description: t('step3Description'),
    },
    {
      icon: <DollarSign className="h-10 w-10 text-primary" />,
      title: t('step4Title'),
      description: t('step4Description'),
    },
  ];

  return (
    <div className="flex flex-col items-center bg-background">
      {/* Hero Section */}
      <section className="relative w-full h-[60vh] md:h-[70vh] flex items-center justify-center text-center text-white">
        <div className="absolute inset-0 bg-black/50 z-10" />
        <img
          src="https://images.unsplash.com/photo-1569154941061-e231b4725ef1?q=80&w=2070&auto=format&fit=crop&ixlib-rb-4.0.3&ixlib=idM3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Modern airport terminal"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 max-w-4xl p-4">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>
            {t('welcome')}
          </h1>
          <p className="text-lg md:text-xl text-neutral-200 mb-8" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>
            اربط بين المسافرين والمرسلين لشحن الطرود بطريقة أسهل وأرخص من شركات الشحن التقليدية.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-4">
            <Link to="/add-trip">
              <Button size="lg" className="w-full text-lg py-6">
                <Plane className="mr-2 h-5 w-5" />
                {t('imATraveler')}
              </Button>
            </Link>
            <Link to="/trips">
              <Button size="lg" variant="secondary" className="w-full text-lg py-6">
                <Package className="mr-2 h-5 w-5" />
                {t('iWantToSendPackage')}
              </Button>
            </Link>
          </div>
          {isLoggedIn && !isVerified && (
            <div className="max-w-2xl mx-auto mt-2">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 rounded-lg bg-yellow-50/90 text-yellow-900 px-3 py-2 text-xs sm:text-sm shadow-sm">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  <span>قم بتوثيق حسابك لزيادة ثقة المستخدمين بك، خاصة عند إرسال أو استلام الطرود.</span>
                </div>
                <Link to="/verification">
                  <Button size="xs" variant="outline" className="border-yellow-500 text-yellow-900 hover:bg-yellow-100">
                    {t('verifyNow')}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Simple onboarding: two flows */}
      <section className="w-full max-w-5xl px-4 mt-8 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Travelers card */}
          <div className="bg-card border rounded-2xl shadow-sm p-4 md:p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <Plane className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">للمسافرين</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              إذا كنت مسافرًا ولديك وزن فارغ في حقيبتك، يمكنك نشر رحلتك وكسب المال مقابل حمل طرود آمنة ومحددة.
            </p>
            <ul className="text-sm text-foreground space-y-1 list-disc pr-4">
              <li>انشر رحلتك من صفحة &quot;إضافة رحلة&quot;.</li>
              <li>استقبل طلبات من المرسلين الذين يطابقون مسار رحلتك.</li>
              <li>تأكد من محتوى الطرد عبر الصور والفحص قبل السفر.</li>
              <li>سلّم الطرد عند الوصول واستلم المبلغ المتفق عليه.</li>
            </ul>
            <div className="mt-4 flex justify-between items-center">
              <Link to="/add-trip">
                <Button size="sm" variant="outline">
                  ابدأ كمسافر
                </Button>
              </Link>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                <span>يفضّل توثيق الحساب لزيادة الثقة</span>
              </div>
            </div>
          </div>

          {/* Senders card */}
          <div className="bg-card border rounded-2xl shadow-sm p-4 md:p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">للمرسلين</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              إذا أردت إرسال طرد إلى دولة أخرى أو مدينة أخرى، يمكنك إما اختيار رحلة مناسبة أو إنشاء طلب شحن عام.
            </p>
            <ul className="text-sm text-foreground space-y-1 list-disc pr-4">
              <li>ابحث عن رحلة من صفحة &quot;الرحلات&quot; واختر مسافرًا مناسبًا.</li>
              <li>أو أنشئ &quot;طلب شحن عام&quot; من صفحة &quot;طلب شحن جديد&quot;.</li>
              <li>تواصل مع المسافر داخل التطبيق لتحديد مكان ووقت التسليم.</li>
              <li>تابع حالة الطرد خطوة بخطوة من صفحة &quot;طلباتي&quot;.</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-2">
                <Link to="/trips">
                  <Button size="sm" variant="outline">
                    تصفح الرحلات
                  </Button>
                </Link>
                <Link to="/place-order">
                  <Button size="sm" variant="secondary">
                    طلب شحن عام
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 md:mt-0">
                <MessageSquare className="h-3 w-3" />
                <span>كل الاتفاقات تتم داخل دردشة آمنة</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="w-full max-w-5xl py-10 md:py-16 px-4">
        <h2 className="text-4xl font-bold text-center mb-12">{t('howItWorks')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {howItWorksSteps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text_center p-4">
              <div className="bg-primary/10 rounded-full p-4 mb-4">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Calculator Section */}
      <PriceCalculator />
    </div>
  );
};

export default Index;