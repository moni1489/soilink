import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, RefreshCw, Sprout, FlaskConical, ShieldCheck,
  AlertCircle, ChevronDown, ChevronUp, CheckCircle2,
  Droplets, Flame, Compass, Cpu, Activity
} from 'lucide-react';
import {
  fetchLatestPrediction,
  runPrediction,
  type PredictionData
} from '@/services/predictionService';

interface MLPredictionCardProps {
  fieldId: string;
  onPredictionUpdated?: (pred: PredictionData) => void;
}

const CROP_TRANSLATIONS: Record<string, string> = {
  wheat: 'Пшеница',
  barley: 'Ячмень',
  rice: 'Рис',
  maize: 'Кукуруза',
  chickpea: 'Нут',
  kidneybeans: 'Фасоль',
  pigeonpeas: 'Горох голубиный',
  mothbeans: 'Бобы мотыльковые',
  mungbean: 'Маш',
  blackgram: 'Урд',
  lentil: 'Чечевица',
  pomegranate: 'Гранат',
  banana: 'Банан',
  mango: 'Манго',
  grapes: 'Виноград',
  watermelon: 'Арбуз',
  muskmelon: 'Дыня',
  apple: 'Яблоня',
  orange: 'Апельсин',
  papaya: 'Папайя',
  coconut: 'Кокос',
  cotton: 'Хлопчатник',
  jute: 'Джут',
  coffee: 'Кофе',
};

const FERTILIZER_TRANSLATIONS: Record<string, string> = {
  urea: 'Мочевина (Карбамид)',
  dap: 'Диаммофос (DAP)',
  '14-35-14': 'Комплекс NPK 14-35-14',
  '28-28': 'Азотно-фосфорное 28-28',
  '17-17-17': 'Нитроаммофоска 17-17-17',
  '20-20': 'Аммофос 20-20',
  '10-26-26': 'NPK 10-26-26',
};

