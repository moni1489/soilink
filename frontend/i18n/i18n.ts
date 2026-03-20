import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './locales/en.json';
import ru from './locales/ru.json';
import kk from './locales/kk.json';

const deviceLocale = getLocales()[0]?.languageCode ?? 'en';
const supportedLocale = ['en', 'ru', 'kk'].includes(deviceLocale) ? deviceLocale : 'en';

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    kk: { translation: kk }
  },
  lng: supportedLocale,
  fallbackLng: 'en',
  defaultNS: 'translation',
  interpolation: { escapeValue: false }
});

export default i18n;
