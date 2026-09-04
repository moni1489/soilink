import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, AlertTriangle, TrendingUp, FlaskConical, 
  ChevronRight, Clock, Activity, FileText, CheckCircle2 
} from 'lucide-react';
import type { Recommendation } from '@/types';

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
}

const LEVEL_THEMES = {
  critical: { icon: ShieldCheck, label: 'ПРИОРИТЕТ', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
  warning: { icon: AlertTriangle, label: 'МОНИТОРИНГ', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  plan: { icon: TrendingUp, label: 'ОПТИМИЗАЦИЯ', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  premium: { icon: FlaskConical, label: 'АНАЛИТИКА+', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
};

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-40">
        <CheckCircle2 className="w-12 h-12 text-green-500 mb-6" />
        <h3 className="text-[15px] font-bold">Активность в норме</h3>
        <p className="text-[12px] text-[#6e6e73] mt-1 font-medium">Все системы работают в штатном режиме</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 overflow-y-auto h-full scrollbar-hide">
       <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2.5">
             <Activity className="w-4 h-4 text-[#1d1d1f]" />
             <span className="text-[11px] font-bold text-[#1d1d1f] uppercase tracking-wider">Диагностическая лента</span>
          </div>
          <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest">{recommendations.length} ЗАПИСЕЙ</span>
       </div>
       
       <div className="space-y-4">
          {recommendations.map((rec, i) => (
            <motion.div key={rec.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
               <DiagnosticCard recommendation={rec} />
            </motion.div>
          ))}
       </div>

       <div className="mt-8 p-5 bg-[#f5f5f7] rounded-2xl border border-black/5 flex gap-4">
          <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <p className="text-[11px] text-[#6e6e73] leading-relaxed font-medium">
             Данные анализируются нейронной сетью SoilLink v4. Последнее сканирование завершено успешно. Точность модели: 96.8%.
          </p>
       </div>
    </div>
  );
}

function DiagnosticCard({ recommendation }: { recommendation: Recommendation }) {
  const [expanded, setExpanded] = useState(recommendation.level === 'critical');
  const theme = LEVEL_THEMES[recommendation.level];
  const Icon = theme.icon;
  const progress = recommendation.timeline.length ? (recommendation.timeline.filter(s => s.completed).length / recommendation.timeline.length) * 100 : 0;

  return (
    <div className={`rounded-2xl border transition-all duration-300 ${expanded ? `${theme.border} bg-white shadow-pro` : 'bg-white border-black/5 hover:border-black/10'}`}>
       <button onClick={() => setExpanded(!expanded)}
         className="w-full text-left p-5 flex items-start gap-5"
       >
         <div className={`w-10 h-10 rounded-xl ${theme.bg} ${theme.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <Icon className="w-5 h-5" />
         </div>
         <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
               <span className={`text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-md ${theme.bg} ${theme.color}`}>{theme.label}</span>
               {recommendation.timeline.length > 0 && (
                  <div className="flex-1 h-1 bg-black/5 rounded-full overflow-hidden max-w-[60px]">
                     <div className={`h-full ${theme.color.replace('text-', 'bg-')}`} style={{ width: `${progress}%` }} />
                  </div>
               )}
            </div>
            <p className="text-[14px] font-bold text-[#1d1d1f] leading-tight tracking-tight">{recommendation.titleKey}</p>
         </div>
         <ChevronRight className={`w-4 h-4 text-[#86868b] transition-transform mt-3 ${expanded ? 'rotate-90' : ''}`} />
       </button>

       <AnimatePresence>
         {expanded && (
           <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
             <div className="px-5 pb-6 pt-2 border-t border-black/5 bg-white">
                <div className="p-4 bg-[#f5f5f7] rounded-xl mb-6">
                   <p className="text-[12px] text-[#1d1d1f] leading-relaxed font-medium italic opacity-80">
                      "{recommendation.messageKey}"
                   </p>
                </div>

                {recommendation.timeline.length > 0 && (
                  <div className="space-y-4">
                     <p className="text-[9px] font-bold text-[#86868b] uppercase tracking-widest px-1">Протокол действий</p>
                     {recommendation.timeline.map((step, idx) => (
                       <div key={step.id} className="flex items-center gap-4 group">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${step.completed ? 'bg-green-500 border-green-500 text-white shadow-sm' : 'border-black/10'}`}>
                             {step.completed ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className={`text-[12px] font-bold ${step.completed ? 'text-[#86868b] line-through' : 'text-[#1d1d1f]'}`}>{step.labelKey}</p>
                             <div className="flex items-center gap-1.5 mt-1 text-[9px] font-bold text-[#86868b] uppercase tracking-wider">
                                <Clock className="w-3 h-3" />
                                {new Date(step.dueAt).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
                )}
                <button className="w-full mt-8 py-3 bg-[#1d1d1f] text-white rounded-xl text-[12px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">Принять в работу</button>
             </div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
}
