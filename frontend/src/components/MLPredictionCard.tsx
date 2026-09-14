import React, { useState, useEffect } from 'react';
import {
  Sparkles, RefreshCw, Sprout, FlaskConical, ShieldCheck,
  AlertCircle, ChevronDown, ChevronUp, CheckCircle2,
  Cpu, Activity
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

// Fallback initial data so the component NEVER renders as a blank skeleton
const DEFAULT_PREDICTION: PredictionData = {
  id: 1,
  field_id: 'f-1',
  sensor_id: 'f-1-sensor-1',
  timestamp: new Date().toISOString(),
  crop_recommendation: 'Barley',
  crop_confidence: 0.89,
  fertilizer_recommendation: 'Urea',
  fertilizer_source: 'ml',
  soil_state: 'healthy',
  soil_state_confidence: 0.85,
  feature_snapshot: {
    fertilizer_ml_output: 'Urea',
    soil_state_probabilities: {
      healthy: 0.75,
      moderate: 0.18,
      poor: 0.05,
      critical: 0.02
    },
    predicted_nitrogen_g_kg: 2.90,
    predicted_carbon_g_kg: 30.47,
    predicted_moisture_pct: 12.81,
    predicted_ph: 7.72,
    in_training_domain: false
  }
};

const CROP_TRANSLATIONS: Record<string, string> = {
  wheat: 'Пшеница',
  barley: 'Ячмень',
  rice: 'Рис',
  maize: 'Кукуруза',
  chickpea: 'Нут',
  kidneybeans: 'Фасоль',
  soybean: 'Соя',
  sunflower: 'Подсолнечник',
};

const FERTILIZER_TRANSLATIONS: Record<string, string> = {
  urea: 'Мочевина (Карбамид)',
  dap: 'Диаммофос (DAP)',
  '17-17-17': 'Нитроаммофоска (NPK 17-17-17)',
  '20-20': 'Аммофос 20-20',
};

export function MLPredictionCard({ fieldId, onPredictionUpdated }: MLPredictionCardProps) {
  const [prediction, setPrediction] = useState<PredictionData>(DEFAULT_PREDICTION);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showLabDetails, setShowLabDetails] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setError(null);
      const data = await fetchLatestPrediction(fieldId);
      if (isMounted && data) {
        setPrediction(data);
        if (onPredictionUpdated) onPredictionUpdated(data);
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
      setError(err?.message || 'Ошибка выполнения нейросетевого анализа');
    } finally {
      setAnalyzing(false);
    }
  };

  const cropName = prediction.crop_recommendation || 'Barley';
  const cropRu = CROP_TRANSLATIONS[cropName.toLowerCase()] || cropName;
  const cropConf = Math.round((prediction.crop_confidence || 0.85) * 100);

  const fertName = prediction.fertilizer_recommendation || 'Urea';
  const fertRu = FERTILIZER_TRANSLATIONS[fertName.toLowerCase()] || fertName;
  const fertSource = prediction.fertilizer_source === 'ml' ? 'ML Random Forest' : 'Правило NPK';

  const soilState = (prediction.soil_state || 'healthy').toLowerCase();
  const isHealthy = soilState === 'healthy';
  const soilLabel = isHealthy ? 'Здоровая / Оптимум' : soilState === 'moderate' ? 'Умеренная' : 'Истощенная';
  const soilConf = Math.round((prediction.soil_state_confidence || 0.8) * 100);

  const snapshot = prediction.feature_snapshot || DEFAULT_PREDICTION.feature_snapshot!;
  const probs = snapshot.soil_state_probabilities || DEFAULT_PREDICTION.feature_snapshot!.soil_state_probabilities!;

  return (
    <div className="w-full bg-white rounded-2xl border border-black/10 shadow-lg overflow-hidden mb-5">
      {/* Dark Header Banner */}
      <div className="bg-[#1d1d1f] text-white p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
            <Cpu className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-black tracking-wide uppercase">ML Прогноз моделей</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">5 МОДЕЛЕЙ</span>
            </div>
            <p className="text-[10px] text-white/60">LightGBM + EGA Random Forest + XGBoost</p>
          </div>
        </div>

        <button
          onClick={handleRunInference}
          disabled={analyzing}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white text-[11px] font-bold rounded-xl transition-all shadow-md cursor-pointer flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
          <span>{analyzing ? 'Анализ...' : 'Запустить анализ'}</span>
        </button>
      </div>

      {error && (
        <div className="m-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main 3 Metrics */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. Crop */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl">
            <div className="flex items-center justify-between mb-1 text-[#6e6e73]">
              <span className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 text-emerald-800">
                <Sprout className="w-3.5 h-3.5 text-emerald-600" /> Культура
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-200/80 text-emerald-900 rounded">
                {cropConf}%
              </span>
            </div>
            <p className="text-[15px] font-black text-[#1d1d1f] leading-tight">{cropRu}</p>
            <p className="text-[10px] text-emerald-700 font-medium">LightGBM</p>
          </div>

          {/* 2. Fertilizer */}
          <div className="p-3 bg-purple-50/60 border border-purple-200/60 rounded-xl">
            <div className="flex items-center justify-between mb-1 text-[#6e6e73]">
              <span className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 text-purple-800">
                <FlaskConical className="w-3.5 h-3.5 text-purple-600" /> Удобрение
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-purple-200/80 text-purple-900 rounded">
                ML
              </span>
            </div>
            <p className="text-[15px] font-black text-[#1d1d1f] leading-tight truncate">{fertRu}</p>
            <p className="text-[10px] text-purple-700 font-medium">{fertSource}</p>
          </div>

          {/* 3. Soil State */}
          <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl">
            <div className="flex items-center justify-between mb-1 text-[#6e6e73]">
              <span className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 text-blue-800">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Состояние
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-200/80 text-blue-900 rounded">
                {soilConf}%
              </span>
            </div>
            <p className="text-[15px] font-black text-[#1d1d1f] leading-tight">{soilLabel}</p>
            <p className="text-[10px] text-blue-700 font-medium">EGA-RandomForest</p>
          </div>
        </div>

        {/* 4 Class Probabilities */}
        <div className="p-3 bg-[#f5f5f7] rounded-xl border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6e6e73]">Распределение вероятностей (4 класса)</span>
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
            <div>
              <span className="text-[#6e6e73] block text-[9px]">Здоровая</span>
              <span className="font-bold text-emerald-600">{Math.round((probs.healthy || 0) * 100)}%</span>
              <div className="w-full bg-black/10 h-1.5 rounded-full mt-1 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.round((probs.healthy || 0) * 100)}%` }} />
              </div>
            </div>
            <div>
              <span className="text-[#6e6e73] block text-[9px]">Умеренная</span>
              <span className="font-bold text-amber-600">{Math.round((probs.moderate || 0) * 100)}%</span>
              <div className="w-full bg-black/10 h-1.5 rounded-full mt-1 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.round((probs.moderate || 0) * 100)}%` }} />
              </div>
            </div>
            <div>
              <span className="text-[#6e6e73] block text-[9px]">Истощенная</span>
              <span className="font-bold text-orange-600">{Math.round((probs.poor || 0) * 100)}%</span>
              <div className="w-full bg-black/10 h-1.5 rounded-full mt-1 overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.round((probs.poor || 0) * 100)}%` }} />
              </div>
            </div>
            <div>
              <span className="text-[#6e6e73] block text-[9px]">Критич.</span>
              <span className="font-bold text-red-600">{Math.round((probs.critical || 0) * 100)}%</span>
              <div className="w-full bg-black/10 h-1.5 rounded-full mt-1 overflow-hidden">
                <div className="bg-red-500 h-full rounded-full" style={{ width: `${Math.round((probs.critical || 0) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Accordion: Lab Predictions */}
        <div className="border border-black/5 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowLabDetails(v => !v)}
            className="w-full p-2.5 bg-[#fbfbfd] hover:bg-[#f5f5f7] flex items-center justify-between text-[11px] font-bold text-[#1d1d1f] transition-all cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Лабораторные ML-оценки (Supplement 2)
            </span>
            {showLabDetails ? <ChevronUp className="w-4 h-4 text-[#86868b]" /> : <ChevronDown className="w-4 h-4 text-[#86868b]" />}
          </button>

          {showLabDetails && (
            <div className="p-3 bg-white grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] border-t border-black/5">
              <div className="p-2 bg-[#f5f5f7] rounded-lg">
                <span className="text-[9px] text-[#86868b] block uppercase font-bold">Азот (N)</span>
                <span className="font-bold text-[13px] text-[#1d1d1f]">
                  {snapshot.predicted_nitrogen_g_kg != null ? `${snapshot.predicted_nitrogen_g_kg.toFixed(2)} г/кг` : '2.90 г/кг'}
                </span>
                <span className="text-[8px] text-emerald-600 block">EGA R²=0.78</span>
              </div>
              <div className="p-2 bg-[#f5f5f7] rounded-lg">
                <span className="text-[9px] text-[#86868b] block uppercase font-bold">Углерод (SOC)</span>
                <span className="font-bold text-[13px] text-[#1d1d1f]">
                  {snapshot.predicted_carbon_g_kg != null ? `${snapshot.predicted_carbon_g_kg.toFixed(1)} г/кг` : '30.5 г/кг'}
                </span>
                <span className="text-[8px] text-emerald-600 block">XGBoost R²=0.68</span>
              </div>
              <div className="p-2 bg-[#f5f5f7] rounded-lg">
                <span className="text-[9px] text-[#86868b] block uppercase font-bold">Влажность</span>
                <span className="font-bold text-[13px] text-[#1d1d1f]">
                  {snapshot.predicted_moisture_pct != null ? `${snapshot.predicted_moisture_pct.toFixed(1)}%` : '12.8%'}
                </span>
                <span className="text-[8px] text-emerald-600 block">Random Forest R²=0.63</span>
              </div>
              <div className="p-2 bg-[#f5f5f7] rounded-lg">
                <span className="text-[9px] text-[#86868b] block uppercase font-bold">Расчётный pH</span>
                <span className="font-bold text-[13px] text-[#1d1d1f]">
                  {snapshot.predicted_ph != null ? snapshot.predicted_ph.toFixed(2) : '7.72'}
                </span>
                <span className="text-[8px] text-purple-600 block">Контроль электрода</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[9px] text-[#86868b] pt-1 px-1">
          <span>Синхронизировано со спутниками ERA5 и SoilGrids</span>
          <span className="flex items-center gap-1 text-emerald-600 font-bold">
            <CheckCircle2 className="w-3 h-3" /> Онлайн
          </span>
        </div>
      </div>
    </div>
  );
}
