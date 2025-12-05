import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { MadeWithDyad } from '@/components/made-with-dyad';

function Login() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">{t('login')}</h1>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))', // Use the new primary color
                  brandAccent: 'hsl(var(--primary-foreground))', // Use the new primary-foreground color
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
      <MadeWithDyad />
    </div>
  );
}

export default Login;