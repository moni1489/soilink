import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Database, Smartphone, Globe, Save } from 'lucide-react';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', icon: User, label: 'Профиль' },
    { id: 'notifications', icon: Bell, label: 'Уведомления' },
    { id: 'security', icon: Shield, label: 'Безопасность' },
    { id: 'integrations', icon: Database, label: 'Интеграции' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7] overflow-y-auto">
      <div className="px-4 sm:px-8 py-5 sm:py-8 bg-white border-b border-black/5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1d1d1f]">Управление системой</h1>
        <p className="text-[12px] sm:text-[13px] text-[#6e6e73] font-medium mt-1">Настройки профиля, доступов и оборудования</p>
      </div>

      <div className="max-w-5xl mx-auto w-full p-4 sm:p-8 flex flex-col md:flex-row gap-4 md:gap-8">
        <div className="w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-[13px] sm:text-[14px] font-semibold whitespace-nowrap ${
                activeTab === t.id ? 'bg-[#0071e3] text-white shadow-md shadow-blue-500/20' : 'text-[#6e6e73] hover:bg-black/5'
              }`}
            >
              <t.icon className="w-4.5 h-4.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-black/5 shadow-sm p-5 sm:p-8">
            {activeTab === 'profile' && (
              <div className="space-y-6 sm:space-y-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 pb-6 sm:pb-8 border-b border-black/5 text-center sm:text-left">
                  <div className="relative">
                    <img src="https://i.pravatar.cc/150?u=agronomist" alt="Profile" className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-white shadow-md object-cover" onError={e => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Admin&background=0071e3&color=fff'; }} />
                    <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full border border-black/10 shadow-sm flex items-center justify-center hover:bg-black/5">📷</button>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#1d1d1f]">monya</h2>
                    <p className="text-[#6e6e73] text-[13px] font-medium">Администратор системы • SoiLink Усть-Каменогорск</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6e6e73] uppercase tracking-wider">Имя пользователя</label>
                    <input type="text" defaultValue="monya" className="w-full h-11 px-4 rounded-xl bg-[#f5f5f7] border-transparent font-bold text-[14px] focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6e6e73] uppercase tracking-wider">Роль</label>
                    <input type="text" defaultValue="Администратор" disabled className="w-full h-11 px-4 rounded-xl bg-[#f5f5f7] border-transparent font-bold text-[14px] text-[#86868b] cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6e6e73] uppercase tracking-wider">Email</label>
                    <input type="email" defaultValue="admin@soilink.kz" className="w-full h-11 px-4 rounded-xl bg-[#f5f5f7] border-transparent font-bold text-[14px] focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6e6e73] uppercase tracking-wider">Телефон</label>
                    <input type="tel" defaultValue="+7 (705) 123-45-67" className="w-full h-11 px-4 rounded-xl bg-[#f5f5f7] border-transparent font-bold text-[14px] focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                  </div>
                </div>

                <div className="pt-6 border-t border-black/5 flex justify-end">
                  <button className="flex items-center gap-2 px-6 py-3 bg-[#0071e3] text-white rounded-xl text-[14px] font-bold shadow-md shadow-blue-500/20 hover:bg-[#0077ed] transition-all">
                    <Save className="w-4 h-4" /> СОХРАНИТЬ ИЗМЕНЕНИЯ
                  </button>
                </div>
              </div>
            )}

            {activeTab !== 'profile' && (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-[#f5f5f7] rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#d2d2d7]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#1d1d1f]">Раздел доступен в PRO версии</h3>
                  <p className="text-[13px] text-[#6e6e73] max-w-sm mx-auto mt-2">Свяжитесь с вашим менеджером SoiLink для расширения функционала платформы.</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
