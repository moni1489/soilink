import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Layers, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { SoilDepth } from '@/types';
import { mockScannerData } from '@/data/mockData';

interface DepthProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEPTH_KEYS: { key: SoilDepth; range: string }[] = [
  { key: '0-5cm', range: '0-5' },
  { key: '5-15cm', range: '5-15' },
  { key: '15-30cm', range: '15-30' },
  { key: '30-60cm', range: '30-60' },
  { key: '60-100cm', range: '60-100' },
];

const PROP_KEYS = [
  { key: 'phh2o', color: '#af52de' },
  { key: 'nitrogen', color: '#0071e3' },
  { key: 'soc', color: '#34c759' },
  { key: 'clay_content', color: '#ff9500' },
  { key: 'sand_content', color: '#f97316' },
  { key: 'bdod', color: '#ff3b30' },
];

const ttStyle = { 
  backgroundColor: '#fff', 
  border: '1px solid rgba(0,0,0,0.1)', 
  borderRadius: '8px', 
  fontSize: '11px',
  fontWeight: 'bold',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
};

export function DepthProfileModal({ isOpen, onClose }: DepthProfileModalProps) {
  const { t } = useTranslation();
  const DEPTHS = DEPTH_KEYS.map(({ key, range }) => ({ key, label: t('depth.cm', { range }) }));
  const PROPS = PROP_KEYS.map(({ key, color }) => ({ key, color, label: t(`depth.props.${key}`) }));
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-[16px] sm:rounded-[24px] w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-black/5"
          >
            {/* Minimalist Header */}
            <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-black/5 flex items-center justify-between flex-shrink-0 bg-[#fbfbfd]">
              <div className="flex items-center gap-3 min-w-0">
                <Layers className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <h2 className="text-[13px] sm:text-[15px] font-bold tracking-tight text-[#1d1d1f] truncate">{t('depth.title')}</h2>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-black/5 rounded-lg transition-all text-[#86868b] flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col gap-6 sm:gap-10 scrollbar-hide">
              {/* Precision Table - Fixed Layout */}
              <div className="flex-shrink-0 border border-black/5 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full min-w-[700px] table-fixed border-collapse bg-white">
                  <thead>
                    <tr className="bg-[#f5f5f7] border-b border-black/5">
                      <th className="w-32 px-6 py-4 text-[10px] font-bold text-[#6e6e73] uppercase tracking-wider text-left">{t('depth.horizonCol')}</th>
                      {PROPS.map(p => (
                        <th key={p.key} className="px-4 py-4 text-[10px] font-bold text-[#6e6e73] uppercase tracking-wider text-center">{p.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {DEPTHS.map(({ key, label }) => {
                      const d = mockScannerData[key] as Record<string, number>;
                      return (
                        <tr key={key} className="hover:bg-black/[0.01] transition-colors">
                          <td className="px-6 py-4 text-[13px] font-bold font-data text-[#1d1d1f] bg-[#fbfbfd] border-r border-black/5">{label}</td>
                          {PROPS.map(p => (
                            <td key={p.key} className="px-4 py-4 text-center">
                              <span className="inline-block text-[14px] font-bold font-data" style={{ color: p.color }}>
                                {d[p.key]}
                              </span>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Visualization Grid - Clean & Balanced */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PROPS.map(p => {
                  const data = DEPTHS.map(({ key, label }) => ({
                    label,
                    value: (mockScannerData[key] as Record<string, number>)[p.key],
                  }));
                  return (
                    <div key={p.key} className="p-5 bg-white rounded-xl border border-black/5 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-2 mb-6 border-b border-black/5 pb-3">
                         <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                         <span className="text-[11px] font-bold text-[#1d1d1f] uppercase tracking-wider">{p.label}</span>
                      </div>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data} layout="vertical" margin={{ left: -15, right: 10, top: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="8 8" stroke="#000" horizontal={false} strokeOpacity={0.03} />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: '#86868b', fontWeight: 'bold' }} tickLine={false} axisLine={false} width={45} />
                            <Tooltip contentStyle={ttStyle} cursor={{ fill: 'rgba(0,0,0,0.01)' }} />
                            <Bar dataKey="value" fill={p.color} radius={[0, 4, 4, 0]} barSize={12} fillOpacity={0.8} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Technical Footer */}
            <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-black/5 bg-[#f5f5f7] flex flex-wrap items-center justify-between gap-2 text-[9px] sm:text-[10px] text-[#86868b] font-bold uppercase tracking-widest">
               <div className="flex gap-4 sm:gap-6">
                  <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> {t('depth.calibrationActive')}</span>
                  <span className="hidden sm:inline">{t('depth.hwVersion')}</span>
               </div>
               <span className="hidden sm:inline">SoiLink Precision Vertical Probe</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
