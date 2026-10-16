import { addDays, subHours } from 'date-fns';
import { sensorScore, statusFromScore } from './metrics';
import type { WateringEvent, Field, Sensor, SoilZone, Recommendation, Prediction, StatisticCard, ScannerData, WeatherData } from '@/types';

// Реальные пашни западнее Усть-Каменогорска (массив полос у трассы на Самарское) —
// контуры зон обведены по спутниковому снимку, чтобы детализация карты ложилась на настоящие посевы
export const fields: Field[] = [
  {
    id: 'f-1',
    nameKey: 'data.fields.f-1.name',
    shortKey: 'data.fields.f-1.short',
    areaHectares: 550,
    center: { latitude: 49.9791, longitude: 82.3650 },
    boundary: [],
  },
  {
    id: 'f-2',
    nameKey: 'data.fields.f-2.name',
    shortKey: 'data.fields.f-2.short',
    areaHectares: 115,
    center: { latitude: 49.9650, longitude: 82.3817 },
    boundary: [],
  },
];

export const weather: Record<string, WeatherData> = {
  'f-1': {
    temp: 24,
    condition: 'sunny',
    humidity: 45,
    windSpeed: 4.2,
    forecast: [
      { day: 'day.mon', temp: 25, icon: '☀️' },
      { day: 'day.tue', temp: 26, icon: '☀️' },
      { day: 'day.wed', temp: 22, icon: '⛅' },
      { day: 'day.thu', temp: 24, icon: '☀️' },
      { day: 'day.fri', temp: 19, icon: '🌧️' },
    ],
  },
};

// Демо-датчики: [влажность VWC %, t почвы °C, pH, EC mS/cm]. Статус не задаётся руками —
// он считается из значений, как и у реальных датчиков (см. data/metrics.ts)
const createSensor = (id: string, fieldId: string, lat: number, lng: number,
  [soilMoisture, soilTemperature, pH, electricalConductivity]: [number, number, number, number]): Sensor => {
  const sensor: Sensor = {
    id, fieldId, nameKey: `data.sensors.${id}`,
    coordinates: { latitude: lat, longitude: lng },
    status: 'healthy',
    lastUpdated: subHours(new Date(), 1).toISOString(),
    pH, soilTemperature, soilMoisture, electricalConductivity,
    nitrogen: 15 + (id.length * 7) % 10,
    phosphorus: 20 + (id.length * 11) % 15,
    potassium: 150 + (id.length * 13) % 50,
    magnesium: 45,
    soc: 2.6,
    gasComposition: 'CO2: 450ppm, O2: 20.5%',
    battery: 86,
    signalStrength: 91,
  };
  sensor.status = statusFromScore(sensorScore(sensor));
  return sensor;
};

export const sensors: Sensor[] = [
  // Field 1. Зона А в норме, Б пересыхает, В — сухо и засоление
  createSensor('s-1', 'f-1', 49.98182, 82.34946, [31, 13.8, 6.9, 0.55]),
  createSensor('s-2', 'f-1', 49.98500, 82.36288, [22, 13.1, 7.3, 0.70]),
  createSensor('s-3', 'f-1', 49.97636, 82.35582, [29, 14.0, 7.0, 0.60]),
  createSensor('s-4', 'f-1', 49.97455, 82.36994, [13.5, 15.2, 7.9, 1.90]),
  createSensor('s-5', 'f-1', 49.97182, 82.37559, [21, 14.6, 7.4, 1.10]),
  createSensor('s-11', 'f-1', 49.98500, 82.38195, [18, 15.5, 8.1, 2.60]),
  createSensor('s-12', 'f-1', 49.98136, 82.38619, [15, 16.0, 8.3, 3.20]),
  createSensor('s-13', 'f-1', 49.97977, 82.38830, [20, 15.1, 7.8, 2.10]),

  // Field 2
  createSensor('s-6', 'f-2', 49.96545, 82.37701, [33, 12.9, 6.6, 0.50]),
  createSensor('s-7', 'f-2', 49.96818, 82.38265, [30, 13.3, 6.4, 0.48]),
  createSensor('s-8', 'f-2', 49.96273, 82.38407, [19, 13.9, 5.6, 0.80]),
];

