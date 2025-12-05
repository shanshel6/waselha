import { useTranslation } from 'react-i18next';

const Verification = () => {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('verifyYourself')}</h1>
      <p className="text-gray-600 dark:text-gray-400">
        {/* Future: Verification form and upload fields will go here */}
        {t('verificationInstructions')}
      </p>
    </div>
  );
};

export default Verification;