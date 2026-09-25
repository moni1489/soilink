import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Leaf, Map as MapIcon, Calendar, Cog, Bell, Search, Command, LogOut } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAuth, useUser } from '@/auth/useAuth';
import { initials } from '@/auth/accounts';
import { ROLES, canViewDashboard } from '@/auth/roles';
import { LanguageSwitcher, LanguageMenu } from '@/components/LanguageSwitcher';

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const user = useUser();
  const [showNotifications, setShowNotifications] = useState(false);
  const isMobile = useIsMobile();

  const isContractor = ROLES[user.role].level === 'contractor';
  const userName = t(user.nameKey);
  const NAV = [
    ...(canViewDashboard(user) ? [{ to: '/', icon: MapIcon, label: t('nav.overview') }] : []),
    { to: '/schedule', icon: Calendar, label: isContractor ? t('nav.myTasks') : t('nav.taskCalendar') },
    { to: '/settings', icon: Cog, label: isContractor ? t('nav.profile') : t('nav.management') },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] font-sans">
      {/* Refined Sidebar — desktop only, replaced by bottom tab bar on mobile */}
      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col bg-white border-r border-black/5 z-50">
        <div className="h-16 flex items-center px-6 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0071e3] rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">SoiLink</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 flex flex-col gap-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-[#0071e3] text-white shadow-md shadow-blue-500/20'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/5'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-black/5">
           <LanguageSwitcher />
           <div className="flex items-center gap-3 p-2 mt-2 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-[#0071e3] text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                {initials(userName)}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-[12px] font-semibold truncate">{userName}</p>
                <p className="text-[10px] text-[#6e6e73] truncate">{user.companyKey ? t(user.companyKey) : t(ROLES[user.role].labelKey)}</p>
              </div>
              <button onClick={handleLogout} title={t('common.logout')} aria-label={t('common.logout')}
                className="p-1.5 rounded-lg text-[#86868b] hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-14 md:h-16 flex-shrink-0 flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-md border-b border-black/5 z-40">
          <div className="flex items-center gap-4 min-w-0">
             {isMobile && (
               <div className="w-7 h-7 bg-[#0071e3] rounded-lg flex items-center justify-center flex-shrink-0">
                 <Leaf className="w-4 h-4 text-white" />
               </div>
             )}
             <h1 className="text-[14px] md:text-[15px] font-semibold truncate">
                {pathname === '/' ? t('header.monitoring') : pathname === '/schedule' ? (isContractor ? t('nav.myTasks') : t('header.operations')) : t('header.settings')}
             </h1>
             <div className="hidden sm:block w-px h-4 bg-black/10" />
             <div className="hidden sm:flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                <span className="text-[10px] font-medium text-[#6e6e73] uppercase tracking-wider">{t('header.systemActive')}</span>
             </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-[#f5f5f7] rounded-lg border border-black/5 w-64 transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
              <Search className="w-3.5 h-3.5 text-[#6e6e73]" />
              <input type="text" placeholder={t('header.searchPlaceholder')} className="bg-transparent border-none outline-none text-[12px] flex-1 text-[#1d1d1f] placeholder-[#86868b]" />
              <div className="flex items-center gap-1 px-1 py-0.5 bg-white border border-black/10 rounded text-[9px] font-bold text-[#86868b]">
                 <Command className="w-2 h-2" /> K
              </div>
            </div>
            <div className="relative">
              <button onClick={() => setShowNotifications(v => !v)} className="p-2 hover:bg-black/5 rounded-lg text-[#6e6e73] transition-all relative">
                <Bell className="w-4.5 h-4.5" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
              </button>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 bg-white border border-black/5 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-4 border-b border-black/5 flex items-center justify-between bg-[#fbfbfd]">
                      <h3 className="text-[13px] font-bold">{t('header.notifications')}</h3>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{t('header.oneNew')}</span>
                    </div>
                    <div className="p-2 max-h-64 overflow-y-auto">
                      <div className="p-3 hover:bg-[#f5f5f7] rounded-xl cursor-pointer transition-all flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[12px] font-bold text-[#1d1d1f] leading-tight mb-1">{t('header.alertTitle')}</p>
                          <p className="text-[11px] text-[#6e6e73] leading-relaxed">{t('header.alertBody')}</p>
                          <p className="text-[9px] font-bold text-[#86868b] mt-2 uppercase">{t('header.hourAgo')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border-t border-black/5 text-center">
                      <button className="text-[11px] font-bold text-blue-600 hover:text-blue-700">{t('header.markAllRead')}</button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* На мобильном боковой панели нет — переключатель языка живёт в шапке */}
            {isMobile && <LanguageMenu />}
            {isMobile && (
              <button onClick={handleLogout} aria-label={t('common.logout')} className="p-2 hover:bg-red-50 rounded-lg text-[#6e6e73] hover:text-red-500 transition-all">
                <LogOut className="w-4.5 h-4.5" />
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden pb-16 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom tab bar — replaces the sidebar as primary navigation */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-white/95 backdrop-blur-md border-t border-black/5 flex items-stretch z-50">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-all ${
                  isActive ? 'text-[#0071e3]' : 'text-[#86868b]'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="truncate max-w-[80px]">{label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
