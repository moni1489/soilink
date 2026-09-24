import { format } from 'date-fns';
import type { Field } from '@/types';
import { sensors, predictions as demoPredictions, mockScannerData } from '@/data/mockData';
import type { PredictionData } from './predictionService';

export type ExportDataset = 'sensors' | 'profile' | 'predictions';
export type ExportFormat = 'csv' | 'json';

type Cell = string | number | boolean | null | undefined;
type Row = Record<string, Cell>;

export const DATASETS: Record<ExportDataset, { label: string; description: string; file: string }> = {
  sensors:     { label: 'Показания датчиков', description: 'pH, NPK, Mg, органический углерод, влажность, температура, ЭП, заряд', file: 'soil-sensors' },
  profile:     { label: 'Почвенный профиль',  description: 'SoilGrids по глубинам 0–100 см: pH, азот, углерод, гранулометрия, плотность', file: 'soil-profile' },
  predictions: { label: 'Предсказания ML',    description: 'Культура, удобрения, состояние почвы, прогноз N/C/влажности/pH, вероятности', file: 'ml-predictions' },
};

const STATUS_RU: Record<string, string> = { healthy: 'норма', warning: 'внимание', critical: 'критично' };
const SOIL_STATE_RU: Record<string, string> = { healthy: 'здоровое', moderate: 'умеренное', poor: 'плохое', critical: 'критическое' };
const DEPTHS = ['0-5cm', '5-15cm', '15-30cm', '30-60cm', '60-100cm'] as const;
const apiUrl = () => import.meta.env.VITE_API_URL || '';

