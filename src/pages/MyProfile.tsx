import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const MyProfile = () => {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('myProfile')}</h1>
      <p className="mb-4 text-gray-600 dark:text-gray-400">
        {/* Future: User profile details will go here */}
        {t('profileDetailsPlaceholder')}
      </p>
      <Link to="/verify">
        <Button>{t('verifyYourself')}</Button>
      </Link>
    </div>
  );
};

export default MyProfile;