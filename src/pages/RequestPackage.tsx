import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

const RequestPackage = () => {
  const { t } = useTranslation();
  const { tripId } = useParams();

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('requestToSend')}</h1>
      <p className="text-gray-600 dark:text-gray-400">
        {/* Future: Package request form will go here */}
        Requesting to send a package for Trip ID: {tripId}
      </p>
    </div>
  );
};

export default RequestPackage;