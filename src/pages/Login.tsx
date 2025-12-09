"use client";

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { LogIn, Mail, Facebook, Loader2 } from 'lucide-react';

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();

  // إذا كان المستخدم مسجلاً بالفعل، نعيده للصفحة الرئيسية
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const redirectTo = `${window.location.origin}/`;

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error('OAuth error:', error.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-gray-900 px-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-6 items-stretch">
        {/* اللوحة اليسرى: النص التسويقي */}
        <div className="hidden md:flex flex-col justify-center rounded-2xl bg-primary/5 border border-primary/20 p-6 lg:p-8 space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full w-fit">
            <LogIn className="h-4 w-4" />
            <span>منصة وصلها للمسافرين والمرسلين</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground leading-snug">
            سجّل دخولك وابدأ بإرسال الطرود أو نشر رحلتك خلال دقائق.
          </h1>
          <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
            باستخدام حساب واحد يمكنك أن تكون مرسلاً ومسافراً في نفس الوقت، تتابع طلباتك،
            تتواصل مع الطرف الآخر داخل التطبيق، وتستفيد من نظام التتبع والاشعارات.
          </p>
          <ul className="text-xs lg:text-sm text-muted-foreground space-y-1 list-disc pr-4">
            <li>تسجيل آمن عبر البريد أو عبر Google / Facebook.</li>
            <li>إدارة جميع طلباتك من صفحة &quot;طلباتي&quot; بسهولة.</li>
            <li>إمكانية توثيق الحساب لزيادة الثقة بين المستخدمين.</li>
          </ul>
        </div>

        {/* اللوحة اليمنى: نموذج تسجيل الدخول */}
        <Card className="w-full shadow-md border border-border/80">
          <CardHeader className="text-center space-y-1 pb-4 pt-6">
            <CardTitle className="text-2xl font-bold">
              {t('login')}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              سجّل دخولك لمتابعة طلباتك والرحلات بسهولة.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {/* أزرار سوشال مخصصة */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 text-sm py-2.5"
                onClick={() => handleOAuth('google')}
              >
                <img
                  src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png"
                  alt="Google"
                  className="h-5 w-5 rounded-sm bg-white"
                />
                <span>تسجيل الدخول باستخدام Google</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 text-sm py-2.5 bg-[#1877F2] text-white hover:bg-[#1666d0]"
                onClick={() => handleOAuth('facebook')}
              >
                <Facebook className="h-4 w-4" />
                <span>تسجيل الدخول باستخدام Facebook</span>
              </Button>
            </div>

            {/* فاصل */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground">
                أو سجّل دخولك باستخدام البريد الإلكتروني
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* نموذج Supabase Auth للبريد/كلمة المرور */}
            <div className="rounded-lg border bg-muted/30 px-3 sm:px-4 py-3">
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span>البريد الإلكتروني وكلمة المرور</span>
              </div>
              <Auth
                supabaseClient={supabase}
                providers={[]} // منع إظهار أزرار Google/Facebook الافتراضية
                view="sign_in"
                showLinks={false}
                redirectTo={redirectTo}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: 'hsl(var(--primary))',
                        brandAccent: 'hsl(var(--primary-foreground))',
                        inputBackground: 'hsl(var(--background))',
                        inputBorder: 'hsl(var(--border))',
                        inputBorderHover: 'hsl(var(--ring))',
                        inputBorderFocus: 'hsl(var(--ring))',
                        inputText: 'hsl(var(--foreground))',
                      },
                    },
                  },
                  className: {
                    container: 'space-y-3',
                    label: 'text-xs font-medium text-foreground',
                    input:
                      'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm',
                    button:
                      'mt-1.5 h-9 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 w-full flex items-center justify-center gap-1',
                  },
                }}
                localization={{
                  variables: {
                    sign_in: {
                      email_label: t('email'),
                      password_label: t('password'),
                      email_input_placeholder: t('email'),
                      password_input_placeholder: t('password'),
                      button_label: t('login'),
                      social_provider_text: 'تسجيل الدخول باستخدام {{provider}}',
                      forgotten_password: t('forgotPassword'),
                    },
                  },
                }}
              />
            </div>

            {/* روابط ثانوية */}
            <div className="flex flex-col gap-2 mt-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center">
                <Link
                  to="/reset-password"
                  className="text-primary hover:underline"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <p className="text-center text-muted-foreground">
                {t('noAccount')}{' '}
                <Link
                  to="/signup"
                  className="font-medium text-primary hover:underline"
                >
                  {t('signUp')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2 text-xs text-muted-foreground">
        {!user && (
          <div className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/60" />
            <span>باستخدام Supabase Auth لتأمين الحسابات</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;