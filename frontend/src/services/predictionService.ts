export interface PredictionData {
  id: number;
  field_id: string;
  sensor_id: string | null;
  timestamp: string;
  crop_recommendation: string | null;
  crop_confidence: number | null;
  fertilizer_recommendation: string | null;
  fertilizer_source: 'ml' | 'rule_based' | string | null;
  soil_state: string | null;
  soil_state_confidence: number | null;
  feature_snapshot?: {
    crop_features?: Record<string, any>;
    fert_features?: Record<string, any>;
    soil_state_features?: Record<string, any>;
    soilgrid_data?: Record<string, any>;
    climate?: {
      precip_mm?: number;
      mat_c?: number;
      elevation_m?: number;
      is_fallback?: boolean;
      aridity?: number;
    };
    fertilizer_ml_output?: string | null;
    fertilizer_rule_output?: string | null;
    soil_state_probabilities?: {
      critical?: number;
      poor?: number;
      moderate?: number;
      healthy?: number;
    };
    predicted_nitrogen_g_kg?: number | null;
    predicted_carbon_g_kg?: number | null;
    predicted_moisture_pct?: number | null;
    predicted_ph?: number | null;
    in_training_domain?: boolean;
  };
}

export interface ModelInfoResponse {
  loaded: string[];
  missing: string[];
  models: Record<string, any>;
  training_domain: {
    lat_min: number;
    lat_max: number;
    lon_min: number;
    lon_max: number;
  };
}

const getApiUrl = () => import.meta.env.VITE_API_URL || '';

export async function fetchLatestPrediction(fieldId: string): Promise<PredictionData | null> {
  const apiUrl = getApiUrl();
  try {
    const res = await fetch(`${apiUrl}/api/predictions/latest?field_id=${encodeURIComponent(fieldId)}`);
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch prediction: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Error fetching latest prediction:', err);
    return null;
  }
}

export async function runPrediction(fieldId: string, sensorId?: string): Promise<PredictionData> {
  const apiUrl = getApiUrl();
  const res = await fetch(`${apiUrl}/api/predictions/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field_id: fieldId, sensor_id: sensorId || null }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Inference failed (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function fetchModelInfo(): Promise<ModelInfoResponse | null> {
  const apiUrl = getApiUrl();
  try {
    const res = await fetch(`${apiUrl}/api/predictions/models`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
