import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, AlertTriangle, TrendingUp, FlaskConical, 
  ChevronRight, Clock, FileText, CheckCircle2 
} from 'lucide-react';
import { MLPredictionCard } from './MLPredictionCard';
import type { Recommendation } from '@/types';

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  fieldId?: string;
}

const LEVEL_THEMES = {
  critical: { icon: ShieldCheck, labelKey: 'rec.priority', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
  warning: { icon: AlertTriangle, labelKey: 'rec.monitoring', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  plan: { icon: TrendingUp, labelKey: 'rec.optimization', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  premium: { icon: FlaskConical, labelKey: 'rec.analytics', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
};

export function RecommendationsPanel({ recommendations, fieldId }: RecommendationsPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      {/* Live ML Prediction Hub */}
      {fieldId && <MLPredictionCard fieldId={fieldId} />}

      <div className="flex items-baseline justify-between px-1 pt-1">
        <h3 className="text-[14px] font-semibold text-[#1d1d1f]">{t('rec.protocolTitle')}</h3>
        <span className="text-[11px] text-[#86868b]">{t('rec.tasks', { count: recommendations.length })}</span>
      </div>

      {recommendations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-[#f5f5f7] rounded-2xl border border-black/5">
          <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
          <h3 className="text-[13px] font-bold">{t('rec.allNormal')}</h3>
          <p className="text-[11px] text-[#6e6e73] mt-0.5">{t('rec.allNormalBody')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recommendations.map((rec, i) => (
            <motion.div key={rec.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <DiagnosticCard recommendation={rec} />
            </motion.div>
          ))}
        </div>
      )}

      <div className="p-3 rounded-xl border border-black/5 bg-white flex gap-2.5">
        <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#6e6e73] leading-relaxed">
          {t('rec.mlNote')}
        </p>
      </div>
    </div>
  );
}

function DiagnosticCard({ recommendation }: { recommendation: Recommendation }) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(recommendation.level === 'critical');
  const theme = LEVEL_THEMES[recommendation.level];
  const Icon = theme.icon;
  const progress = recommendation.timeline.length ? (recommendation.timeline.filter(s => s.completed).length / recommendation.timeline.length) * 100 : 0;

  return (
    <div className={`rounded-xl border bg-white shadow-sm transition-colors ${expanded ? theme.border : 'border-black/5 hover:border-black/10'}`}>
       <button onClick={() => setExpanded(!expanded)}
         className="w-full text-left p-4 flex items-start gap-3"
       >
         <div className={`w-8 h-8 rounded-lg ${theme.bg} ${theme.color} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-4 h-4" />
         </div>
         <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
               <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${theme.bg} ${theme.color}`}>{t(theme.labelKey)}</span>
               {recommendation.timeline.length > 0 && (
                  <div className="flex-1 h-1 bg-black/5 rounded-full overflow-hidden max-w-[60px]">
                     <div className={`h-full ${theme.color.replace('text-', 'bg-')}`} style={{ width: `${progress}%` }} />
                  </div>
               )}
            </div>
            <p className="text-[13px] font-semibold text-[#1d1d1f] leading-snug">{t(recommendation.titleKey)}</p>
         </div>
         <ChevronRight className={`w-4 h-4 text-[#86868b] transition-transform mt-2 ${expanded ? 'rotate-90' : ''}`} />
       </button>

       <AnimatePresence>
         {expanded && (
           <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
             <div className="px-4 pb-4 pt-3 border-t border-black/5">
                <div className="mb-4">
                   <p className="text-[12px] text-[#3a3a3c] leading-relaxed">
                      {t(recommendation.messageKey)}
                   </p>
                </div>

                {recommendation.timeline.length > 0 && (
                  <div className="space-y-3">
                     <p className="text-[11px] text-[#86868b]">{t('rec.actionProtocol')}</p>
                     {recommendation.timeline.map((step, idx) => (
                       <div key={step.id} className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${step.completed ? 'bg-green-500 border-green-500 text-white shadow-sm' : 'border-black/10'}`}>
                             {step.completed ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className={`text-[12px] font-medium ${step.completed ? 'text-[#86868b] line-through' : 'text-[#1d1d1f]'}`}>{t(step.labelKey)}</p>
                             <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#86868b]">
                                <Clock className="w-3 h-3" />
                                {new Date(step.dueAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
                )}
                <button className="w-full mt-4 py-2 bg-[#1d1d1f] text-white rounded-lg text-[12px] font-semibold hover:bg-black transition-colors">{t('rec.accept')}</button>
             </div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
}
