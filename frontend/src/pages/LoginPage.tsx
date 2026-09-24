import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Lock, User as UserIcon, LogIn, AlertCircle, Eye, EyeOff, ShieldCheck, Sprout, Tractor, Briefcase } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { accounts, DEMO_PASSWORD, initials } from '@/auth/accounts';
import { ACCESS_LEVELS, ROLES, canViewDashboard, type AccessLevel } from '@/auth/roles';

const LEVEL_ORDER: AccessLevel[] = ['full', 'specialist', 'field', 'contractor'];

const LEVEL_STYLE: Record<AccessLevel, { icon: typeof ShieldCheck; tint: string }> = {
  full:       { icon: ShieldCheck, tint: 'bg-blue-50 text-[#0071e3]' },
  specialist: { icon: Sprout,      tint: 'bg-green-50 text-green-600' },
  field:      { icon: Briefcase,   tint: 'bg-amber-50 text-amber-600' },
  contractor: { icon: Tractor,     tint: 'bg-purple-50 text-purple-600' },
};

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const from = (location.state as { from?: string } | null)?.from;

  if (user) return <Navigate to={canViewDashboard(user) ? (from ?? '/') : '/schedule'} replace />;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!login(loginName, password)) {
      setError('Неверный логин или пароль');
      return;
    }
    navigate(from ?? '/', { replace: true });
  };

  const pickAccount = (accountLogin: string) => {
    setLoginName(accountLogin);
    setPassword(DEMO_PASSWORD);
    setError('');
  };

  return (
    <div className="min-h-screen w-full flex bg-[#f5f5f7] text-[#1d1d1f] font-sans">
      {/* Brand panel — desktop only */}
      <aside className="hidden lg:flex w-[420px] flex-shrink-0 flex-col justify-between p-12 bg-[#1d1d1f] text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0071e3] rounded-xl flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">SoiLink</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight leading-tight">Управление агрокомплексом на данных почвы</h2>
          <p className="text-[14px] text-white/60 mt-4 leading-relaxed">
            Мониторинг полей, планирование полива, удобрений и защиты растений — с доступом по ролям для каждой команды.
          </p>
        </div>
        <p className="text-[11px] text-white/40 uppercase tracking-wider font-bold">Усть-Каменогорск · ВКО</p>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-14 flex flex-col gap-8">
          <div className="flex lg:hidden items-center gap-3">
            <div className="w-8 h-8 bg-[#0071e3] rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">SoiLink</span>
          </div>

          <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 sm:p-10 max-w-md w-full"
          >
            <h1 className="text-2xl font-bold tracking-tight">Вход в систему</h1>
            <p className="text-[13px] text-[#6e6e73] font-medium mt-1 mb-8">Войдите под своей учётной записью</p>

            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-[11px] font-bold text-[#6e6e73] uppercase tracking-wider">Логин</span>
                <div className="flex items-center gap-3 h-11 px-4 rounded-xl bg-[#f5f5f7] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 border border-transparent focus-within:border-blue-500 transition-all">
                  <UserIcon className="w-4 h-4 text-[#86868b]" />
                  <input value={loginName} onChange={e => { setLoginName(e.target.value); setError(''); }}
                    autoComplete="username" autoFocus placeholder="например, director"
                    className="flex-1 bg-transparent outline-none text-[14px] font-semibold placeholder-[#86868b] placeholder:font-medium"
                  />
                </div>
              </label>
              <label className="block space-y-2">
                <span className="text-[11px] font-bold text-[#6e6e73] uppercase tracking-wider">Пароль</span>
                <div className="flex items-center gap-3 h-11 px-4 rounded-xl bg-[#f5f5f7] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 border border-transparent focus-within:border-blue-500 transition-all">
                  <Lock className="w-4 h-4 text-[#86868b]" />
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    autoComplete="current-password"
                    className="flex-1 bg-transparent outline-none text-[14px] font-semibold"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="text-[#86868b] hover:text-[#1d1d1f]"
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 text-red-600 text-[12px] font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <button type="submit" disabled={!loginName || !password}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#0071e3] text-white rounded-xl text-[14px] font-bold shadow-md shadow-blue-500/20 hover:bg-[#0077ed] disabled:opacity-40 disabled:shadow-none transition-all"
              >
                <LogIn className="w-4 h-4" /> ВОЙТИ
              </button>
            </div>
          </motion.form>

          {/* Demo accounts grouped by access level */}
          <section>
            <div className="flex items-baseline justify-between gap-4 mb-4 px-1">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.15em] text-[#6e6e73]">Демо-аккаунты</h2>
              <span className="text-[11px] text-[#86868b] font-medium">пароль для всех: <span className="font-data font-bold text-[#1d1d1f]">{DEMO_PASSWORD}</span></span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {LEVEL_ORDER.map(level => {
                const { icon: Icon, tint } = LEVEL_STYLE[level];
                const levelAccounts = accounts.filter(a => ROLES[a.role].level === level);
                return (
                  <div key={level} className={`bg-white rounded-2xl border border-black/5 p-4 ${level === 'specialist' ? 'sm:row-span-2' : ''}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tint}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold">{ACCESS_LEVELS[level].label}</p>
                        <p className="text-[11px] text-[#6e6e73] leading-snug">{ACCESS_LEVELS[level].description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {levelAccounts.map(a => (
                        <button key={a.id} type="button" onClick={() => pickAccount(a.login)}
                          className={`flex items-center gap-3 p-2 rounded-xl text-left transition-all ${loginName === a.login ? 'bg-blue-50 ring-1 ring-blue-500/30' : 'hover:bg-[#f5f5f7]'}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${tint}`}>
                            {initials(a.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold truncate">{a.name}</p>
                            <p className="text-[10px] text-[#6e6e73] truncate">{a.company ?? ROLES[a.role].label}</p>
                          </div>
                          <span className="text-[10px] font-data font-bold text-[#86868b]">{a.login}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
