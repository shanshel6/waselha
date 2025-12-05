import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Index = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-gray-900 dark:text-white leading-tight">
          {t('welcome')}
        </h1>
        <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8">
          {t('startBuilding')}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/trips">
            <Button size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
              {t('addTrip')}
            </Button>
          </Link>
          <Link to="/search">
            <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10">
              {t('search')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;