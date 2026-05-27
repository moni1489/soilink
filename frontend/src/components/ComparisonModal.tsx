import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart3, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import type { Sensor, SoilDepth } from '@/types';
import { mockScannerData } from '@/data/mockData';

interface ComparisonModalProps {
  isOpen: boolean;
  sensor: Sensor | null;
  depth: SoilDepth;
  onClose: () => void;
}

const LABELS: { key: string; label: string }[] = [
  { key: 'phh2o', label: 'Уровень pH' },
  { key: 'nitrogen', label: 'Азот (N)' },
  { key: 'soc', label: 'Углерод (SOC)' },
  { key: 'clay_content', label: 'Глина' },
  { key: 'sand_content', label: 'Песок' },
  { key: 'bdod', label: 'Плотность' },
];

const ttStyle = { 
  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
  backdropFilter: 'blur(20px)',
  border: 'none', 
  borderRadius: '20px', 
  fontSize: 12,
  boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
};

function getSensorValue(sensor: Sensor, key: string): number {
  const map: Record<string, number> = {
    phh2o: Math.round(sensor.pH * 10),
    nitrogen: sensor.nitrogen,
    soc: Math.round(sensor.soc * 10),
    clay_content: 210, sand_content: 440, silt_content: 350, bdod: 135,
  };
  return map[key] ?? 0;
}

export function ComparisonModal({ isOpen, sensor, depth, onClose }: ComparisonModalProps) {
  const global = mockScannerData[depth];

  const barData = LABELS.map(({ key, label }) => ({
    name: label,
    global: (global as Record<string, number>)[key],
    sensor: sensor ? getSensorValue(sensor, key) : 0,
  }));

  const radarData = LABELS.map(({ key, label }) => ({
    subject: label,
    'SoilGrids': (global as Record<string, number>)[key],
    'Данные узла': sensor ? getSensorValue(sensor, key) : 0,
  }));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/25 backdrop-blur-xl z-[100] flex items-center justify-center p-12"
          onClick={onClose}
        >
          <motion.div initial={{ y: 100, scale: 0.9, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 100, scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            onClick={e => e.stopPropagation()}
            className="bg-white/95 backdrop-blur-3xl border border-white rounded-[50px] shadow-[0_60px_120px_rgba(0,0,0,0.25)] w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-8 p-12 border-b border-[#d2d2d7]/20">
              <div className="w-16 h-16 bg-[#f5f5f7] rounded-[22px] flex items-center justify-center shadow-sm">
                 <BarChart3 className="w-8 h-8 text-[#0071e3]" />
              </div>
              <div className="flex-1">
                <h2 className="text-4xl font-black tracking-tightest text-[#1d1d1f]">Геопространственное сравнение</h2>
                <p className="text-[#86868b] font-bold mt-2 text-lg leading-none">
                  <span className="text-[#0071e3]">{sensor?.name}</span> vs Эталон SoilGrids · Горизонт: <span className="text-[#1d1d1f]">{depth}</span>
                </p>
              </div>
              <button onClick={onClose} className="p-4 bg-[#f5f5f7] rounded-full hover:bg-[#e5e5ea] transition-all active:scale-90">
                <X className="w-8 h-8 text-[#1d1d1f]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 flex flex-col gap-12 scrollbar-hide">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Bar Chart Card */}
                <div className="bg-white rounded-[40px] p-10 border border-[#d2d2d7]/20 shadow-sm">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-[12px] font-black text-[#86868b] uppercase tracking-[0.3em]">Корреляция метрик</h3>
                    <div className="flex gap-6">
                      {[{ color: '#d2d2d7', label: 'SoilGrids' }, { color: '#0071e3', label: 'Датчик' }].map(l => (
                        <div key={l.label} className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest text-[#86868b]">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />{l.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ left: -15, right: 5 }}>
                        <CartesianGrid strokeDasharray="12 12" stroke="#f5f5f7" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#86868b', fontWeight: 800 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#86868b', fontWeight: 800 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={ttStyle} cursor={{ fill: '#f5f5f7', radius: 10 }} />
                        <Bar dataKey="global" fill="#d2d2d7" name="SoilGrids" radius={[8, 8, 0, 0]} barSize={28} />
                        <Bar dataKey="sensor" fill="#0071e3" name="Датчик" radius={[8, 8, 0, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Radar Chart Card */}
                <div className="bg-white rounded-[40px] p-10 border border-[#d2d2d7]/20 shadow-sm">
                   <h3 className="text-[12px] font-black text-[#86868b] uppercase tracking-[0.3em] mb-10">Химический баланс</h3>
                   <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#f5f5f7" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#86868b', fontWeight: 800 }} />
                        <Radar name="SoilGrids" dataKey="SoilGrids" stroke="#d2d2d7" fill="#d2d2d7" fillOpacity={0.1} strokeWidth={2} />
                        <Radar name="Данные узла" dataKey="Данные узла" stroke="#0071e3" fill="#0071e3" fillOpacity={0.15} strokeWidth={4} />
                        <Tooltip contentStyle={ttStyle} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* High-End Table */}
              <div className="bg-white rounded-[40px] border border-[#d2d2d7]/20 overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f5f5f7]">
                      <th className="px-10 py-6 text-left text-[12px] font-black text-[#86868b] uppercase tracking-[0.2em]">Свойство почвы</th>
                      <th className="px-10 py-6 text-right text-[12px] font-black text-[#86868b] uppercase tracking-[0.2em]">SoilGrids</th>
                      <th className="px-10 py-6 text-right text-[12px] font-black text-[#86868b] uppercase tracking-[0.2em]">Live Узел</th>
                      <th className="px-10 py-6 text-right text-[12px] font-black text-[#86868b] uppercase tracking-[0.2em]">Дельта (Δ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5f5f7]">
                    {LABELS.map(({ key, label }) => {
                      const gv = (global as Record<string, number>)[key] ?? 0;
                      const sv = sensor ? getSensorValue(sensor, key) : 0;
                      const diff = sv - gv;
                      return (
                        <tr key={key} className="hover:bg-[#f5f5f7]/50 transition-all">
                          <td className="px-10 py-6 text-[15px] font-black text-[#1d1d1f] tracking-tight">{label}</td>
                          <td className="px-10 py-6 text-right text-[15px] font-bold text-[#86868b] font-mono-data">{gv}</td>
                          <td className="px-10 py-6 text-right text-[16px] font-black text-[#1d1d1f] font-mono-data">{sv}</td>
                          <td className={`px-10 py-6 text-right text-[16px] font-black font-mono-data ${diff > 0 ? 'text-[#34c759]' : diff < 0 ? 'text-[#ff3b30]' : 'text-[#86868b]'}`}>
                            {diff > 0 ? '+' : ''}{diff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-8 bg-[#f0f5ff] rounded-[32px] flex items-center gap-6 border border-[#adc6ff]/30">
                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <Info className="w-6 h-6 text-[#0071e3]" />
                 </div>
                 <p className="text-[14px] font-bold text-[#1d1d1f] leading-relaxed max-w-4xl">
                   Данные с датчиков калибруются каждые 6 часов на основе локальных проб почвы для обеспечения максимальной точности. 
                   Значительные отклонения (Δ) могут указывать на локальное переувлажнение или специфическое минеральное обогащение участка.
                 </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
