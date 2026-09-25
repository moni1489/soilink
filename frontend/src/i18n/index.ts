import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { ru as dfRu, kk as dfKk, enUS as dfEn } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import ru from './locales/ru.json';
import kk from './locales/kk.json';
import en from './locales/en.json';

export const LANGUAGES = ['ru', 'kk', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

const STORAGE_KEY = 'soilink.lang';

const isLanguage = (v: string | null | undefined): v is Language =>
  !!v && (LANGUAGES as readonly string[]).includes(v);

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch { /* приватный режим */ }
  const tag = navigator.language?.slice(0, 2).toLowerCase();
  return isLanguage(tag) ? tag : 'ru';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      kk: { translation: kk },
      en: { translation: en },
    },
    lng: initialLanguage(),
    fallbackLng: 'ru',
    supportedLngs: [...LANGUAGES],
    interpolation: { escapeValue: false },
  });

i18n.on('languageChanged', lng => {
  document.documentElement.lang = lng;
});
document.documentElement.lang = i18n.language;

/** Смена языка с запоминанием выбора между сессиями. */
export function setLanguage(lng: Language) {
  void i18n.changeLanguage(lng);
  try { localStorage.setItem(STORAGE_KEY, lng); } catch { /* приватный режим */ }
}

const DATE_LOCALES: Record<Language, Locale> = { ru: dfRu, kk: dfKk, en: dfEn };

/** Локаль date-fns под текущий язык — для format() внутри компонентов. */
export function useDateLocale(): Locale {
  const { i18n: inst } = useTranslation();
  return DATE_LOCALES[inst.language as Language] ?? dfRu;
}

export default i18n;
