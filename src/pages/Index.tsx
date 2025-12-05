import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Plane, Package, DollarSign, Handshake } from 'lucide-react';
import PriceCalculator from '@/components/PriceCalculator';
import { Card } from '@/components/ui/card';

const Index = () => {
  const { t } = useTranslation();

  const howItWorksSteps = [
    {
      icon: <Plane className="h-10 w-10 text-primary" />,
      title: t('step1Title'),
      description: t('step1Description'),
    },
    {
      icon: <Package className="h-10 w-10 text-primary" />,
      title: t('step2Title'),
      description: t('step2Description'),
    },
    {
      icon: <Handshake className="h-10 w-10 text-primary" />,
      title: t('step3Title'),
      description: t('step3Description'),
    },
    {
      icon: <DollarSign className="h-10 w-10 text-primary" />,
      title: t('step4Title'),
      description: t('step4Description'),
    },
  ];

  return (
    <div className="flex flex-col items-center bg-background">
      {/* Hero Section */}
      <section className="relative w-full h-[60vh] md:h-[70vh] flex items-center justify-center text-center text-white">
        <div className="absolute inset-0 bg-black/50 z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1569154941061-e231b4725ef1?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
          alt="Modern airport terminal" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 max-w-4xl p-4">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>
            {t('welcome')}
          </h1>
          <p className="text-lg md:text-xl text-neutral-200 mb-8" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>
            {t('startBuilding')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <Link to="/add-trip">
              <Button size="lg" className="w-full text-lg py-6">
                <Plane className="mr-2 h-5 w-5" /> {t('imATraveler')}
              </Button>
            </Link>
            <Link to="/trips">
              <Button size="lg" variant="secondary" className="w-full text-lg py-6">
                <Package className="mr-2 h-5 w-5" /> {t('iWantToSendPackage')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="w-full max-w-5xl py-16 md:py-24 px-4">
        <h2 className="text-4xl font-bold text-center mb-12">{t('howItWorks')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {howItWorksSteps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center p-4">
              <div className="bg-primary/10 rounded-full p-4 mb-4">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Calculator Section */}
      <div className="w-full bg-muted/50 py-16 md:py-24">
        <PriceCalculator />
      </div>
    </div>
  );
};

export default Index;