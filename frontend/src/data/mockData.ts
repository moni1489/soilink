import { addDays, subHours, format } from 'date-fns';
import type { WateringEvent, Field, Sensor, SoilZone, Recommendation, Prediction, StatisticCard, ScannerData, WeatherData } from '@/types';

// Реальные сельхозугодья южнее Усть-Каменогорска (Ertis / Tishinka area)
export const fields: Field[] = [
  {
    id: 'f-1',
    nameKey: 'data.fields.f-1.name',
    shortKey: 'data.fields.f-1.short',
    areaHectares: 124.5,
    // Центр: южнее города, вблизи с. Тишинка
    center: { latitude: 49.9260, longitude: 82.5420 },
    boundary: [],
  },
  {
    id: 'f-2',
    nameKey: 'data.fields.f-2.name',
    shortKey: 'data.fields.f-2.short',
    areaHectares: 86.2,
    // Юго-восток, вблизи поймы Иртыша
    center: { latitude: 49.8920, longitude: 82.6380 },
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

const createSensor = (id: string, fieldId: string, lat: number, lng: number, status: any): Sensor => ({
  id, fieldId, nameKey: `data.sensors.${id}`,
  coordinates: { latitude: lat, longitude: lng },
  status,
  lastUpdated: subHours(new Date(), 1).toISOString(),
  pH: 6.2 + Math.random() * 0.8,
  nitrogen: 15 + Math.floor(Math.random() * 10),
  phosphorus: 20 + Math.floor(Math.random() * 15),
  potassium: 150 + Math.floor(Math.random() * 50),
  magnesium: 40 + Math.floor(Math.random() * 20),
  soc: 2.1 + Math.random() * 1.5,
  soilTemperature: 18 + Math.random() * 5,
  soilMoisture: 35 + Math.floor(Math.random() * 40),
  electricalConductivity: 1.2 + Math.random() * 0.5,
  gasComposition: 'CO2: 450ppm, O2: 20.5%',
  battery: 75 + Math.floor(Math.random() * 25),
  signalStrength: 80 + Math.floor(Math.random() * 20),
});

export const sensors: Sensor[] = [
  // Field 1 — Тишинское поле (юг УКГ)
  createSensor('s-1', 'f-1', 49.9315, 82.5340, 'healthy'),
  createSensor('s-2', 'f-1', 49.9295, 82.5370, 'warning'),
  createSensor('s-3', 'f-1', 49.9305, 82.5295, 'healthy'),
  createSensor('s-4', 'f-1', 49.9270, 82.5555, 'critical'),
  createSensor('s-5', 'f-1', 49.9290, 82.5600, 'healthy'),
  createSensor('s-11', 'f-1', 49.9155, 82.5340, 'healthy'),
  createSensor('s-12', 'f-1', 49.9130, 82.5360, 'warning'),
  createSensor('s-13', 'f-1', 49.9145, 82.5310, 'healthy'),

  // Field 2 — Усть-Тарханское поле
  createSensor('s-6', 'f-2', 49.8940, 82.6320, 'healthy'),
  createSensor('s-7', 'f-2', 49.8910, 82.6400, 'healthy'),
  createSensor('s-8', 'f-2', 49.8950, 82.6450, 'warning'),
];

export const zones: SoilZone[] = [
  {
    // ЗОНА А — трапеция (шире сверху), северная часть поля
    // Расположена: ~49.928-49.935°N, 82.524-82.545°E
    id: 'z-1', fieldId: 'f-1', nameKey: 'data.zones.z-1', color: 'green',
    healthScore: 92,
    coordinates: [
      { lng: 82.524, lat: 49.935 },
      { lng: 82.537, lat: 49.934 },
      { lng: 82.545, lat: 49.930 },
      { lng: 82.540, lat: 49.926 },
      { lng: 82.525, lat: 49.927 },
    ],
    polygon: [],
  },
  {
    // ЗОНА Б — неправильный пятиугольник, ~400м восточнее зоны А (ближе к центру экрана)
    // Расположена: ~49.923-49.935°N, 82.548-82.562°E
    id: 'z-2', fieldId: 'f-1', nameKey: 'data.zones.z-2', color: 'yellow',
    healthScore: 68,
    coordinates: [
      { lng: 82.549, lat: 49.933 },
      { lng: 82.559, lat: 49.935 },
      { lng: 82.563, lat: 49.929 },
      { lng: 82.560, lat: 49.923 },
      { lng: 82.548, lat: 49.924 },
    ],
    polygon: [],
  },
  {
    // ЗОНА В — Г-образная (L-shape), ~900м южнее зоны А
    // Расположена: ~49.910-49.921°N, 82.523-82.545°E
    id: 'z-3', fieldId: 'f-1', nameKey: 'data.zones.z-3', color: 'red',
    healthScore: 42,
    coordinates: [
      { lng: 82.523, lat: 49.921 },
      { lng: 82.545, lat: 49.921 },
      { lng: 82.545, lat: 49.917 },
      { lng: 82.534, lat: 49.917 },
      { lng: 82.534, lat: 49.910 },
      { lng: 82.523, lat: 49.910 },
    ],
    polygon: [],
  },
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
