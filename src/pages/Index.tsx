import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Plane, Package, DollarSign, Handshake } from 'lucide-react';
import PriceCalculator from '@/components/PriceCalculator';

const Index = () => {
  const { t } = useTranslation();

  const howItWorksSteps = [
    {
      icon: <Plane className="h-8 w-8 text-primary mb-2" />,
      title: t('step1Title'),
      description: t('step1Description'),
    },
    {
      icon: <Package className="h-8 w-8 text-primary mb-2" />,
      title: t('step2Title'),
      description: t('step2Description'),
    },
    {
      icon: <Handshake className="h-8 w-8 text-primary mb-2" />,
      title: t('step3Title'),
      description: t('step3Description'),
    },
    {
      icon: <DollarSign className="h-8 w-8 text-primary mb-2" />,
      title: t('step4Title'),
      description: t('step4Description'),
    },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center bg-gradient-to-br from-violet-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      {/* Hero Section */}
      <section className="text-center max-w-4xl py-16 md:py-24">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-gray-900 dark:text-white leading-tight">
          {t('welcome')}
        </h1>
        <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8">
          {t('startBuilding')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-lg flex flex-col items-center justify-center">
            <Plane className="h-12 w-12 text-primary mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('travelersEarnMoney')}</h2>
            <Link to="/add-trip" className="w-full">
              <Button size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {t('imATraveler')}
              </Button>
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-lg flex flex-col items-center justify-center">
            <Package className="h-12 w-12 text-accent-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('sendersCheaperShipping')}</h2>
            <Link to="/search" className="w-full">
              <Button size="lg" variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
                {t('iWantToSendPackage')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="w-full max-w-4xl py-16 md:py-24 bg-white dark:bg-gray-800 rounded-lg shadow-xl mb-12">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">{t('howItWorks')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-4">
          {howItWorksSteps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center p-4">
              {step.icon}
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{step.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Calculator Section */}
      <PriceCalculator />
    </div>
  );
};

export default Index;