const round = (v: number | null | undefined, digits = 2) =>
  v == null || Number.isNaN(v) ? null : Math.round(v * 10 ** digits) / 10 ** digits;

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${apiUrl()}${path}`);
    return res.ok ? await res.json() as T : null;
  } catch {
    return null;
  }
}

function sensorRows(fields: Field[]): Row[] {
  return fields.flatMap(field => sensors.filter(s => s.fieldId === field.id).map(s => ({
    'Поле': field.name,
    'ID датчика': s.id,
    'Датчик': s.name,
    'Широта': round(s.coordinates.latitude, 5),
    'Долгота': round(s.coordinates.longitude, 5),
    'Статус': STATUS_RU[s.status] ?? s.status,
    'Обновлено': format(new Date(s.lastUpdated), 'yyyy-MM-dd HH:mm'),
    'pH': round(s.pH),
    'Азот N, мг/кг': s.nitrogen,
    'Фосфор P, мг/кг': s.phosphorus,
    'Калий K, мг/кг': s.potassium,
    'Магний Mg, мг/кг': s.magnesium,
    'Орг. углерод SOC, %': round(s.soc),
    'Температура почвы, °C': round(s.soilTemperature, 1),
    'Влажность почвы, %': s.soilMoisture,
    'ЭП, мСм/см': round(s.electricalConductivity),
    'Газовый состав': s.gasComposition,
    'Заряд, %': s.battery,
    'Сигнал, %': s.signalStrength,
  })));
}

// SoilGrids отдаёт целые числа в «сырых» единицах — переводим в привычные
async function profileRows(fields: Field[]): Promise<Row[]> {
  const rows: Row[] = [];
  for (const field of fields) {
    const api = await getJson<Record<string, Record<string, number | null>>>(`/api/fields/${field.id}/scanner`);
    const data = api ?? mockScannerData;
    for (const depth of DEPTHS) {
      const d = data[depth] ?? {};
      const scale = (key: string, div: number) => d[key] == null ? null : round(d[key]! / div);
      rows.push({
        'Поле': field.name,
        'Глубина': depth.replace('cm', ' см'),
        'pH (H₂O)': scale('phh2o', 10),
        'Азот, г/кг': scale('nitrogen', 100),
        'Орг. углерод, г/кг': scale('soc', 10),
        'Глина, %': scale('clay_content', 10),
        'Песок, %': scale('sand_content', 10),
        'Пыль, %': scale('silt_content', 10),
        'Плотность, г/см³': scale('bdod', 100),
        'ЕКО, ммоль/кг': d.cec ?? null,
        'Источник': api ? 'SoilGrids (API)' : 'демо-данные',
      });
    }
  }
  return rows;
}

async function predictionRows(fields: Field[]): Promise<Row[]> {
  const rows: Row[] = [];
  for (const field of fields) {
    const p = await getJson<PredictionData>(`/api/predictions/latest?field_id=${encodeURIComponent(field.id)}`);
    if (p) {
      const snap = p.feature_snapshot ?? {};
      const probs = snap.soil_state_probabilities ?? {};
      rows.push({
        'Поле': field.name,
        'Дата прогноза': format(new Date(p.timestamp), 'yyyy-MM-dd HH:mm'),
        'ID датчика': p.sensor_id,
        'Рекомендуемая культура': p.crop_recommendation,
        'Уверенность (культура)': round(p.crop_confidence),
        'Удобрение': p.fertilizer_recommendation,
        'Источник удобрения': p.fertilizer_source === 'ml' ? 'ML-модель' : p.fertilizer_source === 'rule_based' ? 'правила' : p.fertilizer_source,
        'Состояние почвы': p.soil_state && (SOIL_STATE_RU[p.soil_state] ?? p.soil_state),
        'Уверенность (состояние)': round(p.soil_state_confidence),
        'P(критическое)': round(probs.critical),
        'P(плохое)': round(probs.poor),
        'P(умеренное)': round(probs.moderate),
        'P(здоровое)': round(probs.healthy),
        'Прогноз азота, г/кг': round(snap.predicted_nitrogen_g_kg),
        'Прогноз углерода, г/кг': round(snap.predicted_carbon_g_kg),
        'Прогноз влажности, %': round(snap.predicted_moisture_pct),
        'Прогноз pH': round(snap.predicted_ph),
        'В домене обучения': snap.in_training_domain,
        'Источник': 'ML (API)',
      });
      continue;
    }
    const demo = demoPredictions.find(d => d.fieldId === field.id);
    if (demo) {
      rows.push({
        'Поле': field.name,
        'Дата прогноза': format(new Date(demo.lastUpdated), 'yyyy-MM-dd HH:mm'),
        'Рекомендуемая культура': demo.cropRecommendation,
        'Уверенность (культура)': demo.cropConfidence,
        'Удобрение': demo.fertilizerRecommendation,
        'Источник удобрения': demo.fertilizerSource === 'ml' ? 'ML-модель' : 'правила',
        'Состояние почвы': demo.soilState,
        'Уверенность (состояние)': demo.soilStateConfidence,
        'Источник': 'демо-данные',
      });
    } else {
      rows.push({ 'Поле': field.name, 'Источник': 'нет прогноза' });
    }
  }
  return rows;
}

// Excel с русской локалью: разделитель «;», десятичная запятая, UTF-8 с BOM
function toCsv(rows: Row[]): string {
  const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const cell = (v: Cell) => {
    if (v == null) return '';
    if (typeof v === 'boolean') return v ? 'да' : 'нет';
    const s = typeof v === 'number' ? String(v).replace('.', ',') : v;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [headers.map(cell), ...rows.map(r => headers.map(h => cell(r[h])))]
    .map(line => line.join(';')).join('\r\n');
}

function download(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Собирает набор данных по полям и скачивает файл. Возвращает число строк. */
export async function exportDataset(dataset: ExportDataset, fields: Field[], fmt: ExportFormat, exportedBy: string) {
  const rows =
    dataset === 'sensors' ? sensorRows(fields)
    : dataset === 'profile' ? await profileRows(fields)
    : await predictionRows(fields);

  const scope = fields.length === 1 ? fields[0].id : 'all-fields';
  const filename = `soilink_${DATASETS[dataset].file}_${scope}_${format(new Date(), 'yyyy-MM-dd')}.${fmt}`;

  if (fmt === 'csv') {
    download(toCsv(rows), filename, 'text/csv;charset=utf-8');
  } else {
    const payload = {
      dataset,
      title: DATASETS[dataset].label,
      exportedAt: new Date().toISOString(),
      exportedBy,
      fields: fields.map(f => ({ id: f.id, name: f.name, areaHectares: f.areaHectares, center: f.center })),
      rows,
    };
    download(JSON.stringify(payload, null, 2), filename, 'application/json');
  }
  return rows.length;
}
