import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/integrations/supabase/SessionContextProvider';

const MyRequests = () => {
  const { t } = useTranslation();
  const { user } = useSession();

  // In a real application, this page would fetch requests where user.id is sender_id or trip.user_id

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('myRequests')}</h1>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{t('pendingRequests')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            {t('requestsPlaceholder')}
          </p>
          {/* Future implementation: List of requests */}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyRequests;