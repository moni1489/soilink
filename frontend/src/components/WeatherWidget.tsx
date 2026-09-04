import { Sun, Cloud, CloudRain, Wind, CloudLightning } from 'lucide-react';
import type { WeatherData } from '@/types';

const ICONS = {
  sunny: Sun,
  cloudy: Cloud,
  rain: CloudRain,
  windy: Wind,
  storm: CloudLightning,
};

const CONDITION_LABELS = {
  sunny: 'Ясно',
  cloudy: 'Облачно',
  rain: 'Дождь',
  windy: 'Ветер',
  storm: 'Шторм',
};

export function WeatherWidget({ data }: { data: WeatherData }) {
  const Icon = ICONS[data.condition];

  return (
    <div className="flex items-center gap-4 px-3 py-1.5 bg-white border border-black/5 rounded-xl shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-2 pr-3 border-r border-black/5">
        <Icon className="w-4 h-4 text-orange-400" />
        <div className="flex flex-col">
           <span className="text-[13px] font-bold font-data leading-none">{data.temp}°C</span>
           <span className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider">{CONDITION_LABELS[data.condition]}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Wind className="w-3.5 h-3.5 text-[#86868b]" />
          <span className="text-[12px] font-bold font-data">{data.windSpeed} м/с</span>
        </div>
        
        <div className="hidden lg:flex items-center gap-3 pl-1">
          {data.forecast.slice(0, 3).map((f, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-[8px] font-bold text-[#86868b] uppercase">{f.day}</span>
              <span className="text-[11px]">{f.icon}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
