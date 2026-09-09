import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, FlaskConical, Activity, RefreshCw,
  ChevronRight, AlertTriangle, CheckCircle2, Loader2,
  Cpu, TrendingUp, Leaf, ShieldCheck,
} from 'lucide-react';

interface MLPrediction {
  id: number;
  field_id: string;
  sensor_id: string | null;
  timestamp: string;
  crop_recommendation: string | null;
  crop_confidence: number | null;
  fertilizer_recommendation: string | null;
  fertilizer_source: 'ml' | 'rule_based';
  soil_state: string | null;
  soil_state_confidence: number | null;
  feature_snapshot: Record<string, unknown> | null;
}

interface MLAnalysisPanelProps {
  fieldId: string;
}

const SOIL_STATE_THEMES: Record<string, { color: string; bg: string; label: string; icon: typeof CheckCircle2 }> = {
  healthy:  { color: 'text-green-600',  bg: 'bg-green-50',  label: 'Здоровая',    icon: CheckCircle2 },
  moderate: { color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Умеренная',   icon: Activity },
  poor:     { color: 'text-orange-600', bg: 'bg-orange-50', label: 'Слабая',       icon: AlertTriangle },
  critical: { color: 'text-red-600',    bg: 'bg-red-50',    label: 'Критическая', icon: AlertTriangle },
};

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 bg-black/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-[10px] font-black text-[#86868b] tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

function FeatureSnapshot({ snapshot }: { snapshot: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const crops = snapshot.crop_features as Record<string, number> | undefined;
  if (!crops) return null;

  const items = [
    { key: 'nitrogen', label: 'N', unit: '' },
    { key: 'phosphorus', label: 'P', unit: '' },
    { key: 'potassium', label: 'K', unit: '' },
    { key: 'ph', label: 'pH', unit: '' },
    { key: 'humidity', label: 'Влажн.', unit: '%' },
    { key: 'temperature', label: 'Темп.', unit: '°' },
  ].filter(i => crops[i.key] !== undefined);

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-[10px] font-black text-[#86868b] uppercase tracking-wider hover:text-[#1d1d1f] transition-colors"
      >
        <Cpu className="w-3 h-3" />
        Данные для модели
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2 mt-3">
              {items.map(({ key, label, unit }) => (
                <div key={key} className="bg-[#f5f5f7] rounded-xl p-2.5 text-center">
                  <p className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider">{label}</p>
                  <p className="text-[13px] font-bold font-data text-[#1d1d1f] mt-0.5">
                    {typeof crops[key] === 'number' ? (crops[key] as number).toFixed(1) : '—'}{unit}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MLAnalysisPanel({ fieldId }: MLAnalysisPanelProps) {
  const [data, setData] = useState<MLPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const fetchLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/predictions/latest?field_id=${fieldId}`);
      if (res.status === 404) {
        setData(null);
        setError('no_data');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: MLPrediction = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (err) {
      setError('network');
    } finally {
      setLoading(false);
    }
  }, [fieldId, apiUrl]);

  const runInference = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/predictions/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_id: fieldId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail || `HTTP ${res.status}`);
      }
      const json: MLPrediction = await res.json();
      setData(json);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка инференса');
    } finally {
      setRunning(false);
    }
  }, [fieldId, apiUrl]);

  useEffect(() => {
    if (fieldId) fetchLatest();
  }, [fieldId, fetchLatest]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-black/5 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    );
  }

  if (error === 'no_data') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-10 gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center">
          <Brain className="w-8 h-8 text-[#86868b]" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-[#1d1d1f]">ML-анализ ещё не запускался</p>
          <p className="text-[12px] text-[#6e6e73] mt-1 font-medium leading-relaxed">
            Нажмите кнопку ниже чтобы запустить предсказание по текущим данным датчиков
          </p>
        </div>
        <button
          onClick={runInference}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#f5f5f7] border border-black/10 text-[#1d1d1f] rounded-full text-[12px] font-bold hover:bg-black/5 active:scale-95 transition-all disabled:opacity-50"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4 text-blue-500" />}
          {running ? 'Запуск анализа...' : 'Запустить ML анализ'}
        </button>
      </div>
    );
  }

  if (error === 'network') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-10 gap-4">
        <AlertTriangle className="w-10 h-10 text-orange-400" />
        <p className="text-[14px] font-bold">Нет связи с сервером</p>
        <p className="text-[11px] text-[#6e6e73] font-medium">Убедитесь что бэкенд запущен и доступен</p>
        <button onClick={fetchLatest} className="flex items-center gap-2 px-4 py-2 bg-[#f5f5f7] rounded-full text-[12px] font-bold hover:bg-black/5 transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Повторить
        </button>
      </div>
    );
  }

  const soilKey = data?.soil_state?.toLowerCase() ?? '';
  const soilTheme = SOIL_STATE_THEMES[soilKey] ?? SOIL_STATE_THEMES.moderate;
  const SoilIcon = soilTheme.icon;

  return (
    <div className="flex flex-col gap-4 p-5 pb-8 overflow-y-auto h-full scrollbar-hide">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <div className="flex items-center gap-2.5">
          <Brain className="w-4 h-4 text-[#1d1d1f]" />
          <span className="text-[11px] font-black text-[#1d1d1f] uppercase tracking-wider">ML Анализ почвы</span>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[9px] text-[#86868b] font-bold uppercase tracking-wider hidden sm:block">
              {lastRefresh.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={fetchLatest}
            disabled={loading}
            title="Обновить данные"
            className="p-1.5 hover:bg-black/5 rounded-lg transition-all active:scale-90"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#86868b]" />
          </button>
        </div>
      </div>

      {/* Soil State Card */}
      {data?.soil_state && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-5 ${soilTheme.bg} border-black/5`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl bg-white/60 ${soilTheme.color} flex items-center justify-center flex-shrink-0 border border-black/5 shadow-sm`}>
              <SoilIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-md bg-white/60 ${soilTheme.color}`}>
                СОСТОЯНИЕ ПОЧВЫ
              </span>
              <p className="text-[15px] font-bold text-[#1d1d1f] mt-1.5 capitalize">{soilTheme.label}</p>
              {data.soil_state_confidence !== null && (
                <ConfidenceBar
                  value={data.soil_state_confidence}
                  color={
                    soilKey === 'healthy' ? 'bg-green-500' :
                    soilKey === 'moderate' ? 'bg-blue-500' :
                    soilKey === 'poor' ? 'bg-orange-500' : 'bg-red-500'
                  }
                />
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Crop Recommendation */}
      {data?.crop_recommendation && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Leaf className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-green-600 px-2 py-0.5 rounded-md bg-green-50">
                РЕКОМЕНДУЕМАЯ КУЛЬТУРА
              </span>
              <p className="text-[15px] font-bold text-[#1d1d1f] mt-1.5">{data.crop_recommendation}</p>
              {data.crop_confidence !== null && (
                <ConfidenceBar value={data.crop_confidence} color="bg-green-500" />
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Fertilizer Recommendation */}
      {data?.fertilizer_recommendation && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-purple-600 px-2 py-0.5 rounded-md bg-purple-50">
                  УДОБРЕНИЕ
                </span>
                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                  data.fertilizer_source === 'ml'
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-[#f5f5f7] text-[#86868b]'
                }`}>
                  {data.fertilizer_source === 'ml' ? 'ML' : 'Правила'}
                </span>
              </div>
              <p className="text-[14px] font-bold text-[#1d1d1f]">{data.fertilizer_recommendation}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Feature Snapshot (collapsible) */}
      {data?.feature_snapshot && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
        >
          <FeatureSnapshot snapshot={data.feature_snapshot} />
        </motion.div>
      )}

      {/* Re-run inference */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-black/5 bg-[#f5f5f7] p-5 flex flex-col gap-3"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-[11px] text-[#6e6e73] leading-relaxed font-medium">
            Обновить прогноз на основе актуальных показаний датчиков
          </p>
        </div>
        <button
          onClick={runInference}
          disabled={running}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#1d1d1f] text-white rounded-xl text-[12px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
          {running ? 'Инференс...' : 'Пересчитать ML'}
        </button>
        {error && error !== 'no_data' && error !== 'network' && (
          <p className="text-[11px] text-red-500 font-medium text-center">{error}</p>
        )}
      </motion.div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-1">
        <ShieldCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        <p className="text-[10px] text-[#6e6e73] font-medium">
          Модели: crop (RF), fertilizer (RF), soil_state — SoilLink v4
        </p>
      </div>
      {data?.timestamp && (
        <p className="text-[9px] text-[#86868b] font-bold text-center uppercase tracking-wider -mt-2">
          Последний прогноз: {new Date(data.timestamp).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
}
