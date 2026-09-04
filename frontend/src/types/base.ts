export type SensorStatus = 'healthy' | 'warning' | 'critical';
export type RecommendationLevel = 'critical' | 'warning' | 'plan' | 'premium';
export type SoilGridsProperty = 'clay' | 'sand' | 'silt' | 'phh2o' | 'nitrogen' | 'soc' | 'bdod';
export type SoilDepth = '0-5cm' | '5-15cm' | '15-30cm' | '30-60cm' | '60-100cm';
export type LayerKey = 'soilMoisture' | 'temperature' | 'pH' | 'electricalConductivity' | 'gasComposition' | 'soilGrids';
export type MapMode = 'zones' | 'heatmap' | 'satellite';
