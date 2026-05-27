import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Leaf, Map as MapIcon, Calendar, Cog, Bell, Search, Menu, Command } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV = [
  { to: '/', icon: MapIcon, label: 'Обзор поля' },
  { to: '/schedule', icon: Calendar, label: 'Календарь задач' },
  { to: '/settings', icon: Cog, label: 'Управление' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] font-sans">
      {/* Refined Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-white border-r border-black/5 z-50">
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
           <div className="flex items-center gap-3 p-2 hover:bg-black/5 rounded-xl transition-all cursor-pointer">
              <img
                src="https://i.pravatar.cc/150?u=agronomist"
                alt="Profile"
                className="w-8 h-8 rounded-full border border-black/10"
                onError={e => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Admin&background=0071e3&color=fff'; }}
              />
              <div className="flex flex-col min-w-0">
                <p className="text-[12px] font-semibold truncate">Алексей Н.</p>
                <p className="text-[10px] text-[#6e6e73]">Главный агроном</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-black/5 z-40">
          <div className="flex items-center gap-4">
             <h1 className="text-[15px] font-semibold">
                {pathname === '/' ? 'Мониторинг' : pathname === '/schedule' ? 'Операции' : 'Настройки'}
             </h1>
             <div className="w-px h-4 bg-black/10" />
             <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                <span className="text-[10px] font-medium text-[#6e6e73] uppercase tracking-wider">Система активна</span>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-[#f5f5f7] rounded-lg border border-black/5 w-64 transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
              <Search className="w-3.5 h-3.5 text-[#6e6e73]" />
              <input type="text" placeholder="Поиск..." className="bg-transparent border-none outline-none text-[12px] flex-1 text-[#1d1d1f] placeholder-[#86868b]" />
              <div className="flex items-center gap-1 px-1 py-0.5 bg-white border border-black/10 rounded text-[9px] font-bold text-[#86868b]">
                 <Command className="w-2 h-2" /> K
              </div>
            </div>
            <button className="p-2 hover:bg-black/5 rounded-lg text-[#6e6e73] transition-all relative">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
