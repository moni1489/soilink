import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react';
import { LANGUAGES, setLanguage, type Language } from '@/i18n';

const SHORT: Record<Language, string> = { ru: 'РУС', kk: 'ҚАЗ', en: 'ENG' };

/** Текущий язык из i18n — терпим к тегам вида ru-RU. */
function useCurrentLanguage(): Language {
  const { i18n } = useTranslation();
  return LANGUAGES.find(l => i18n.language?.startsWith(l)) ?? 'ru';
}

/** Три кнопки в один ряд — для боковой панели, выбор всегда на виду. */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const current = useCurrentLanguage();

  return (
    <div className="px-2 pb-1">
      <div className="flex items-center gap-1.5 px-2 pb-1.5">
        <Languages className="w-3 h-3 text-[#86868b]" />
        <span className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider">{t('lang.label')}</span>
      </div>
      <div className="flex items-stretch gap-1 p-1 bg-[#f5f5f7] rounded-xl">
        {LANGUAGES.map(lng => (
          <button key={lng} onClick={() => setLanguage(lng)}
            aria-pressed={current === lng} title={t(`lang.${lng}`)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
              current === lng
                ? 'bg-white text-[#0071e3] shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            {SHORT[lng]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Выпадающий список с полными названиями — для страницы входа и мобильной шапки. */
export function LanguageMenu({ align = 'right' }: { align?: 'left' | 'right' }) {
  const { t } = useTranslation();
  const current = useCurrentLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} title={t('lang.label')} aria-label={t('lang.label')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/5 transition-all"
      >
        <Languages className="w-4 h-4" />
        <span>{SHORT[current]}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute top-full mt-2 w-44 bg-white border border-black/5 rounded-xl shadow-2xl z-50 p-1.5 ${align === 'right' ? 'right-0' : 'left-0'}`}>
            {LANGUAGES.map(lng => (
              <button key={lng} onClick={() => { setLanguage(lng); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[12px] hover:bg-black/5 transition-all ${
                  current === lng ? 'font-bold text-[#0071e3]' : 'text-[#1d1d1f]'
                }`}
              >
                <span>{t(`lang.${lng}`)}</span>
                {current === lng && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
