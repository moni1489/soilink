import { useState, useCallback, useMemo } from 'react';
import { MapboxViewer } from '@/components/MapboxViewer';
import { SensorPanel } from '@/components/SensorPanel';
import { ChatInterface } from '@/components/ChatInterface';
import { ComparisonModal } from '@/components/ComparisonModal';
import { DepthProfileModal } from '@/components/DepthProfileModal';
import { RecommendationsPanel } from '@/components/RecommendationsPanel';
import { WeatherWidget } from '@/components/WeatherWidget';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map as MapIcon, MessageSquare, Layers, BarChart3,
  TrendingUp, AlertTriangle, ChevronDown, X, Droplet, 
  Thermometer, FlaskConical, Settings2, Info,
  Activity, Zap, ShieldCheck
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { SoilAnalysisCard } from '@/components/SoilAnalysisCard';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Sensor, SoilZone, MapMode, SoilDepth } from '@/types';
import { fields, sensors, zones, recommendations, weather } from '@/data/mockData';

type RightPanel = 'recommendations' | 'chat' | 'analysis' | null;

export function DashboardPage() {
  const isMobile = useIsMobile();
  const [activeFieldId, setActiveFieldId] = useState(fields[0].id);
  const [activeZoneFilter, setActiveZoneFilter] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>('heatmap');
  const [selectedDepth, setSelectedDepth] = useState<SoilDepth>('0-5cm');
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [selectedZone, setSelectedZone] = useState<SoilZone | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>('recommendations');
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [depthProfileOpen, setDepthProfileOpen] = useState(false);
  const [fieldDropdown, setFieldDropdown] = useState(false);
  const [ndviEnabled, setNdviEnabled] = useState(false);

  const [zoneDropdown, setZoneDropdown] = useState(false);

  const activeField = useMemo(() => fields.find(f => f.id === activeFieldId) ?? fields[0], [activeFieldId]);
  const activeSensors = useMemo(() => sensors.filter(s => s.fieldId === activeFieldId), [activeFieldId]);
  const allFieldZones = useMemo(() => zones.filter(z => z.fieldId === activeFieldId), [activeFieldId]);
  const activeZones = useMemo(() => activeZoneFilter ? allFieldZones.filter(z => z.id === activeZoneFilter) : allFieldZones, [allFieldZones, activeZoneFilter]);
  const activeRecs = useMemo(() => recommendations.filter(r => !r.fieldId || r.fieldId === activeFieldId), [activeFieldId]);
  const activeWeather = weather[activeFieldId] || weather['f-1'];

  const stats = useMemo(() => {
    if (!activeSensors.length) return [];
    const avgMoisture = activeSensors.reduce((s, x) => s + x.soilMoisture, 0) / activeSensors.length;
    const avgTemp = activeSensors.reduce((s, x) => s + x.soilTemperature, 0) / activeSensors.length;
    const avgPh = activeSensors.reduce((s, x) => s + x.pH, 0) / activeSensors.length;
    
    return [
      { id: 'moisture', label: 'Влажность', value: `${avgMoisture.toFixed(0)}%`, icon: Droplet, color: 'text-blue-500', trend: '+2%', data: [35, 42, 38, 45, 49, avgMoisture] },
      { id: 'temp', label: 'Температура', value: `${avgTemp.toFixed(1)}°`, icon: Thermometer, color: 'text-orange-500', trend: '-1°', data: [18, 19, 22, 21, 20, avgTemp] },
      { id: 'ph', label: 'Кислотность', value: `${avgPh.toFixed(1)}`, icon: FlaskConical, color: 'text-purple-500', trend: 'OK', data: [6.1, 6.2, 6.1, 6.3, 6.4, avgPh] },
      { id: 'health', label: 'NDVI Индекс', value: '0.74', icon: TrendingUp, color: 'text-green-600', trend: '+0.05', data: [0.65, 0.68, 0.70, 0.71, 0.73, 0.74] },
    ];
  }, [activeSensors]);

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7] overflow-hidden">
      {/* Precision Toolbar */}
      <div className="flex-shrink-0 bg-white border-b border-black/5 px-4 md:px-6 py-3 flex items-center gap-4 md:gap-6 z-20 overflow-x-auto scrollbar-hide">
        <div className="relative flex-shrink-0">
          <button onClick={() => setFieldDropdown(v => !v)}
            className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-black/5 rounded-lg transition-all text-[13px] font-bold"
          >
            <MapIcon className="w-4 h-4 text-blue-500" />
            <span className="truncate max-w-[120px]">{activeField.name.split(' — ')[0]}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#86868b] transition-transform ${fieldDropdown ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {fieldDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFieldDropdown(false)} />
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-64 bg-white border border-black/5 rounded-xl shadow-xl z-50 p-1"
                >
                  {fields.map(f => (
                    <button key={f.id} onClick={() => { setActiveFieldId(f.id); setActiveZoneFilter(null); setFieldDropdown(false); }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-[13px] hover:bg-black/5 transition-all flex items-center justify-between ${activeFieldId === f.id ? 'font-bold bg-black/5' : ''}`}
                    >
                      <span className="truncate">{f.name}</span>
                      {activeFieldId === f.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="relative flex-shrink-0">
          <button onClick={() => setZoneDropdown(v => !v)}
            className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-black/5 rounded-lg transition-all text-[13px] font-bold"
          >
            <Layers className="w-4 h-4 text-purple-500" />
            <span className="truncate max-w-[120px]">{activeZoneFilter ? allFieldZones.find(z => z.id === activeZoneFilter)?.name : 'Все зоны'}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#86868b] transition-transform ${zoneDropdown ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {zoneDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setZoneDropdown(false)} />
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-64 bg-white border border-black/5 rounded-xl shadow-xl z-50 p-1"
                >
                  <button onClick={() => { setActiveZoneFilter(null); setZoneDropdown(false); }}
                    className={`w-full text-left px-4 py-2 rounded-lg text-[13px] hover:bg-black/5 transition-all flex items-center justify-between ${!activeZoneFilter ? 'font-bold bg-black/5' : ''}`}
                  >
                    <span>Все зоны</span>
                    {!activeZoneFilter && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                  </button>
                  {allFieldZones.map(z => (
                    <button key={z.id} onClick={() => { setActiveZoneFilter(z.id); setZoneDropdown(false); }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-[13px] hover:bg-black/5 transition-all flex items-center justify-between ${activeZoneFilter === z.id ? 'font-bold bg-black/5' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color === 'green' ? '#10b981' : z.color === 'yellow' ? '#f59e0b' : '#ef4444' }} />
                        <span className="truncate">{z.name}</span>
                      </div>
                      {activeZoneFilter === z.id && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="h-4 w-px bg-black/10 flex-shrink-0" />

        <div className="flex bg-[#f5f5f7] p-1 rounded-lg border border-black/5 overflow-hidden flex-shrink-0">
          {([['heatmap', 'Хитмап'], ['zones', 'Зоны'], ['satellite', 'Спутник']] as [MapMode, string][]).map(([m, lbl]) => (
            <button key={m} onClick={() => setMapMode(m)}
              className={`px-4 py-1.5 rounded-md text-[11px] font-bold transition-all ${mapMode === m ? 'bg-white shadow-sm text-blue-600' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}
            >{lbl}</button>
          ))}
        </div>

        <button onClick={() => setNdviEnabled(!ndviEnabled)}
          title="NDVI (Нормализованный относительный индекс растительности) показывает качество и плотность биомассы"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all border flex-shrink-0 ${ndviEnabled ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-200' : 'bg-white border-black/10 text-[#6e6e73] hover:border-black/20'}`}
        >
          <Activity className="w-3.5 h-3.5" /> NDVI
        </button>

        <div className="flex-1 hidden md:block" />
        <div className="flex-shrink-0 hidden md:block">
          <WeatherWidget data={activeWeather} />
        </div>
      </div>

      {/* Grid Stats */}
      <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-4 bg-white border-b border-black/5">
        {stats.map((s, i) => {
          const colorHex = s.color.includes('blue') ? '#3b82f6' : s.color.includes('orange') ? '#f97316' : s.color.includes('purple') ? '#a855f7' : '#16a34a';
          const borderClasses = isMobile
            ? `${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b' : ''} border-black/5`
            : `${i < 3 ? 'border-r' : ''} border-black/5`;
          return (
            <div key={s.id} className={`p-3 md:p-5 flex flex-col gap-1 md:gap-1.5 relative group overflow-hidden ${borderClasses}`}>
               <div className="flex items-center justify-between min-w-0 z-10 relative">
                  <span className="text-[9px] md:text-[10px] font-black text-[#6e6e73] uppercase tracking-widest truncate">{s.label}</span>
                  <s.icon className={`w-3.5 h-3.5 flex-shrink-0 ${s.color}`} />
               </div>
               <div className="flex items-baseline gap-2 min-w-0 z-10 relative">
                  <span className="text-xl md:text-3xl font-bold tracking-tight font-data leading-none truncate">{s.value}</span>
                  <span className={`text-[10px] font-black font-data px-1.5 py-0.5 rounded bg-black/5 ${s.trend.includes('+') ? 'text-green-600' : s.trend.includes('-') ? 'text-orange-600' : 'text-[#86868b]'}`}>{s.trend}</span>
               </div>
               {/* Sparkline background */}
               <div className="absolute inset-x-0 bottom-0 h-12 opacity-15 pointer-events-none group-hover:opacity-30 transition-opacity">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={s.data.map((val, idx) => ({ val, idx }))}>
                        <defs>
                           <linearGradient id={`spark-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={colorHex} stopOpacity={1} />
                              <stop offset="100%" stopColor={colorHex} stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="val" stroke={colorHex} strokeWidth={2} fill={`url(#spark-${s.id})`} />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
          );
        })}
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="h-[42vh] flex-shrink-0 md:h-auto md:flex-1 relative bg-white overflow-hidden">
          <MapboxViewer
            sensors={activeSensors}
            zones={activeZones}
            field={activeField}
            mapMode={ndviEnabled ? 'heatmap' : mapMode}
            onSelectSensor={setSelectedSensor}
            onSelectZone={setSelectedZone}
            activeSensorId={selectedSensor?.id ?? null}
            activeZoneId={selectedZone?.id ?? null}
          />

          {/* Convenient Field Health Hub */}
          <div className="absolute top-4 left-4 right-4 md:right-auto md:top-6 md:left-6 z-10 flex flex-col gap-4 pointer-events-none">
             <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
               className="bg-white/95 backdrop-blur-xl border border-black/5 p-4 md:p-6 rounded-2xl pointer-events-auto shadow-pro w-full md:w-[320px]"
             >
                <div className="flex items-center justify-between mb-4 md:mb-5">
                   <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-green-500" />
                      <span className="text-[11px] font-black uppercase tracking-wider">Общий статус поля</span>
                   </div>
                   <div className="px-2 py-0.5 bg-green-50 text-green-600 text-[9px] font-bold rounded uppercase">Стабильно</div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-4 md:mb-6">
                   <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-[#6e6e73] uppercase">Однородность</span>
                      <span className="text-xl font-bold font-data text-[#1d1d1f]">88%</span>
                   </div>
                   <div className="flex flex-col gap-1 text-right">
                      <span className="text-[9px] font-bold text-[#6e6e73] uppercase">Индекс роста</span>
                      <span className="text-xl font-bold font-data text-green-600">Оптимально</span>
                   </div>
                </div>

                <div className="h-1.5 bg-black/5 rounded-full overflow-hidden mb-6">
                   <motion.div initial={{ width: 0 }} animate={{ width: '88%' }} className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => setSelectedDepth('0-5cm')} className={`py-2 rounded-lg text-[10px] font-bold transition-all border pointer-events-auto ${selectedDepth === '0-5cm' ? 'bg-[#1d1d1f] text-white border-black shadow-md' : 'bg-[#f5f5f7] border-transparent text-[#6e6e73] hover:bg-black/5'}`}>ВЕРХНИЙ СЛОЙ</button>
                   <button onClick={() => setSelectedDepth('60-100cm')} className={`py-2 rounded-lg text-[10px] font-bold transition-all border pointer-events-auto ${selectedDepth === '60-100cm' ? 'bg-[#1d1d1f] text-white border-black shadow-md' : 'bg-[#f5f5f7] border-transparent text-[#6e6e73] hover:bg-black/5'}`}>ГЛУБИННЫЙ СЛОЙ</button>
                </div>
             </motion.div>
          </div>

          {/* Quick Controls Bottom */}
          <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2.5">
             <button onClick={() => setDepthProfileOpen(true)} className="flex items-center gap-2 md:gap-2.5 px-4 md:px-6 py-2.5 md:py-3 bg-[#1d1d1f] text-white rounded-full text-[11px] md:text-[13px] font-bold shadow-pro-lg hover:bg-black hover:scale-105 active:scale-95 transition-all whitespace-nowrap">
                <Settings2 className="w-4 h-4" /> <span className="hidden sm:inline">ОТКРЫТЬ </span>СКАНЕР ПРОФИЛЯ
             </button>
          </div>

          <AnimatePresence>
            {selectedZone && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="absolute top-4 left-4 right-4 md:left-auto md:top-6 md:right-6 md:w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-pro-lg z-30 overflow-hidden border border-black/5"
              >
                <div className="p-5 border-b border-black/5 flex items-center justify-between">
                   <h3 className="font-bold text-[14px] truncate">{selectedZone.name}</h3>
                   <button onClick={() => setSelectedZone(null)} className="p-1 hover:bg-black/5 rounded-md transition-all"><X className="w-4 h-4 text-[#6e6e73]" /></button>
                </div>
                <div className="p-5 flex flex-col gap-6">
                   <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                         <span className="text-[10px] font-bold text-[#6e6e73] uppercase tracking-wider">Индекс здоровья</span>
                         <span className="text-3xl font-bold font-data leading-none">{selectedZone.healthScore}%</span>
                      </div>
                      <div className="w-14 h-14 rounded-full border-4 border-blue-500/10 flex items-center justify-center">
                         <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-[12px] font-black text-white shadow-lg shadow-blue-200">{selectedZone.healthScore}</div>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setComparisonOpen(true)} className="py-2.5 bg-[#0071e3] text-white rounded-xl text-[11px] font-bold shadow-sm hover:bg-[#0077ed] transition-all">Анализ</button>
                      <button onClick={() => setDepthProfileOpen(true)} className="py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-xl text-[11px] font-bold hover:bg-black/5 transition-all">Отчет</button>
                   </div>
                   <div className="p-4 bg-blue-50/50 rounded-xl flex gap-3 border border-blue-100/50">
                      <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-blue-900 leading-relaxed font-medium">Критический дефицит минералов в горизонте 30-60см. Рекомендуется внесение удобрений.</p>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full md:w-[420px] flex-1 min-h-0 md:flex-shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-black/5 bg-white relative">
           <div className="h-14 md:h-16 flex items-center gap-1 px-4 border-b border-black/5 bg-[#fbfbfd]">
              <button onClick={() => setRightPanel('recommendations')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${rightPanel === 'recommendations' ? 'bg-white shadow-sm text-[#1d1d1f] border border-black/5' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}>
                 <Zap className="w-4 h-4" />
                 <span className="text-[11px] font-black uppercase tracking-wider">Инсайты</span>
              </button>
              <button onClick={() => setRightPanel('chat')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${rightPanel === 'chat' ? 'bg-white shadow-sm text-[#1d1d1f] border border-black/5' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}>
                 <MessageSquare className="w-4 h-4" />
                 <span className="text-[11px] font-black uppercase tracking-wider">Чат</span>
              </button>
              <button onClick={() => setRightPanel('analysis')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${rightPanel === 'analysis' ? 'bg-white shadow-sm text-[#1d1d1f] border border-black/5' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}>
                 <Layers className="w-4 h-4" />
                 <span className="text-[11px] font-black uppercase tracking-wider">Почва</span>
              </button>
           </div>
           <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                  <motion.div key={rightPanel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full overflow-y-auto p-4">
                     {rightPanel === 'chat' ? (
                       <ChatInterface isOpen={true} onClose={() => setRightPanel(null)} context={{ field: activeField, sensors: activeSensors }} />
                     ) : rightPanel === 'analysis' ? (
                       <SoilAnalysisCard fieldId={activeFieldId} />
                     ) : (
                       <RecommendationsPanel recommendations={activeRecs} />
                     )}
                  </motion.div>
              </AnimatePresence>
           </div>
        </div>
      </div>

      <SensorPanel isOpen={!!selectedSensor} sensor={selectedSensor} onClose={() => setSelectedSensor(null)} />
      <ComparisonModal isOpen={comparisonOpen} sensor={selectedSensor} depth={selectedDepth} onClose={() => setComparisonOpen(false)} />
      <DepthProfileModal isOpen={depthProfileOpen} onClose={() => setDepthProfileOpen(false)} />
    </div>
  );
}
