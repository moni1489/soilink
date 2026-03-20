import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export function useLocale() {
  const { i18n } = useTranslation();

  const locale = useMemo(() => {
    const normalized = i18n.resolvedLanguage ?? i18n.language ?? 'en';
    return normalized.split('-')[0];
  }, [i18n.language, i18n.resolvedLanguage]);

  const setLanguage = async (next: string) => {
    await i18n.changeLanguage(next);
  };

  return { locale, setLanguage };
}
