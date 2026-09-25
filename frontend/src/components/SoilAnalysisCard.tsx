import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Droplets, Thermometer, Wind, Sprout, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SoilAnalysisProps {
  fieldId: string;
}

/** Пункт вывода в виде кода — бэкенд отдаёт его рядом с готовой строкой. */
interface CodedItem {
  code: string;
  params?: Record<string, string | number>;
}

interface AnalysisData {
  texture: string;
  ph: number;
  ph_status: string;
  organic_carbon_percent: number;
  organic_carbon_status: string;
  limitations: string[];
  recommendations: string[];
  // Появились вместе с локализацией; у старого бэкенда их нет — тогда берём строки выше
  texture_code?: string;
  ph_status_code?: string;
  organic_carbon_status_code?: string;
  limitation_codes?: CodedItem[];
  recommendation_codes?: CodedItem[];
}

export function SoilAnalysisCard({ fieldId }: SoilAnalysisProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/fields/${fieldId}/analysis`);
        if (!res.ok) throw new Error(t('soilCard.loadError'));
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(t('soilCard.fetchError'));
      } finally {
        setLoading(false);
      }
    }

    if (fieldId) {
      fetchAnalysis();
    }
  }, [fieldId]);

  if (loading) {
    return (
      <div className="bg-black/40 backdrop-blur-md rounded-3xl p-6 border border-white/10 animate-pulse">
        <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-white/10 rounded w-3/4"></div>
          <div className="h-4 bg-white/10 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-black/40 backdrop-blur-md rounded-3xl p-6 border border-red-500/30">
        <div className="flex items-center space-x-3 text-red-400">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Цвет по коду; на старом бэкенде кода нет — разбираем русский статус, как раньше
  const phColor = (() => {
    const code = data.ph_status_code;
    if (code) {
      if (code === 'strongly_acidic' || code === 'slightly_acidic') return 'text-red-400';
      if (code === 'neutral') return 'text-green-400';
      return 'text-yellow-400';
    }
    if (data.ph_status.includes('кислая')) return 'text-red-400';
    if (data.ph_status.includes('Нейтральная')) return 'text-green-400';
    return 'text-yellow-400';
  })();

  const coded = (group: string, item: CodedItem) => t(`soilAnalysis.${group}.${item.code}`, item.params);
  const texture = data.texture_code ? t(`soilAnalysis.texture.${data.texture_code}`) : data.texture;
  const phStatus = data.ph_status_code ? t(`soilAnalysis.phStatus.${data.ph_status_code}`) : data.ph_status;
  const socStatus = data.organic_carbon_status_code
    ? t(`soilAnalysis.socStatus.${data.organic_carbon_status_code}`)
    : data.organic_carbon_status;
  const limitations = data.limitation_codes
    ? data.limitation_codes.map(i => coded('limitation', i))
    : data.limitations;
  const recommendations = data.recommendation_codes
    ? data.recommendation_codes.map(i => coded('recommendation', i))
    : data.recommendations;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl"
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-indigo-500/20 rounded-2xl">
          <Sprout className="text-indigo-400" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-medium text-white">{t('soilCard.title')}</h2>
          <p className="text-white/60 text-sm">{t('soilCard.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded-2xl p-4">
          <p className="text-white/50 text-xs mb-1">{t('soilCard.soilType')}</p>
          <p className="text-white font-medium">{texture}</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4">
          <p className="text-white/50 text-xs mb-1">{t('soilCard.acidity')}</p>
          <p className={`font-medium ${phColor}`}>
            {data.ph} <span className="text-xs opacity-70">({phStatus})</span>
          </p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4">
          <p className="text-white/50 text-xs mb-1">{t('soilCard.organicCarbon')}</p>
          <p className="text-white font-medium">
            {data.organic_carbon_percent}% <span className="text-xs opacity-70">({socStatus})</span>
          </p>
        </div>
      </div>

      {limitations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-white/80 text-sm font-medium mb-3 flex items-center">
            <AlertTriangle size={16} className="text-yellow-500 mr-2" /> {t('soilCard.riskFactors')}
          </h3>
          <ul className="space-y-2">
            {limitations.map((limit, idx) => (
              <li key={idx} className="text-yellow-200/80 text-sm bg-yellow-500/10 p-3 rounded-xl">
                {limit}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-white/80 text-sm font-medium mb-3 flex items-center">
          <CheckCircle2 size={16} className="text-green-500 mr-2" /> {t('soilCard.recommendations')}
        </h3>
        <ul className="space-y-2">
          {recommendations.map((rec, idx) => (
            <li key={idx} className="text-green-200/80 text-sm bg-green-500/10 p-3 rounded-xl border border-green-500/20">
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
