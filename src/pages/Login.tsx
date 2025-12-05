"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { MadeWithDyad } from '@/components/made-with-dyad';

function Login() {
  const { t } = useTranslation();

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center"
      style={{ backgroundImage: `url('https://images.unsplash.com/photo-1520250400481-be63a6124444?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')` }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black opacity-60"></div> 

      <div className="relative z-10 w-full max-w-md bg-white/80 dark:bg-gray-800/80 p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">{t('login')}</h1>
        <Auth
          supabaseClient={supabase}
          providers={['google']}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary-foreground))',
                  defaultButtonBackground: 'hsl(var(--primary))',
                  defaultButtonBackgroundHover: 'hsl(var(--primary)/0.9)',
                  inputBackground: 'hsl(var(--background))',
                  inputBorder: 'hsl(var(--border))',
                  inputBorderHover: 'hsl(var(--ring))',
                  inputBorderFocus: 'hsl(var(--ring))',
                  inputText: 'hsl(var(--foreground))',
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
                social_provider_text: 'Sign in with {{provider}}',
                link_text: t('haveAccount'),
                forgotten_password: t('forgotPassword'),
              },
              sign_up: {
                email_label: t('email'),
                password_label: t('password'),
                email_input_placeholder: t('email'),
                password_input_placeholder: t('password'),
                button_label: t('signUp'),
                social_provider_text: 'Sign up with {{provider}}',
                link_text: t('noAccount'),
              },
              forgotten_password: {
                email_label: t('email'),
                password_input_placeholder: t('password'),
                button_label: t('forgotPassword'),
                link_text: t('forgotPassword'),
              },
              update_password: {
                password_label: t('password'),
                password_input_placeholder: t('password'),
                button_label: 'Update password',
              },
            },
          }}
        />
      </div>
      <div className="relative z-10">
        <MadeWithDyad />
      </div>
    </div>
  );
}

export default Login;