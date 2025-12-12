import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Plane, Package, ShieldAlert } from 'lucide-react';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { useVerificationStatus } from '@/hooks/use-verification-status';

const Index = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const { data: verificationInfo, isLoading: isVerificationLoading } = useVerificationStatus();

  const isLoggedIn = !!user;
  const isVerified = verificationInfo?.status === 'approved';

  const showVerificationBanner = isLoggedIn && !isVerificationLoading && !isVerified;

  return (
    <div className="flex flex-col items-center bg-background">
      {/* Hero Section */}
      <section className="relative w-full h-[60vh] md:h-[70vh] flex items-center justify-center text-center text-white">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 z-10" />
        <img
          src="https://images.unsplash.com/photo-1569154941061-e231b4725ef1?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixlib=idM3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Modern airport terminal"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 max-w-4xl p-4">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight text-shadow-md">
            {t('welcome')}
          </h1>
          <p className="text-lg md:text-xl text-neutral-200 mb-8 text-shadow">
            وصلها تربطك بالأشخاص المناسبين لشحن طرودك بسرعة وأمان وتكلفة أقل بكثير من شركات الشحن
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-4">
            <Link to="/traveler-landing">
              <Button size="lg" className="w-full text-lg py-6">
                <Plane className="mr-2 h-5 w-5" />
                {t('imATraveler')}
              </Button>
            </Link>
            <Link to="/send-item">
              <Button size="lg" className="w-full text-lg py-6 bg-white/10 border border-white text-white hover:bg-white/20 backdrop-blur-sm">
                <Package className="mr-2 h-5 w-5" />
                {t('iWantToSendPackage')}
              </Button>
            </Link>
          </div>
          {showVerificationBanner && (
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

      {/* Onboarding Gateway */}
      <section className="w-full max-w-5xl px-4 my-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Travelers card */}
          <div className="bg-card border rounded-2xl shadow-sm p-6 flex flex-col h-full text-center items-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Plane className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">للمسافرين</h2>
            <p className="text-muted-foreground mb-6">
              لديك وزن فارغ في حقيبتك؟ انشر رحلتك واكسب المال مقابل حمل طرود آمنة ومحددة.
            </p>
            <Link to="/traveler-landing" className="mt-auto w-full">
              <Button size="lg" variant="outline" className="w-full">
                ابدأ كمسافر
              </Button>
            </Link>
          </div>

          {/* Senders card */}
          <div className="bg-card border rounded-2xl shadow-sm p-6 flex flex-col h-full text-center items-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">للمرسلين</h2>
            <p className="text-muted-foreground mb-6">
              تريد إرسال طرد؟ ابحث عن رحلة مناسبة أو أنشئ طلب شحن عام ليتم مطابقته مع مسافر.
            </p>
            <Link to="/send-item" className="mt-auto w-full">
              <Button size="lg" className="w-full">
                أرسل طرد الآن
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;