const ring = (pts: [number, number][]) => pts.map(([lng, lat]) => ({ lng, lat }));

// healthScore и цвет — заглушки: на дашборде пересчитываются по датчикам
export const zones: SoilZone[] = [
  { id: 'z-1', fieldId: 'f-1', nameKey: 'data.zones.z-1', color: 'green', healthScore: 0, polygon: [],
    coordinates: ring([[82.33781, 49.97932], [82.36853, 49.99409], [82.38089, 49.98705], [82.35229, 49.96977]]) },
  { id: 'z-2', fieldId: 'f-1', nameKey: 'data.zones.z-2', color: 'yellow', healthScore: 0, polygon: [],
    coordinates: ring([[82.35935, 49.97091], [82.37489, 49.98046], [82.38265, 49.97273], [82.36994, 49.96409]]) },
  { id: 'z-3', fieldId: 'f-1', nameKey: 'data.zones.z-3', color: 'red', healthScore: 0, polygon: [],
    coordinates: ring([[82.37806, 49.98432], [82.38124, 49.98682], [82.39219, 49.98023], [82.38830, 49.97864]]) },
  { id: 'z-4', fieldId: 'f-2', nameKey: 'data.zones.z-4', color: 'green', healthScore: 0, polygon: [],
    coordinates: ring([[82.37136, 49.96364], [82.38265, 49.97205], [82.39219, 49.96591], [82.38054, 49.95795]]) },
];

export const recommendations: Recommendation[] = [
  {
    id: 'r-1', fieldId: 'f-1', level: 'critical',
    titleKey: 'data.recs.r-1.title',
    messageKey: 'data.recs.r-1.message',
    sensorId: 's-4',
    timeline: [
      { id: 't-1', labelKey: 'data.steps.t-1', dueAt: new Date().toISOString(), completed: true },
      { id: 't-2', labelKey: 'data.steps.t-2', dueAt: addDays(new Date(), 0).toISOString(), completed: false },
    ],
  },
  {
    id: 'r-2', fieldId: 'f-1', level: 'warning',
    titleKey: 'data.recs.r-2.title',
    messageKey: 'data.recs.r-2.message',
    timeline: [],
  },
  {
    id: 'r-3', level: 'premium',
    titleKey: 'data.recs.r-3.title',
    messageKey: 'data.recs.r-3.message',
    timeline: [],
  },
];

export const predictions: Prediction[] = [
  {
    id: 'p-1', fieldId: 'f-1',
    cropKey: 'data.predictions.p-1.crop',
    cropConfidence: 0.94,
    fertilizerKey: 'data.predictions.p-1.fertilizer',
    fertilizerSource: 'ml',
    soilStateKey: 'data.predictions.p-1.soilState',
    soilStateConfidence: 0.88,
    lastUpdated: new Date().toISOString(),
  },
];

export const statistics: StatisticCard[] = [
  { id: '1', labelKey: 'data.stats.1', value: '84%' },
  { id: '2', labelKey: 'data.stats.2', value: '42%' },
  { id: '3', labelKey: 'data.stats.3', value: '12/12' },
  { id: '4', labelKey: 'data.stats.4', value: '3' },
];

