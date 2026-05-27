export type SensorStatus = 'healthy' | 'warning' | 'critical';
export type RecommendationLevel = 'critical' | 'warning' | 'plan' | 'premium';
export type SoilGridsProperty = 'clay' | 'sand' | 'silt' | 'phh2o' | 'nitrogen' | 'soc' | 'bdod';
export type SoilDepth = '0-5cm' | '5-15cm' | '15-30cm' | '30-60cm' | '60-100cm';
export type LayerKey = 'soilMoisture' | 'temperature' | 'pH' | 'electricalConductivity' | 'gasComposition' | 'soilGrids';
export type MapMode = 'zones' | 'heatmap' | 'satellite';

export interface Coordinate { latitude: number; longitude: number; }

export interface Sensor {
  id: string; fieldId: string; name: string;
  coordinates: Coordinate; status: SensorStatus;
  lastUpdated: string; pH: number; nitrogen: number;
  phosphorus: number; potassium: number; magnesium: number;
  soc: number; soilTemperature: number; soilMoisture: number;
  electricalConductivity: number; gasComposition: string;
  battery: number; signalStrength: number;
  premiumFeatures?: { vibroacousticSoilStructureAnalysis?: string; };
}

export interface WeatherData {
  temp: number;
  condition: 'sunny' | 'cloudy' | 'rain' | 'windy' | 'storm';
  humidity: number;
  windSpeed: number;
  forecast: { day: string; temp: number; icon: string }[];
}

export interface SoilZone {
  id: string; fieldId: string; name: string;
  color: 'green' | 'yellow' | 'red';
  polygon: Coordinate[];
  healthScore: number;
  coordinates: { lng: number; lat: number }[];
}

export interface Field {
  id: string; name: string; areaHectares: number;
  center: Coordinate; boundary: Coordinate[];
}

export interface StatisticCard { id: string; label: string; value: string; }

export interface RecommendationTimelineStep {
  id: string; labelKey: string; dueAt: string; completed: boolean;
}

export interface Recommendation {
  id: string; fieldId?: string; level: RecommendationLevel;
  titleKey: string; messageKey: string;
  sensorId?: string; timeline: RecommendationTimelineStep[];
}

export interface Prediction {
  id: string; fieldId: string;
  cropRecommendation: string; cropConfidence: number;
  fertilizerRecommendation: string; fertilizerSource: 'ml' | 'rule_based';
  soilState: string; soilStateConfidence: number;
  lastUpdated: string; isHistorical?: boolean; historicalDate?: number;
}

export interface WateringEvent {
  id: string; date: Date; fieldId: string;
  sector: string; crop: string; managerName: string; managerAvatar: string;
  type: 'water' | 'fertilizer'; volume: string;
  duration: number; status: 'completed' | 'scheduled' | 'missed';
  targetMoisture: number;
}

export interface ChatMessage {
  id: string; role: 'user' | 'assistant';
  content: string; timestamp: Date;
}

export interface ScannerDepthData {
  [key: string]: number;
  phh2o: number; nitrogen: number; soc: number;
  clay_content: number; sand_content: number; silt_content: number; bdod: number;
}

export interface ScannerData {
  '0-5cm': ScannerDepthData;
  '5-15cm': ScannerDepthData;
  '15-30cm': ScannerDepthData;
  '30-60cm': ScannerDepthData;
  '60-100cm': ScannerDepthData;
}
