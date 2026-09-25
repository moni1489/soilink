import { format } from 'date-fns';
import type { TFunction } from 'i18next';
import type { Field } from '@/types';
import { sensors, predictions as demoPredictions, mockScannerData } from '@/data/mockData';
import type { PredictionData } from './predictionService';

export type ExportDataset = 'sensors' | 'profile' | 'predictions';
export type ExportFormat = 'csv' | 'json';

type Cell = string | number | boolean | null | undefined;
type Row = Record<string, Cell>;

export const DATASETS: Record<ExportDataset, { labelKey: string; descriptionKey: string; file: string }> = {
  sensors:     { labelKey: 'export.datasets.sensors.label',     descriptionKey: 'export.datasets.sensors.description',     file: 'soil-sensors' },
  profile:     { labelKey: 'export.datasets.profile.label',     descriptionKey: 'export.datasets.profile.description',     file: 'soil-profile' },
  predictions: { labelKey: 'export.datasets.predictions.label', descriptionKey: 'export.datasets.predictions.description', file: 'ml-predictions' },
};

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

/** Переводит статус/состояние, пришедшее кодом; неизвестное значение отдаём как есть. */
const translateCode = (t: TFunction, group: string, code: string | null | undefined) => {
  if (!code) return code ?? null;
  const key = `export.${group}.${code}`;
  const value = t(key);
  return value === key ? code : value;
};

function sensorRows(t: TFunction, fields: Field[]): Row[] {
  const h = (k: string) => t(`export.h.${k}`);
  return fields.flatMap(field => sensors.filter(s => s.fieldId === field.id).map(s => ({
    [h('field')]: t(field.nameKey),
    [h('sensorId')]: s.id,
    [h('sensor')]: t(s.nameKey),
    [h('lat')]: round(s.coordinates.latitude, 5),
    [h('lon')]: round(s.coordinates.longitude, 5),
    [h('status')]: translateCode(t, 'status', s.status),
    [h('updated')]: format(new Date(s.lastUpdated), 'yyyy-MM-dd HH:mm'),
    [h('ph')]: round(s.pH),
    [h('nitrogenMg')]: s.nitrogen,
    [h('phosphorusMg')]: s.phosphorus,
    [h('potassiumMg')]: s.potassium,
    [h('magnesiumMg')]: s.magnesium,
    [h('socPct')]: round(s.soc),
    [h('soilTempC')]: round(s.soilTemperature, 1),
    [h('soilMoisturePct')]: s.soilMoisture,
    [h('ecMsCm')]: round(s.electricalConductivity),
    [h('gasComposition')]: s.gasComposition,
    [h('batteryPct')]: s.battery,
    [h('signalPct')]: s.signalStrength,
  })));
}

// SoilGrids отдаёт целые числа в «сырых» единицах — переводим в привычные
async function profileRows(t: TFunction, fields: Field[]): Promise<Row[]> {
  const h = (k: string) => t(`export.h.${k}`);
  const rows: Row[] = [];
  for (const field of fields) {
    const api = await getJson<Record<string, Record<string, number | null>>>(`/api/fields/${field.id}/scanner`);
    const data = api ?? mockScannerData;
    for (const depth of DEPTHS) {
      const d = data[depth] ?? {};
      const scale = (key: string, div: number) => d[key] == null ? null : round(d[key]! / div);
      rows.push({
        [h('field')]: t(field.nameKey),
        [h('depth')]: t('export.h.depthCm', { range: depth.replace('cm', '') }),
        [h('phH2o')]: scale('phh2o', 10),
        [h('nitrogenGkg')]: scale('nitrogen', 100),
        [h('socGkg')]: scale('soc', 10),
        [h('clayPct')]: scale('clay_content', 10),
        [h('sandPct')]: scale('sand_content', 10),
        [h('siltPct')]: scale('silt_content', 10),
        [h('bdodGcm3')]: scale('bdod', 100),
        [h('cec')]: d.cec ?? null,
        [h('source')]: api ? t('export.src.soilGrids') : t('export.src.demo'),
      });
    }
  }
  return rows;
}

