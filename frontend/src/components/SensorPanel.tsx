import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Droplet, Thermometer, FlaskConical, Activity, Zap, Wind,
  Battery, Signal, Beaker, Leaf, Cpu, Info, ShieldCheck
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Sensor } from '@/types';
import { getMoistureHistory, getTemperatureHistory } from '@/data/mockData';

interface SensorPanelProps {
  isOpen: boolean;
  sensor: Sensor | null;
  onClose: () => void;
}

export function SensorPanel({ isOpen, sensor, onClose }: SensorPanelProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '24h'>('7d');
  const moistureHistory = sensor ? getMoistureHistory(sensor.id, timeframe) : [];
  const tempHistory = sensor ? getTemperatureHistory(sensor.id, timeframe) : [];

  return (
    <AnimatePresence>
      {isOpen && sensor && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 200 }}
          className="absolute top-0 right-0 bottom-0 w-full sm:w-[480px] bg-white border-l border-black/5 z-50 flex flex-col shadow-pro-lg overflow-hidden"
        >
          {/* Diagnostic Header */}
          <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-black/5 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
               <div className="w-10 h-10 bg-[#f5f5f7] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Cpu className="w-5 h-5 text-blue-500" />
               </div>
               <div className="flex flex-col min-w-0">
                  <h2 className="text-[15px] font-bold truncate leading-tight">{sensor.name}</h2>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-bold text-[#6e6e73] uppercase tracking-wider">Node ID: {sensor.id.split('-')[1]}</span>
                     <div className="w-1 h-1 rounded-full bg-green-500" />
                  </div>
               </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-all">
              <X className="w-5 h-5 text-[#6e6e73]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col gap-6 sm:gap-10 scrollbar-hide">
            {/* Real-time Status */}
            <div className="flex items-center gap-4 sm:gap-8 justify-between px-2">
               <StatusIndicator label="Статус" value="ОНЛАЙН" color="text-green-500" />
               <StatusIndicator label="Заряд" value={`${sensor.battery}%`} color={sensor.battery < 20 ? 'text-red-500' : 'text-[#1d1d1f]'} />
               <StatusIndicator label="Сигнал" value={`${sensor.signalStrength}%`} color="text-[#1d1d1f]" />
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
               <MetricCard label="Влажность" value={`${sensor.soilMoisture}%`} icon={Droplet} color="text-blue-500" />
               <MetricCard label="Температура" value={`${sensor.soilTemperature.toFixed(1)}°C`} icon={Thermometer} color="text-orange-500" />
               <MetricCard label="pH Уровень" value={sensor.pH.toFixed(2)} icon={FlaskConical} color="text-purple-500" />
               <MetricCard label="Проводимость" value={sensor.electricalConductivity.toFixed(2)} icon={Zap} color="text-yellow-600" />
            </div>

            {/* Chemical Analysis - Farmer Realism */}
            <div className="p-6 bg-[#f5f5f7] rounded-2xl border border-black/5">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                     <Beaker className="w-4 h-4 text-blue-500" />
                     <span className="text-[11px] font-bold text-[#1d1d1f] uppercase tracking-wider">Анализ NPK</span>
                  </div>
                  <span className="text-[9px] font-bold text-[#6e6e73]">ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ: 4Ч НАЗАД</span>
               </div>
               <div className="space-y-6">
                  <NutrientRow label="Азот (N)" value={sensor.nitrogen} max={50} color="bg-blue-500" />
                  <NutrientRow label="Фосфор (P)" value={sensor.phosphorus} max={50} color="bg-green-500" />
                  <NutrientRow label="Калий (K)" value={sensor.potassium} max={300} color="bg-purple-500" />
               </div>
            </div>

            {/* Historical Trends */}
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <Activity className="w-4 h-4 text-blue-500" />
                     <span className="text-[11px] font-bold text-[#1d1d1f] uppercase tracking-wider">
                        Динамика показателей
                     </span>
                  </div>
                  <div className="flex bg-[#f5f5f7] p-1 rounded-lg border border-black/5">
                     <button
                        onClick={() => setTimeframe('7d')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                           timeframe === '7d' ? 'bg-white shadow-sm text-blue-600' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                        }`}
                     >
                        За неделю
                     </button>
                     <button
                        onClick={() => setTimeframe('24h')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                           timeframe === '24h' ? 'bg-white shadow-sm text-blue-600' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                        }`}
                     >
                        24 часа
                     </button>
                  </div>
               </div>

               <TrendChart
                  id="moisture"
                  title={`Тренд влажности (${timeframe === '7d' ? 'За неделю' : '24ч'})`}
                  data={moistureHistory}
                  color="#0071e3"
                  unit="%"
               />
               <TrendChart
                  id="temp"
                  title={`Стабильность температуры (${timeframe === '7d' ? 'За неделю' : '24ч'})`}
                  data={tempHistory}
                  color="#ff9500"
                  unit="°C"
               />
            </div>

            {/* System Info Footnote */}
            <div className="mt-4 pt-8 border-t border-black/5 flex items-start gap-4 text-[11px] text-[#6e6e73] font-medium leading-relaxed">
               <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
               <p>Калибровка произведена автоматически. Все показатели в пределах нормы по ГОСТ Р 53381-2009 для текущего типа почвы (Чернозем выщелоченный).</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatusIndicator({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-1 text-center">
       <span className="text-[9px] font-bold text-[#6e6e73] uppercase tracking-widest">{label}</span>
       <span className={`text-[13px] font-bold font-data ${color}`}>{value}</span>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="p-5 bg-white border border-black/5 rounded-2xl shadow-pro hover:border-black/10 transition-all flex items-center gap-4 group">
       <div className={`w-10 h-10 rounded-lg bg-[#f5f5f7] flex items-center justify-center transition-transform group-hover:scale-110 ${color}`}>
          <Icon className="w-5 h-5" />
       </div>
       <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold text-[#6e6e73] uppercase tracking-wider truncate">{label}</span>
          <span className="text-[18px] font-bold font-data">{value}</span>
       </div>
    </div>
  );
}

function NutrientRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const p = Math.min((value / max) * 100, 100);
  return (
    <div className="flex flex-col gap-2">
       <div className="flex justify-between items-baseline">
          <span className="text-[12px] font-bold">{label}</span>
          <span className="text-[13px] font-bold font-data text-[#1d1d1f]">{value} <span className="text-[10px] text-[#6e6e73] font-medium">МГ/КГ</span></span>
       </div>
       <div className="h-1.5 bg-white rounded-full overflow-hidden shadow-inner border border-black/5">
          <motion.div initial={{ width: 0 }} animate={{ width: `${p}%` }} className={`h-full ${color} shadow-sm`} />
       </div>
    </div>
  );
}

function TrendChart({ id, title, data, color, unit }: { id: string; title: string; data: any[]; color: string; unit: string }) {
  const gradId = `sensor-chart-grad-${id}`;
  return (
    <div className="flex flex-col gap-3 p-4 bg-[#fbfbfd] rounded-2xl border border-black/5">
       <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#1d1d1f] uppercase tracking-wider">{title}</span>
          <span className="text-[11px] font-black font-data" style={{ color }}>{data[data.length - 1]?.value}{unit}</span>
       </div>
       <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                <defs>
                   <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                   </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#000" vertical={false} strokeOpacity={0.05} />
                <XAxis 
                   dataKey="label" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fontSize: 10, fill: '#86868b', fontWeight: 700 }}
                   interval="preserveStartEnd"
                />
                <YAxis hide domain={['dataMin - 3', 'dataMax + 3']} />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: '11px', fontWeight: 'bold' }}
                   formatter={(val: any) => [`${val}${unit}`, title.split(' ')[0]]}
                   labelStyle={{ color: '#86868b', fontSize: '10px' }}
                />
                <Area 
                   type="monotone" 
                   dataKey="value" 
                   stroke={color} 
                   strokeWidth={2.5} 
                   fillOpacity={1} 
                   fill={`url(#${gradId})`} 
                />
             </AreaChart>
          </ResponsiveContainer>
       </div>
    </div>
  );
}
