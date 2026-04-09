export type SensorStatus = 'healthy' | 'warning' | 'critical';
export type RecommendationLevel = 'critical' | 'warning' | 'plan' | 'premium';
export type RecommendationTimelineStatus = 'pending' | 'inProgress' | 'done';
export type LayerKey =
  | 'soilMoisture'
  | 'temperature'
  | 'pH'
  | 'electricalConductivity'
  | 'gasComposition'
  | 'soilGrids';
export type MapMode = 'zones' | 'heatmap';

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
