import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import your translation files
import translationArIQ from '../locales/ar-IQ/translation.json';

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      'ar-IQ': {
        translation: translationArIQ,
      },
    },
    lng: 'ar-IQ', // default language
    fallbackLng: 'ar-IQ', // fallback language if translation is missing
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;