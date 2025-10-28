import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enGB from './locales/en-GB.json';
import enUS from './locales/en-US.json';
import deDE from './locales/de-DE.json';
import frFR from './locales/fr-FR.json';
import esES from './locales/es-ES.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'en-GB': { translation: enGB },
      'en-US': { translation: enUS },
      'de-DE': { translation: deDE },
      'fr-FR': { translation: frFR },
      'es-ES': { translation: esES },
    },
    lng: localStorage.getItem('preferred-locale') || 'en-GB',
    fallbackLng: 'en-GB',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
