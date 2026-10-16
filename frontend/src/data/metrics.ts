import type { Sensor, SensorStatus } from '@/types';

/**
 * Агрономические пороги по показателям датчика. ok — оптимальный диапазон (оценка 100),
 * limit — критические границы (оценка 0), между ними оценка падает линейно.
 * ponytail: пороги под пшеницу/ячмень на чернозёмах ВКО — калибровочный ручник,
 * уточнять под культуру и тип почвы поля.
 */
export type MetricKey = 'index' | 'moisture' | 'temperature' | 'ph' | 'ec';

interface MetricDef {
  labelKey: string;
  unit: string;
  digits: number;
  read: (s: Sensor) => number;
  ok?: [number, number];
  limit?: [number, number];
  /** Границы классов на карте; colors на один длиннее breaks */
  breaks: number[];
  colors: string[];
}

export const METRICS: Record<MetricKey, MetricDef> = {
  index: {
    labelKey: 'metrics.index', unit: '', digits: 0, read: s => sensorScore(s),
    // статусная шкала: критично → серьёзно → внимание → норма → отлично
    breaks: [35, 55, 70, 85],
    colors: ['#d03b3b', '#ec835a', '#fab219', '#6cc04a', '#0ca30c'],
  },
  moisture: {
    labelKey: 'metrics.moisture', unit: '%', digits: 0, read: s => s.soilMoisture,
    ok: [24, 38], limit: [12, 50],
    breaks: [12, 18, 24, 31, 38, 45],
    colors: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'],
  },
  temperature: {
    labelKey: 'metrics.temperature', unit: '°C', digits: 1, read: s => s.soilTemperature,
    // в индекс не входит: это погода, а не состояние почвы — иначе каждая осень «критична»
    breaks: [0, 5, 10, 15, 20, 25],
    colors: ['#fde4d3', '#fbc4a2', '#f7a072', '#eb6834', '#c9501f', '#9c3b14', '#6e290d'],
  },
  ph: {
    labelKey: 'metrics.ph', unit: '', digits: 1, read: s => s.pH,
    ok: [6.0, 7.5], limit: [5.0, 8.5],
    // расходящаяся: кислая (красный) ↔ норма (серый) ↔ щелочная (синий)
    breaks: [5.0, 5.5, 6.0, 7.5, 8.0, 8.5],
    colors: ['#a8302f', '#e34948', '#f09a92', '#f0efec', '#9ec5f4', '#3987e5', '#184f95'],
  },
  ec: {
    labelKey: 'metrics.ec', unit: 'mS/cm', digits: 2, read: s => s.electricalConductivity,
    ok: [0, 1.5], limit: [0, 4],
    breaks: [0.5, 1.0, 1.5, 2.5, 4],
    colors: ['#e6e2fa', '#c4bcf2', '#9a8de6', '#6250d6', '#4a3aa7', '#2e2470'],
  },
};

/** Показатели, из которых складывается индекс состояния почвы */
const INDEX_METRICS: MetricKey[] = ['moisture', 'ph', 'ec'];

export function metricScore(key: MetricKey, value: number): number {
  const { ok, limit } = METRICS[key];
  if (!ok || !limit || !Number.isFinite(value)) return NaN;
  if (value < ok[0]) return Math.max(0, 100 * (value - limit[0]) / (ok[0] - limit[0]));
  if (value > ok[1]) return Math.max(0, 100 * (limit[1] - value) / (limit[1] - ok[1]));
  return 100;
}

/** Индекс 0–100 по худшему показателю: одна проблема (засуха, засоление) ограничивает урожай */
export function sensorScore(s: Sensor): number {
  return Math.round(Math.min(...INDEX_METRICS.map(k => metricScore(k, METRICS[k].read(s)))));
}

export const statusFromScore = (score: number): SensorStatus =>
  score >= 70 ? 'healthy' : score >= 35 ? 'warning' : 'critical';

export const metricStatus = (key: MetricKey, value: number): SensorStatus | null => {
  const score = metricScore(key, value);
  return Number.isNaN(score) ? null : statusFromScore(score);
};

export const classIndex = (key: MetricKey, value: number) =>
  METRICS[key].breaks.filter(b => value >= b).length;

export const STATUS_COLORS: Record<SensorStatus, string> = {
  healthy: '#0ca30c', warning: '#fab219', critical: '#d03b3b',
};

// ─── Геометрия и интерполяция ───

type LngLat = { lng: number; lat: number };

/** Ray-casting: точка внутри многоугольника */
export function pointInPolygon(p: LngLat, vs: LngLat[]) {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const { lng: xi, lat: yi } = vs[i];
    const { lng: xj, lat: yj } = vs[j];
    if ((yi > p.lat) !== (yj > p.lat) && p.lng < (xj - xi) * (p.lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Метров в градусе на этой широте (равнопромежуточная проекция — на масштабе поля погрешность < 0.1%) */
export const metersPerDeg = (lat: number) => ({ x: 111320 * Math.cos(lat * Math.PI / 180), y: 110540 });

export interface IdwPoint { lng: number; lat: number; value: number }

/**
 * Обратно взвешенные расстояния (IDW, p=2) — стандарт для редкой сети датчиков.
 * Возвращает оценку и расстояние до ближайшего датчика (м) — по нему видно достоверность.
 * ponytail: IDW даёт «яблочки» вокруг датчиков; кригинг, если датчиков станет 30+ на поле.
 */
export function idw(points: IdwPoint[], lng: number, lat: number, m = metersPerDeg(lat)) {
  let num = 0, den = 0, nearest = Infinity;
  for (const p of points) {
    const d2 = ((p.lng - lng) * m.x) ** 2 + ((p.lat - lat) * m.y) ** 2;
    if (d2 < 1) return { value: p.value, nearest: 0 };
    const w = 1 / d2;
    num += w * p.value; den += w;
    nearest = Math.min(nearest, d2);
  }
  return { value: den ? num / den : NaN, nearest: Math.sqrt(nearest) };
}
