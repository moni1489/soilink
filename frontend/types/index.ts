export type SensorStatus = 'healthy' | 'warning' | 'critical';
export type RecommendationLevel = 'critical' | 'warning' | 'plan' | 'premium';
export type RecommendationTimelineStatus = 'pending' | 'inProgress' | 'done';
export type LayerKey =
  | 'soilMoisture'
  | 'temperature'
  | 'pH'
  | 'electricalConductivity'
  | 'gasComposition'
  | 'vibroacousticAnalysis';
export type MapMode = 'zones' | 'heatmap';

export interface Sensor {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  status: SensorStatus;
  lastUpdated: string;
  pH: number;
  soilTemperature: number;
  soilMoisture: number;
  electricalConductivity: number;
  gasComposition: string;
  premiumFeatures?: {
    vibroacousticSoilStructureAnalysis?: string;
  };
}

export interface SoilZone {
  id: string;
  name: string;
  color: 'green' | 'yellow' | 'red';
  center: {
    latitude: number;
    longitude: number;
  };
  radiusMeters: number;
}

export interface Field {
  id: string;
  name: string;
  areaHectares: number;
  center: {
    latitude: number;
    longitude: number;
  };
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
  level: RecommendationLevel;
  titleKey: string;
  messageKey: string;
  sensorId?: string;
  timeline: RecommendationTimelineStep[];
}