async function predictionRows(t: TFunction, fields: Field[]): Promise<Row[]> {
  const h = (k: string) => t(`export.h.${k}`);
  const fertSource = (src: string | null | undefined) =>
    src === 'ml' ? t('export.src.mlModel') : src === 'rule_based' ? t('export.src.rules') : src ?? null;

  const rows: Row[] = [];
  for (const field of fields) {
    const p = await getJson<PredictionData>(`/api/predictions/latest?field_id=${encodeURIComponent(field.id)}`);
    if (p) {
      const snap = p.feature_snapshot ?? {};
      const probs = snap.soil_state_probabilities ?? {};
      rows.push({
        [h('field')]: t(field.nameKey),
        [h('forecastDate')]: format(new Date(p.timestamp), 'yyyy-MM-dd HH:mm'),
        [h('sensorId')]: p.sensor_id,
        [h('recommendedCrop')]: p.crop_recommendation,
        [h('cropConfidence')]: round(p.crop_confidence),
        [h('fertilizer')]: p.fertilizer_recommendation,
        [h('fertilizerSource')]: fertSource(p.fertilizer_source),
        [h('soilState')]: translateCode(t, 'soilState', p.soil_state),
        [h('stateConfidence')]: round(p.soil_state_confidence),
        [h('pCritical')]: round(probs.critical),
        [h('pPoor')]: round(probs.poor),
        [h('pModerate')]: round(probs.moderate),
        [h('pHealthy')]: round(probs.healthy),
        [h('predNitrogen')]: round(snap.predicted_nitrogen_g_kg),
        [h('predCarbon')]: round(snap.predicted_carbon_g_kg),
        [h('predMoisture')]: round(snap.predicted_moisture_pct),
        [h('predPh')]: round(snap.predicted_ph),
        [h('inTrainingDomain')]: snap.in_training_domain,
        [h('source')]: t('export.src.mlApi'),
      });
      continue;
    }
    const demo = demoPredictions.find(d => d.fieldId === field.id);
    if (demo) {
      rows.push({
        [h('field')]: t(field.nameKey),
        [h('forecastDate')]: format(new Date(demo.lastUpdated), 'yyyy-MM-dd HH:mm'),
        [h('recommendedCrop')]: t(demo.cropKey),
        [h('cropConfidence')]: demo.cropConfidence,
        [h('fertilizer')]: t(demo.fertilizerKey),
        [h('fertilizerSource')]: fertSource(demo.fertilizerSource),
        [h('soilState')]: t(demo.soilStateKey),
        [h('stateConfidence')]: demo.soilStateConfidence,
        [h('source')]: t('export.src.demo'),
      });
    } else {
      rows.push({ [h('field')]: t(field.nameKey), [h('source')]: t('export.src.noPrediction') });
    }
  }
  return rows;
}

// Excel с русской локалью: разделитель «;», десятичная запятая, UTF-8 с BOM
function toCsv(t: TFunction, rows: Row[]): string {
  const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const cell = (v: Cell) => {
    if (v == null) return '';
    if (typeof v === 'boolean') return v ? t('export.bool.yes') : t('export.bool.no');
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
export async function exportDataset(
  dataset: ExportDataset, fields: Field[], fmt: ExportFormat, exportedBy: string, t: TFunction,
) {
  const rows =
    dataset === 'sensors' ? sensorRows(t, fields)
    : dataset === 'profile' ? await profileRows(t, fields)
    : await predictionRows(t, fields);

  const scope = fields.length === 1 ? fields[0].id : 'all-fields';
  const filename = `soilink_${DATASETS[dataset].file}_${scope}_${format(new Date(), 'yyyy-MM-dd')}.${fmt}`;

  if (fmt === 'csv') {
    download(toCsv(t, rows), filename, 'text/csv;charset=utf-8');
  } else {
    const payload = {
      dataset,
      title: t(DATASETS[dataset].labelKey),
      exportedAt: new Date().toISOString(),
      exportedBy,
      fields: fields.map(f => ({ id: f.id, name: t(f.nameKey), areaHectares: f.areaHectares, center: f.center })),
      rows,
    };
    download(JSON.stringify(payload, null, 2), filename, 'application/json');
  }
  return rows.length;
}