const SOIL_STATE_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  healthy: { label: 'Здоровая / Оптимум', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  moderate: { label: 'Умеренное состояние', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  poor: { label: 'Истощенная почва', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  critical: { label: 'Критическая деградация', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

export function MLPredictionCard({ fieldId, onPredictionUpdated }: MLPredictionCardProps) {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showLabDetails, setShowLabDetails] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      const data = await fetchLatestPrediction(fieldId);
      if (isMounted) {
        setPrediction(data);
        if (data && onPredictionUpdated) onPredictionUpdated(data);
        setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [fieldId]);

  const handleRunInference = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const updated = await runPrediction(fieldId);
      setPrediction(updated);
      if (onPredictionUpdated) onPredictionUpdated(updated);
    } catch (err: any) {
      setError(err?.message || 'Ошибка запуска инференса');
    } finally {
      setAnalyzing(false);
    }
  };

  const cropName = prediction?.crop_recommendation || '';
  const cropRu = CROP_TRANSLATIONS[cropName.toLowerCase()] || cropName || 'Не определено';
  const cropConf = Math.round((prediction?.crop_confidence || 0) * 100);

  const fertName = prediction?.fertilizer_recommendation || '';
  const fertRu = FERTILIZER_TRANSLATIONS[fertName.toLowerCase()] || fertName || 'Не определено';
  const fertSource = prediction?.fertilizer_source === 'ml' ? 'ML Random Forest' : 'Правило NPK';

  const soilStateKey = (prediction?.soil_state || 'moderate').toLowerCase();
  const soilState = SOIL_STATE_MAP[soilStateKey] || SOIL_STATE_MAP.moderate;
  const soilConf = Math.round((prediction?.soil_state_confidence || 0) * 100);

  const snapshot = prediction?.feature_snapshot;
  const probs = snapshot?.soil_state_probabilities;

  return (
    <div className="bg-white rounded-2xl border border-black/10 shadow-pro overflow-hidden mb-6">
      {/* Top Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-[#1d1d1f] to-[#2d2d30] text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-black uppercase tracking-wider">Нейросетевой анализ</span>
              <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                5 МОДЕЛЕЙ
              </span>
            </div>
            <p className="text-[10px] text-white/60">ERA5 климат + SoilGrids + транссект Supplement 2</p>
          </div>
        </div>

        <button
          onClick={handleRunInference}
          disabled={analyzing}
          title="Запустить инференс всех 5 моделей с датчиков и спутников"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#1d1d1f] hover:bg-white/90 active:scale-95 disabled:opacity-50 text-[11px] font-bold rounded-xl shadow-sm transition-all flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin text-emerald-600' : ''}`} />
          <span>{analyzing ? 'Расчёт...' : 'Запустить анализ'}</span>
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-[12px]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-6 space-y-3 animate-pulse">
          <div className="h-4 bg-black/5 rounded w-1/2" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-20 bg-black/5 rounded-xl" />
            <div className="h-20 bg-black/5 rounded-xl" />
            <div className="h-20 bg-black/5 rounded-xl" />
          </div>
        </div>
      ) : !prediction ? (
        <div className="p-6 text-center text-[#6e6e73]">
          <Sparkles className="w-8 h-8 mx-auto text-black/20 mb-2" />
          <p className="text-[13px] font-semibold text-[#1d1d1f]">Прогноз еще не рассчитывался</p>
          <p className="text-[11px] text-[#86868b] mt-1 mb-4">Нажмите кнопку ниже, чтобы запустить нейросетевой расчет по показаниям поля</p>
          <button
            onClick={handleRunInference}
            disabled={analyzing}
            className="px-4 py-2 bg-[#1d1d1f] text-white rounded-xl text-[12px] font-bold hover:bg-black transition-all active:scale-95"
          >
            {analyzing ? 'Идет расчет...' : 'Запустить первый расчет'}
          </button>
        </div>
      ) : (
        <div className="p-5">
          {/* Main 3 Predicted Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {/* Card 1: Crop */}
            <div className="p-3.5 rounded-xl bg-[#f5f5f7] border border-black/5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-[#86868b]">
                  <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Культура</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100/80 text-emerald-800">
                  {cropConf}% точн.
                </span>
              </div>
              <div>
                <p className="text-[15px] font-black text-[#1d1d1f] leading-snug">{cropRu}</p>
                <p className="text-[10px] text-[#86868b] font-medium">{cropName}</p>
              </div>
              <div className="w-full bg-black/5 h-1 rounded-full overflow-hidden mt-2.5">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${cropConf}%` }} />
              </div>
            </div>

            {/* Card 2: Fertilizer */}
            <div className="p-3.5 rounded-xl bg-[#f5f5f7] border border-black/5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-[#86868b]">
                  <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Удобрение</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100/80 text-purple-800">
                  {fertSource}
                </span>
              </div>
              <div>
                <p className="text-[15px] font-black text-[#1d1d1f] leading-snug">{fertRu}</p>
                <p className="text-[10px] text-[#86868b] font-medium">{fertName}</p>
              </div>
              <div className="mt-2.5 flex items-center gap-1 text-[9px] font-bold text-[#86868b]">
                <CheckCircle2 className="w-3 h-3 text-purple-500" />
                <span>Оптимально под культуру</span>
              </div>
            </div>

            {/* Card 3: Soil State */}
            <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${soilState.bg} ${soilState.border}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-[#86868b]">
                  <ShieldCheck className={`w-3.5 h-3.5 ${soilState.color}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Почва</span>
                </div>
                {soilConf > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/80 ${soilState.color}`}>
                    {soilConf}%
                  </span>
                )}
              </div>
              <div>
                <p className={`text-[14px] font-black leading-snug ${soilState.color}`}>{soilState.label}</p>
                <p className="text-[10px] text-[#86868b] font-medium capitalize">{soilStateKey}</p>
              </div>
              <div className="w-full bg-black/5 h-1 rounded-full overflow-hidden mt-2.5">
                <div className="bg-current h-full rounded-full transition-all duration-500" style={{ width: `${soilConf || 60}%` }} />
              </div>
            </div>
          </div>

          {/* Probabilities Distribution */}
          {probs && (
            <div className="p-3 bg-[#fbfbfd] border border-black/5 rounded-xl mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868b]">Вероятности состояния почвы</span>
                <span className="text-[9px] font-bold text-[#86868b]">EGA-RandomForest (10 признаков)</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { key: 'healthy', label: 'Здоровая', val: probs.healthy || 0, color: 'bg-emerald-500' },
                  { key: 'moderate', label: 'Умеренная', val: probs.moderate || 0, color: 'bg-amber-500' },
                  { key: 'poor', label: 'Истощенная', val: probs.poor || 0, color: 'bg-orange-500' },
                  { key: 'critical', label: 'Критическая', val: probs.critical || 0, color: 'bg-red-500' },
                ].map(p => (
                  <div key={p.key} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#6e6e73] truncate">{p.label}</span>
                      <span className="font-bold font-data">{Math.round(p.val * 100)}%</span>
                    </div>
                    <div className="w-full bg-black/5 h-1 rounded-full overflow-hidden">
                      <div className={`${p.color} h-full rounded-full`} style={{ width: `${Math.round(p.val * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toggle Lab Details Accordion */}
          <button
            onClick={() => setShowLabDetails(v => !v)}
            className="w-full py-2 px-3 text-[11px] font-bold text-[#0071e3] hover:text-[#0077ed] flex items-center justify-between bg-blue-50/50 hover:bg-blue-50 rounded-xl transition-all"
          >
            <span>Лабораторные ML-оценки (модели Supplement 2)</span>
            {showLabDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {showLabDetails && snapshot && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-[#f5f5f7] rounded-xl border border-black/5 text-[11px]">
                  <div className="flex flex-col">
                    <span className="text-[#86868b] text-[10px] uppercase font-bold">Общий азот (N)</span>
                    <span className="font-bold text-[14px] text-[#1d1d1f] font-data">
                      {snapshot.predicted_nitrogen_g_kg != null ? `${snapshot.predicted_nitrogen_g_kg.toFixed(2)} г/кг` : '—'}
                    </span>
                    <span className="text-[9px] text-[#86868b]">EGA R²=0.78</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[#86868b] text-[10px] uppercase font-bold">Углерод (SOC)</span>
                    <span className="font-bold text-[14px] text-[#1d1d1f] font-data">
                      {snapshot.predicted_carbon_g_kg != null ? `${snapshot.predicted_carbon_g_kg.toFixed(1)} г/кг` : '—'}
                    </span>
                    <span className="text-[9px] text-[#86868b]">XGBoost R²=0.68</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[#86868b] text-[10px] uppercase font-bold">Расч. влажность</span>
                    <span className="font-bold text-[14px] text-[#1d1d1f] font-data">
                      {snapshot.predicted_moisture_pct != null ? `${snapshot.predicted_moisture_pct.toFixed(1)}%` : '—'}
                    </span>
                    <span className="text-[9px] text-[#86868b]">RF R²=0.63</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[#86868b] text-[10px] uppercase font-bold">Расчётный pH</span>
                    <span className="font-bold text-[14px] text-[#1d1d1f] font-data">
                      {snapshot.predicted_ph != null ? snapshot.predicted_ph.toFixed(2) : '—'}
                    </span>
                    <span className="text-[9px] text-[#86868b]">Контроль электрода</span>
                  </div>
                </div>

                {snapshot.in_training_domain === false && (
                  <p className="text-[10px] text-[#86868b] mt-2 px-1 italic">
                    * Поле расположено за границами эталонного транссекта Петропавловск-Тараз. К уверенности прогноза применена поправка на экстраполяцию.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-3 flex items-center justify-between text-[10px] text-[#86868b] px-1">
            <span>ID расчёта: #{prediction.id}</span>
            <span>{new Date(prediction.timestamp).toLocaleString('ru', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
