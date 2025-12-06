"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function Login() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">{t('login')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            providers={['google', 'facebook']}
            view="sign_in"
            showLinks={false}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    // Primary Auth Button (Email/Password Login)
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary-foreground))',
                    defaultButtonBackground: 'hsl(var(--primary))',
                    defaultButtonBackgroundHover: 'hsl(var(--primary)/0.9)',
                    
                    // Inputs
                    inputBackground: 'hsl(var(--background))',
                    inputBorder: 'hsl(var(--border))',
                    inputBorderHover: 'hsl(var(--ring))',
                    inputBorderFocus: 'hsl(var(--ring))',
                    inputText: 'hsl(var(--foreground))',

                    // Social Buttons Customization
                    socialButtonBackground: 'hsl(var(--primary))',
                    socialButtonText: 'hsl(0 0% 100%)', // Explicitly set to white
                    socialButtonBorder: 'hsl(var(--primary))',
                    socialButtonBackgroundHover: 'hsl(var(--primary)/0.9)',
                    socialButtonTextHover: 'hsl(0 0% 100%)',
                    socialButtonIcon: 'hsl(0 0% 100%)', // Explicitly set to white
                  },
                },
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
          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
            {t('noAccount')} <Link to="/signup" className="font-medium text-primary hover:underline">{t('signUp')}</Link>
          </p>
        </CardContent>
      </Card>
      <div className="relative z-10 mt-4">
        <MadeWithDyad />
      </div>
    </div>
  );
}

export default Login;