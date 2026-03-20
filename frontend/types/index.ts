export type SensorStatus = 'active' | 'warning' | 'critical';

export interface GasComposition {
  co2: number; 
  o2: number;  
}

export interface SensorData {
  ph: number;
  temperature: number; // °C
  moisture: number; // %
  electricalConductivity: number; // dS/m
  gasComposition: GasComposition;
  vibroacoustic?: string; // Premium only
}

export interface Sensor {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  status: SensorStatus;
  lastUpdated: string;
  premiumFeatures: boolean;
  data: SensorData;
}

export type ZoneStatus = 'healthy' | 'warning' | 'critical';

export interface Zone {
  id: string;
  status: ZoneStatus;
  coordinates: {
    latitude: number;
    longitude: number;
  }[];
}

export type RecType = 'critical' | 'warning' | 'plan' | 'premium';

export interface Recommendation {
  id: string;
  type: RecType;
  messageKey: string;
}
