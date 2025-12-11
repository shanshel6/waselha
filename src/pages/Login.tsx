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
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  const handleLogin = async () => {
    if (!phone) {
      showError('يرجى إدخال رقم الهاتف');
      return;
    }

    if (!password) {
      showError('يرجى إدخال كلمة المرور');
      return;
    }

    // Validate phone number format (Iraqi phone numbers)
    const phoneRegex = /^(07\d{9}|\+9647\d{9}|9647\d{9})$/;
    if (!phoneRegex.test(phone)) {
      showError('يرجى إدخال رقم هاتف عراقي صحيح');
      return;
    }

    // Validate password format (6 digits)
    if (!/^\d{6}$/.test(password)) {
      showError('كلمة المرور يجب أن تكون 6 أرقام');
      return;
    }

    setIsLoggingIn(true);
    
    try {
      // Create valid email from phone number by removing special characters
      const cleanPhone = phone.replace(/\D/g, '');
      const email = `user${cleanPhone}@waslaha.app`;
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format generated');
      }

      // Try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      showSuccess('تم تسجيل الدخول بنجاح');
      // Redirect to home
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      showError(error.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoggingIn(false);
    }
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
              أدخل رقم هاتفك وكلمة المرور
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
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
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">كلمة المرور</label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full h-12 text-lg" 
                  placeholder="6 أرقام" 
                  maxLength={6} 
                  dir="ltr" 
                />
                <p className="text-xs text-muted-foreground mt-2">
                  أدخل كلمة المرور المكونة من 6 أرقام التي استلمتها عبر رسالة نصية
                </p>
              </div>
              <Button onClick={handleLogin} disabled={isLoggingIn} className="w-full h-12 text-lg">
                {isLoggingIn ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                {isLoggingIn ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </Button>
            </div>
            {/* روابط ثانوية */}
            <div className="flex flex-col gap-2 mt-4 text-sm">
              <p className="text-center text-muted-foreground">
                ليس لديك حساب؟{' '}
                <Link to="/signup" className="font-medium text-primary hover:underline">
                  إنشاء حساب جديد
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