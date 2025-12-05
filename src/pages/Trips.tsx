import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Trips = () => {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('trips')}</h1>
      <Link to="/add-trip">
        <Button className="mb-6 bg-primary text-primary-foreground hover:bg-primary/90">{t('addTrip')}</Button>
      </Link>
      {/* Future: Display list of trips here */}
      <p className="text-gray-600 dark:text-gray-400">
        {/* Placeholder for trip listings */}
        {t('noTripsYet')}
      </p>
    </div>
  );
};

export default Trips;