export const mockScannerData: ScannerData = {
  '0-5cm': { phh2o: 62, nitrogen: 18, soc: 24, clay_content: 215, sand_content: 432, silt_content: 353, bdod: 132 },
  '5-15cm': { phh2o: 64, nitrogen: 15, soc: 21, clay_content: 220, sand_content: 420, silt_content: 360, bdod: 135 },
  '15-30cm': { phh2o: 65, nitrogen: 12, soc: 18, clay_content: 235, sand_content: 405, silt_content: 360, bdod: 138 },
  '30-60cm': { phh2o: 67, nitrogen: 8, soc: 14, clay_content: 250, sand_content: 380, silt_content: 370, bdod: 142 },
  '60-100cm': { phh2o: 68, nitrogen: 5, soc: 11, clay_content: 270, sand_content: 350, silt_content: 380, bdod: 145 },
};

export const getMoistureHistory = (sensorId: string, timeframe: '24h' | '7d' = '7d') => {
  if (timeframe === '24h') {
    return Array.from({ length: 24 }, (_, i) => ({
      label: `${i}:00`,
      value: Math.round(30 + Math.sin(i / 3) * 15 + (i > 10 && i < 16 ? -5 : 0)),
    }));
  }
  const days = ['day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat', 'day.sun'];
  return days.map((day, i) => ({
    label: day,
    value: Math.round(38 + Math.sin(i * 1.3) * 12 + (i % 2 === 0 ? 5 : -3)),
  }));
};

export const getTemperatureHistory = (sensorId: string, timeframe: '24h' | '7d' = '7d') => {
  if (timeframe === '24h') {
    return Array.from({ length: 24 }, (_, i) => ({
      label: `${i}:00`,
      value: Number((18 + Math.sin((i - 6) * (Math.PI / 12)) * 5).toFixed(1)),
    }));
  }
  const days = ['day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat', 'day.sun'];
  return days.map((day, i) => ({
    label: day,
    value: Number((19 + Math.cos(i * 0.9) * 3.5 + (i % 2 === 0 ? 1 : -0.8)).toFixed(1)),
  }));
};

const task = (
  id: string, fieldId: string, date: Date, sector: string, crop: string,
  managerName: string, type: WateringEvent['type'], volume: string, duration: number,
  status: WateringEvent['status'], assigneeId?: string, factVolume?: string,
): WateringEvent => ({
  id, fieldId, date, sector, crop, managerName,
  managerAvatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(managerName)}`,
  type, volume, duration, status, targetMoisture: 50, assigneeId, factVolume,
});

export const generateTasks = (): WateringEvent[] => [
  task('t-1', 'f-1', subHours(new Date(), 2),  'data.sectors.zoneA',      'data.crops.wheat',    'data.managers.dmitry',  'water',      '15|unit.lm2',  45, 'completed',   'u-contractor', '14|unit.lm2'),
  task('t-2', 'f-1', addDays(new Date(), 0),   'data.sectors.zoneBSouth', 'data.crops.wheat',    'data.managers.dmitry',  'water',      '20|unit.lm2',  60, 'in_progress', 'u-contractor'),
  task('t-3', 'f-1', addDays(new Date(), 0),   'data.sectors.zoneV',      'data.crops.barley',   'data.managers.aigerim', 'protection', '0.3|unit.lha', 50, 'scheduled',   'u-contractor2'),
  task('t-4', 'f-1', addDays(new Date(), 1),   'data.sectors.zoneB',      'data.crops.wheat',    'data.managers.maria',   'fertilizer', '5|unit.gm2',   30, 'scheduled'),
  task('t-5', 'f-2', addDays(new Date(), 0),   'data.sectors.alpha',      'data.crops.rapeseed', 'data.managers.dmitry',  'water',      '18|unit.lm2',  40, 'scheduled',   'u-contractor2'),
  task('t-6', 'f-2', addDays(new Date(), 2),   'data.sectors.beta',       'data.crops.rapeseed', 'data.managers.maria',   'fertilizer', '120|unit.kgha', 90, 'scheduled',  'u-contractor'),
  task('t-7', 'f-2', subHours(new Date(), 26), 'data.sectors.alpha',      'data.crops.rapeseed', 'data.managers.aigerim', 'protection', '0.2|unit.lha', 35, 'missed'),
];
