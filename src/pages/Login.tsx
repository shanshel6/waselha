"use client";
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { LogIn, Phone, Loader2, Lock } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Input } from '@/components/ui/input';

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const formatPhoneNumber = (phone: string): string => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('07')) {
      cleanPhone = cleanPhone.substring(1);
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('9647')) {
      cleanPhone = cleanPhone.substring(3);
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith('+9647')) {
      cleanPhone = cleanPhone.substring(4);
    }
    return cleanPhone;
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      showError('يرجى إدخال رقم الهاتف وكلمة المرور');
      return;
    }

    const phoneRegex = /^(07\d{9}|\+9647\d{9}|9647\d{9})$/;
    if (!phoneRegex.test(phone)) {
      showError('يرجى إدخال رقم هاتف عراقي صحيح');
      return;
    }

    if (password.length < 6) {
      showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsLoggingIn(true);
    
    try {
      const formattedPhone = formatPhoneNumber(phone);
      const fullPhone = `+964${formattedPhone}`;
      
      const { error } = await supabase.auth.signInWithPassword({
        phone: fullPhone,
        password
      });

      if (error) {
        throw error;
      }

      showSuccess('تم تسجيل الدخول بنجاح');
    } catch (error: any) {
      console.error('Login error:', error);
      showError(error.message || 'فشل تسجيل الدخول. تحقق من رقم الهاتف وكلمة المرور.');
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
                <div className="relative">
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full h-12 text-lg pr-10" 
                    placeholder="كلمة المرور" 
                    dir="ltr" 
                  />
                  <Lock className="absolute right-3 top-3.5 h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <Button onClick={handleLogin} disabled={isLoggingIn} className="w-full h-12 text-lg">
                {isLoggingIn ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                {isLoggingIn ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </Button>
            </div>
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