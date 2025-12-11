"use client";
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { LogIn, Phone, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Input } from '@/components/ui/input';

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [showOtpForm, setShowOtpForm] = useState(false);

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

  const handleSendOtp = async () => {
    if (!phone) {
      showError('يرجى إدخال رقم الهاتف');
      return;
    }

    // Validate phone number format (Iraqi phone numbers)
    const phoneRegex = /^(07\d{9}|\\+9647\d{9})$/;
    if (!phoneRegex.test(phone)) {
      showError('يرجى إدخال رقم هاتف عراقي صحيح');
      return;
    }

    setIsSendingOtp(true);
    try {
      // Generate a 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in localStorage (in production, this would be sent via SMS)
      localStorage.setItem(`otp_${phone}`, generatedOtp);
      
      console.log(`OTP for ${phone}: ${generatedOtp}`); // For debugging
      
      showSuccess('تم إرسال رمز التحقق إلى رقمك');
      setShowOtpForm(true);
    } catch (error) {
      console.error('Error sending OTP:', error);
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

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      showError('رمز التحقق يجب أن يكون 6 أرقام');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const storedOtp = localStorage.getItem(`otp_${phone}`);
      
      if (otp !== storedOtp) {
        showError('رمز التحقق غير صحيح');
        return;
      }

      // Create or sign in user with phone number
      const email = `user+${phone.replace(/\+/g, '')}@waslaha.app`;
      const password = phone; // Use phone as password for simplicity
      
      // Try to sign in first
      let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      // If user doesn't exist, create a new account
      if (error && error.message.includes('Invalid login credentials')) {
        const signUpResult = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone: phone,
              role: 'both'
            }
          }
        });
        
        if (signUpResult.error) {
          throw signUpResult.error;
        }
        
        data = signUpResult.data;
      } else if (error) {
        throw error;
      }

      showSuccess('تم تسجيل الدخول بنجاح');
      
      // Clear OTP from storage
      localStorage.removeItem(`otp_${phone}`);
      
      // Redirect to home
      navigate('/');
    } catch (error: any) {
      console.error('OTP verification error:', error);
      showError(error.message || 'حدث خطأ أثناء التحقق من رمز التحقق');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setOtp('');
    await handleSendOtp();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <Card className="w-full shadow-md border border-border/80">
          <CardHeader className="text-center space-y-1 pb-4 pt-6">
            <div className="flex justify-center mb-2">
              <div className="bg-primary/10 p-3 rounded-full">
                <Phone className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              تسجيل الدخول
            </CardTitle>
            <CardDescription className="text-sm">
              أدخل رقم هاتفك لتستلم رمز التحقق
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {!showOtpForm ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">رقم الهاتف</label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-12 text-lg"
                    placeholder="مثال: 07701234567"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    سيتم إرسال رمز التحقق إلى هذا الرقم
                  </p>
                </div>
                <Button
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  className="w-full h-12 text-lg"
                >
                  {isSendingOtp ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  {isSendingOtp ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold">إدخال رمز التحقق</h3>
                  <p className="text-sm text-muted-foreground">
                    تم إرسال رمز التحقق إلى {phone}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">رمز التحقق</label>
                  <Input
                    type="tel"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full h-12 text-lg text-center"
                    placeholder="6 أرقام"
                    maxLength={6}
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    أدخل الرمز المكون من 6 أرقام
                  </p>
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp}
                  className="w-full h-12 text-lg"
                >
                  {isVerifyingOtp ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  {isVerifyingOtp ? 'جاري التحقق...' : 'تحقق من الرمز'}
                </Button>
                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={handleResendOtp}
                    disabled={isSendingOtp}
                    className="text-sm"
                  >
                    {isSendingOtp ? 'جاري الإعادة...' : 'إعادة إرسال الرمز'}
                  </Button>
                </div>
              </div>
            )}

            {/* روابط ثانوية */}
            <div className="flex flex-col gap-2 mt-4 text-sm">
              <p className="text-center text-muted-foreground">
                ليس لديك حساب؟{' '}
                <Link to="/signup" className="font-medium text-primary hover:underline">
                  إنشاء حساب جديد
                </Link>
              </p>
              <p className="text-center text-muted-foreground">
                <Link to="/reset-password" className="font-medium text-primary hover:underline">
                  نسيت كلمة المرور؟
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Login;