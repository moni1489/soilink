import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Thermometer, Wind, Sprout, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SoilAnalysisProps {
  fieldId: string;
}

interface AnalysisData {
  texture: string;
  ph: number;
  ph_status: string;
  organic_carbon_percent: number;
  organic_carbon_status: string;
  limitations: string[];
  recommendations: string[];
}

export function SoilAnalysisCard({ fieldId }: SoilAnalysisProps) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/fields/${fieldId}/analysis`);
        if (!res.ok) throw new Error('Ошибка загрузки данных');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError('Не удалось загрузить анализ почвы. Убедитесь, что сервер запущен.');
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

  const getPhColor = (status: string) => {
    if (status.includes('кислая')) return 'text-red-400';
    if (status.includes('Нейтральная')) return 'text-green-400';
    return 'text-yellow-400';
  };

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
          <h2 className="text-xl font-medium text-white">Агрономический Анализ</h2>
          <p className="text-white/60 text-sm">На основе данных SoilGrids (0-5 см)</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded-2xl p-4">
          <p className="text-white/50 text-xs mb-1">Тип почвы</p>
          <p className="text-white font-medium">{data.texture}</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4">
          <p className="text-white/50 text-xs mb-1">Кислотность (pH)</p>
          <p className={`font-medium ${getPhColor(data.ph_status)}`}>
            {data.ph} <span className="text-xs opacity-70">({data.ph_status})</span>
          </p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4">
          <p className="text-white/50 text-xs mb-1">Органический Углерод</p>
          <p className="text-white font-medium">
            {data.organic_carbon_percent}% <span className="text-xs opacity-70">({data.organic_carbon_status})</span>
          </p>
        </div>
      </div>

      {data.limitations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-white/80 text-sm font-medium mb-3 flex items-center">
            <AlertTriangle size={16} className="text-yellow-500 mr-2" /> Факторы риска
          </h3>
          <ul className="space-y-2">
            {data.limitations.map((limit, idx) => (
              <li key={idx} className="text-yellow-200/80 text-sm bg-yellow-500/10 p-3 rounded-xl">
                {limit}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-white/80 text-sm font-medium mb-3 flex items-center">
          <CheckCircle2 size={16} className="text-green-500 mr-2" /> Рекомендации
        </h3>
        <ul className="space-y-2">
          {data.recommendations.map((rec, idx) => (
            <li key={idx} className="text-green-200/80 text-sm bg-green-500/10 p-3 rounded-xl border border-green-500/20">
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
