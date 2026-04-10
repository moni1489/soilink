export type SensorStatus = 'healthy' | 'warning' | 'critical';
export type RecommendationLevel = 'critical' | 'warning' | 'plan' | 'premium';
export type RecommendationTimelineStatus = 'pending' | 'inProgress' | 'done';
export type SoilGridsProperty = 'clay' | 'sand' | 'silt' | 'phh2o' | 'nitrogen' | 'soc' | 'bdod';
export type SoilDepth = '0-5cm' | '5-15cm' | '15-30cm' | '30-60cm' | '60-100cm';

export type LayerKey =
  | 'soilMoisture'
  | 'temperature'
  | 'pH'
  | 'electricalConductivity'
  | 'gasComposition'
  | 'soilGrids';
export type MapMode = 'zones' | 'heatmap' | 'satellite';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Sensor {
  id: string;
  fieldId: string;
  name: string;
  coordinates: Coordinate;
  status: SensorStatus;
  lastUpdated: string;
  pH: number;
  nitrogen: number;
  soc: number;
  soilTemperature: number;
  soilMoisture: number;
  electricalConductivity: number;
  gasComposition: string;
  premiumFeatures?: {
  };
}

export interface SoilZone {
  id: string;
  fieldId: string;
  name: string;
  color: 'green' | 'yellow' | 'red';
  polygon: Coordinate[];
}

export interface Field {
  id: string;
  name: string;
  areaHectares: number;
  center: Coordinate;
  boundary: Coordinate[];
}

export interface StatisticCard {
  id: string;
  label: string;
  value: string;
}

export interface RecommendationTimelineStep {
  id: string;
  labelKey: string;
  labelOpen?: string; // For dynamic/English labels from backend
  dueAt: string;
  completed: boolean;
}

export interface Recommendation {
  id: string;
  fieldId?: string;
  level: RecommendationLevel;
  titleKey: string;
  messageKey: string;
  sensorId?: string;
  timeline: RecommendationTimelineStep[];
}

export interface Prediction {
  id: string;
  fieldId: string;
  sensorId?: string;
  cropRecommendation: string;
  cropConfidence: number;
  fertilizerRecommendation: string;
  fertilizerSource: 'ml' | 'rule_based';
  soilState: string;
  soilStateConfidence: number;
  featureSnapshot?: any;
  lastUpdated: string;
  isHistorical?: boolean;
  historicalDate?: number;
}
