"use client";
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { LogIn, Mail, Facebook, Loader2, Phone } from 'lucide-react';

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const [redirectTo, setRedirectTo] = useState('');
  const [phoneLogin, setPhoneLogin] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Handle post-login redirection
  useEffect(() => {
    if (user) {
      // Check if there's pending trip data to submit
      const pendingData = localStorage.getItem('pendingTripData');
      if (pendingData) {
        // Redirect to traveler landing page to handle the submission
        navigate('/traveler-landing', { replace: true });
      } else {
        // No pending data, go to home
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate]);

  // Set redirect URL for OAuth
  useEffect(() => {
    setRedirectTo(`${window.location.origin}/`);
  }, []);

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

  const handlePhoneAuth = async () => {
    if (!phone) {
      showError('يرجى إدخال رقم الهاتف');
      return;
    }

    setIsSendingOtp(true);
    try {
      // Check if user exists with this phone number
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .single();

      if (profileError || !profileData) {
        showError('لم يتم العثور على مستخدم بهذا الرقم');
        return;
      }

      // Get user email from auth.users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', profileData.id)
        .single();

      if (userError || !userData) {
        showError('حدث خطأ أثناء جلب معلومات المستخدم');
        return;
      }

      // Send OTP to phone number (in a real app, this would be sent via SMS)
      // For now, we'll just log it
      const fakeOtp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`OTP for ${phone}: ${fakeOtp}`);
      localStorage.setItem(`otp_${phone}`, fakeOtp);
      
      showSuccess('تم إرسال رمز التحقق إلى رقمك');
      setPhoneLogin(true);
    } catch (error) {
      console.error('Phone auth error:', error);
      showError('حدث خطأ أثناء إرسال رمز التحقق');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      showError('يرجى إدخال رمز التحقق');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const storedOtp = localStorage.getItem(`otp_${phone}`);
      if (otp !== storedOtp) {
        showError('رمز التحقق غير صحيح');
        return;
      }

      // Get user by phone number
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .single();

      if (profileError || !profileData) {
        showError('لم يتم العثور على مستخدم بهذا الرقم');
        return;
      }

      // Get user email from auth.users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', profileData.id)
        .single();

      if (userError || !userData) {
        showError('حدث خطأ أثناء جلب معلومات المستخدم');
        return;
      }

      // Sign in with email and password (in a real app, you would use OTP)
      // For now, we'll just redirect to home
      showSuccess('تم تسجيل الدخول بنجاح');
      navigate('/');
    } catch (error) {
      console.error('OTP verification error:', error);
      showError('حدث خطأ أثناء التحقق من رمز التحقق');
    } finally {
      setIsVerifyingOtp(false);
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
            باستخدام حساب واحد يمكنك أن تكون مرسلاً ومسافراً في نفس الوقت، تتابع طلباتك، تتواصل مع الطرف الآخر داخل التطبيق، وتستفيد من نظام التتبع والاشعارات.
          </p>
          <ul className="text-xs lg:text-sm text-muted-foreground space-y-1 list-disc pr-4">
            <li>تسجيل آمن عبر البريد أو عبر Google / Facebook.</li>
            <li>إدارة جميع طلباتك من صفحة "طلباتي" بسهولة.</li>
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
            {phoneLogin ? (
              // Phone OTP verification form
              <div className="space-y-4">
                <div className="text-center">
                  <Phone className="h-12 w-12 text-primary mx-auto mb-2" />
                  <h3 className="text-lg font-semibold">إدخال رمز التحقق</h3>
                  <p className="text-sm text-muted-foreground">
                    تم إرسال رمز التحقق إلى {phone}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">رمز التحقق</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    placeholder="أدخل الرمز المكون من 6 أرقام"
                  />
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp}
                  className="w-full"
                >
                  {isVerifyingOtp ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  التحقق من الرمز
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPhoneLogin(false)}
                  className="w-full"
                >
                  تغيير رقم الهاتف
                </Button>
              </div>
            ) : (
              <>
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

                {/* فاصل */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted-foreground">أو</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Phone login form */}
                <div className="space-y-3">
                  <div className="text-center">
                    <Phone className="h-6 w-6 text-primary mx-auto mb-1" />
                    <h3 className="text-sm font-semibold">تسجيل الدخول برقم الهاتف</h3>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">رقم الهاتف</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      placeholder="مثال: 07701234567"
                    />
                  </div>
                  <Button
                    onClick={handlePhoneAuth}
                    disabled={isSendingOtp}
                    className="w-full"
                  >
                    {isSendingOtp ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    إرسال رمز التحقق
                  </Button>
                </div>
              </>
            )}

            {/* روابط ثانوية */}
            <div className="flex flex-col gap-2 mt-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center">
                <Link to="/reset-password" className="text-primary hover:underline">
                  {t('forgotPassword')}
                </Link>
              </div>
              <p className="text-center text-muted-foreground">
                {t('noAccount')}{' '}
                <Link to="/signup" className="font-medium text-primary hover:underline">
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