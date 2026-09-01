import { addDays, subHours, format } from 'date-fns';
import type { Field, Sensor, SoilZone, Recommendation, Prediction, StatisticCard, ScannerData, WeatherData } from '@/types';

// Реальные сельхозугодья южнее Усть-Каменогорска (Ertis / Tishinka area)
export const fields: Field[] = [
  {
    id: 'f-1',
    name: 'УКГ — Тишинское поле',
    areaHectares: 124.5,
    // Центр: южнее города, вблизи с. Тишинка
    center: { latitude: 49.9260, longitude: 82.5420 },
    boundary: [],
  },
  {
    id: 'f-2',
    name: 'УКГ — Усть-Тарханское поле',
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
      { day: 'Пн', temp: 25, icon: '☀️' },
      { day: 'Вт', temp: 26, icon: '☀️' },
      { day: 'Ср', temp: 22, icon: '⛅' },
      { day: 'Чт', temp: 24, icon: '☀️' },
      { day: 'Пт', temp: 19, icon: '🌧️' },
    ],
  },
};

const createSensor = (id: string, fieldId: string, name: string, lat: number, lng: number, status: any): Sensor => ({
  id, fieldId, name,
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
  createSensor('s-1', 'f-1', 'Датчик 01 (Зона А — Север)', 49.9315, 82.5340, 'healthy'),
  createSensor('s-2', 'f-1', 'Датчик 02 (Зона А — Центр)', 49.9295, 82.5370, 'warning'),
  createSensor('s-3', 'f-1', 'Датчик 03 (Зона А — Запад)', 49.9305, 82.5295, 'healthy'),
  createSensor('s-4', 'f-1', 'Датчик 04 (Зона Б — Юг)', 49.9270, 82.5555, 'critical'),
  createSensor('s-5', 'f-1', 'Датчик 05 (Зона Б — Восток)', 49.9290, 82.5600, 'healthy'),
  createSensor('s-11', 'f-1', 'Датчик 06 (Зона В — Центр)', 49.9155, 82.5340, 'healthy'),
  createSensor('s-12', 'f-1', 'Датчик 07 (Зона В — Юг)', 49.9130, 82.5360, 'warning'),
  createSensor('s-13', 'f-1', 'Датчик 08 (Зона В — Глубинный)', 49.9145, 82.5310, 'healthy'),

  // Field 2 — Усть-Тарханское поле
  createSensor('s-6', 'f-2', 'S-Alpha 01', 49.8940, 82.6320, 'healthy'),
  createSensor('s-7', 'f-2', 'S-Alpha 02', 49.8910, 82.6400, 'healthy'),
  createSensor('s-8', 'f-2', 'S-Beta 01', 49.8950, 82.6450, 'warning'),
];

export const zones: SoilZone[] = [
  {
    // ЗОНА А — трапеция (шире сверху), северная часть поля
    // Расположена: ~49.928-49.935°N, 82.524-82.545°E
    id: 'z-1', fieldId: 'f-1', name: 'Зона А (Пшеница)', color: 'green',
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
    id: 'z-2', fieldId: 'f-1', name: 'Зона Б (Подсолнечник)', color: 'yellow',
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
    id: 'z-3', fieldId: 'f-1', name: 'Зона В (Пар)', color: 'red',
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
    titleKey: 'Критический дефицит влаги',
    messageKey: 'В зоне Юг (датчик 04) уровень влажности опустился ниже 15%. Необходим немедленный полив для предотвращения стресса растений.',
    sensorId: 's-4',
    timeline: [
      { id: 't-1', labelKey: 'Проверка системы полива', dueAt: new Date().toISOString(), completed: true },
      { id: 't-2', labelKey: 'Запуск полива сектора Юг', dueAt: addDays(new Date(), 0).toISOString(), completed: false },
    ],
  },
  {
    id: 'r-2', fieldId: 'f-1', level: 'warning',
    titleKey: 'Повышение температуры почвы',
    messageKey: 'Наблюдается аномальный рост температуры в центральном секторе. Рекомендуется мульчирование.',
    timeline: [],
  },
  {
    id: 'r-3', level: 'premium',
    titleKey: 'Оптимизация азотного питания',
    messageKey: 'AI-анализ виброакустики показывает уплотнение почвы. Рекомендуется аэрация перед следующим внесением удобрений.',
    timeline: [],
  },
];

export const predictions: Prediction[] = [
  {
    id: 'p-1', fieldId: 'f-1',
    cropRecommendation: 'Озимая пшеница (Сорт "Алмаз")',
    cropConfidence: 0.94,
    fertilizerRecommendation: 'Карбамид (40 кг/га), Суперфосфат (25 кг/га)',
    fertilizerSource: 'ml',
    soilState: 'Оптимальное для посева',
    soilStateConfidence: 0.88,
    lastUpdated: new Date().toISOString(),
  },
];

export const statistics: StatisticCard[] = [
  { id: '1', label: 'Здоровье почвы', value: '84%' },
  { id: '2', label: 'Влажность (ср.)', value: '42%' },
  { id: '3', label: 'Датчиков', value: '12/12' },
  { id: '4', label: 'Предупреждений', value: '3' },
];

export const mockScannerData: ScannerData = {
  '0-5cm': { phh2o: 62, nitrogen: 18, soc: 24, clay_content: 215, sand_content: 432, silt_content: 353, bdod: 132 },
  '5-15cm': { phh2o: 64, nitrogen: 15, soc: 21, clay_content: 220, sand_content: 420, silt_content: 360, bdod: 135 },
  '15-30cm': { phh2o: 65, nitrogen: 12, soc: 18, clay_content: 235, sand_content: 405, silt_content: 360, bdod: 138 },
  '30-60cm': { phh2o: 67, nitrogen: 8, soc: 14, clay_content: 250, sand_content: 380, silt_content: 370, bdod: 142 },
  '60-100cm': { phh2o: 68, nitrogen: 5, soc: 11, clay_content: 270, sand_content: 350, silt_content: 380, bdod: 145 },
};

export const getMoistureHistory = (sensorId: string) => {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    value: 30 + Math.random() * 20 + (i > 10 && i < 16 ? -5 : 0),
  }));
};

export const getTemperatureHistory = (sensorId: string) => {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    value: 18 + Math.sin((i - 6) * (Math.PI / 12)) * 5,
  }));
};

export const generateWateringEvents = (fieldId: string) => {
  return [
    {
      id: `w-${fieldId}-1`, fieldId,
      date: subHours(new Date(), 2),
      sector: 'Зона А', crop: 'Пшеница',
      managerName: 'Алексей Н.', managerAvatar: 'https://i.pravatar.cc/150?u=1',
      type: 'water' as const, volume: '15 л/м²', duration: 45, status: 'completed' as const, targetMoisture: 45,
    },
    {
      id: `w-${fieldId}-2`, fieldId,
      date: addDays(new Date(), 0),
      sector: 'Зона Юг', crop: 'Пшеница',
      managerName: 'Алексей Н.', managerAvatar: 'https://i.pravatar.cc/150?u=1',
      type: 'water' as const, volume: '20 л/м²', duration: 60, status: 'scheduled' as const, targetMoisture: 50,
    },
    {
      id: `w-${fieldId}-3`, fieldId,
      date: addDays(new Date(), 1),
      sector: 'Зона Б', crop: 'Пшеница',
      managerName: 'Иван К.', managerAvatar: 'https://i.pravatar.cc/150?u=2',
      type: 'fertilizer' as const, volume: '5 г/м²', duration: 30, status: 'scheduled' as const, targetMoisture: 40,
    },
  ];
};
