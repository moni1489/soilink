import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Leaf } from 'lucide-react';
import { LanguageMenu } from '@/components/LanguageSwitcher';
import { apiUrl } from './session';

/**
 * Настоящий вход: логин и пароль проверяет сервер, сессия — HttpOnly-cookie.
 * Пока входа нет, приложение (и демо-аккаунты внутри него) не показывается, а API отвечает 401.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'in' | 'out'>('checking');

  useEffect(() => {
    fetch(`${apiUrl()}/api/auth/me`, { credentials: 'include' })
      .then(r => setState(r.ok ? 'in' : 'out'))
      .catch(() => setState('out'));
  }, []);

  if (state === 'checking') return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
      <div className="w-6 h-6 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (state === 'out') return <AccessLoginPage onSuccess={() => setState('in')} />;
  return <>{children}</>;
}

function AccessLoginPage({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await fetch(`${apiUrl()}/api/auth/login`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      if (res.ok) return onSuccess();
      setError(t(res.status === 429 ? 'gate.locked' : res.status === 401 ? 'gate.error' : 'gate.serverError'));
    } catch {
      setError(t('gate.serverError'));
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full h-11 px-3.5 bg-[#f5f5f7] border border-black/5 rounded-xl text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3]/40';

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] text-[#1d1d1f]">
      {/* Самое начало страницы — ссылка на сайт для тех, кто ещё не клиент */}
      <a href="https://soilink.land" target="_blank" rel="noopener noreferrer"
        className="block bg-[#1d1d1f] text-white text-center text-[13px] px-4 py-2.5 hover:bg-black"
      >
        {t('gate.promo')} <span className="font-semibold underline underline-offset-2">{t('gate.promoLink')}</span>
      </a>

      <div className="flex justify-end px-4 sm:px-8 pt-4"><LanguageMenu /></div>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="flex items-center gap-3 justify-center">
            <div className="w-10 h-10 bg-[#0071e3] rounded-xl flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight">SoiLink</span>
          </div>

          <form onSubmit={submit} className="bg-white rounded-2xl border border-black/5 shadow-pro p-6 flex flex-col gap-4">
            <div>
              <h1 className="text-[18px] font-semibold">{t('gate.title')}</h1>
              <p className="text-[12px] text-[#6e6e73] mt-1">{t('gate.subtitle')}</p>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-[#6e6e73]">{t('gate.login')}</span>
              <input value={login} onChange={e => setLogin(e.target.value)} className={input}
                autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-[#6e6e73]">{t('gate.password')}</span>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className={`${input} pr-20`} autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[11px] font-semibold text-[#6e6e73] hover:bg-black/5"
                >{showPassword ? t('login.hide') : t('login.show')}</button>
              </div>
            </label>
            {error && <p role="alert" className="text-[12px] font-semibold text-red-600">{error}</p>}
            <button disabled={busy || !login || !password}
              className="h-11 rounded-xl bg-[#0071e3] text-white text-[14px] font-semibold hover:bg-[#0077ed] disabled:opacity-50"
            >{busy ? t('gate.checking') : t('gate.submit')}</button>
          </form>

          <p className="text-center text-[12px] text-[#6e6e73]">
            {t('gate.noAccount')}{' '}
            <a href="https://soilink.land" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0071e3]">soilink.land</a>
          </p>
        </div>
      </main>
    </div>
  );
}
