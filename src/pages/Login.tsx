import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { MadeWithDyad } from '@/components/made-with-dyad';

function Login() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">{t('login')}</h1>
        <Auth
          supabaseClient={supabase}
          providers={[]} // Only email/password for now, as per instructions
        />
      </div>
      <MadeWithDyad />
    </div>
  );
}

export default Login;