import { useTranslation } from 'react-i18next';

const Index = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">{t('welcome')}</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          {t('startBuilding')}
        </p>
      </div>
    </div>
  );
};

export default Index;