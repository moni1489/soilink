import type { Sensor } from '@/types';
import { sensorScore, statusFromScore } from '@/data/metrics';

const apiUrl = () => import.meta.env.VITE_API_URL || '';

/** Нет пакетов дольше — датчик считается без связи. LoRaWAN-датчики почвы шлют раз в 10–60 мин. */
export const OFFLINE_AFTER_MIN = 120;

export interface Reading {
  id: number;
  sensor_id: string;
  field_id: string;
  timestamp: string;
  ph: number;
  soil_temperature: number;
  soil_moisture: number;
  electrical_conductivity: number;
}

export interface RegistrySensor {
  id: string;
  name: string;
  field_id: string;
  dev_eui: string | null;
  model: string;
  depth_cm: number;
  latitude: number | null;
  longitude: number | null;
  notes: string;
  created_at: string;
  readings_count: number;
  last_reading: Reading | null;
}

export type SensorInput = Partial<Omit<RegistrySensor, 'id' | 'created_at' | 'readings_count' | 'last_reading'>>;

export type Connection = 'online' | 'offline' | 'waiting';

/** waiting — ни одного пакета ещё не было (не подключён к хабу) */
export function connectionOf(s: RegistrySensor): Connection {
  if (!s.last_reading) return 'waiting';
  return minutesSince(s.last_reading.timestamp) <= OFFLINE_AFTER_MIN ? 'online' : 'offline';
}

export const minutesSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 60000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiUrl()}/api/sensors${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? `HTTP ${res.status}`);
  return res.json();
}

export const listSensors = (fieldId?: string) =>
  request<RegistrySensor[]>(fieldId ? `?field_id=${encodeURIComponent(fieldId)}` : '');
export const getSensor = (id: string) => request<RegistrySensor>(`/${encodeURIComponent(id)}`);
export const getReadings = (id: string, hours: number) =>
  request<Reading[]>(`/${encodeURIComponent(id)}/readings?hours=${hours}`);
export const createSensor = (data: SensorInput) =>
  request<RegistrySensor>('', { method: 'POST', body: JSON.stringify(data) });
export const updateSensor = (id: string, data: SensorInput) =>
  request<RegistrySensor>(`/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteSensor = (id: string) =>
  request<{ deleted: boolean }>(`/${encodeURIComponent(id)}`, { method: 'DELETE' });

/** Адрес вебхука для настроек хаба */
export const webhookUrl = () => `${apiUrl() || window.location.origin}/api/readings/linkedge`;

/** Реальный датчик → формат карты/дашборда. NPK и пр. этот датчик не меряет — NaN, а не выдуманные цифры. */
export function toMapSensor(s: RegistrySensor): Sensor | null {
  if (s.latitude == null || s.longitude == null) return null;
  const r = s.last_reading;
  const sensor: Sensor = {
    id: s.id, fieldId: s.field_id, nameKey: s.name, registryId: s.id,
    coordinates: { latitude: s.latitude, longitude: s.longitude },
    status: 'healthy',
    offline: connectionOf(s) !== 'online',
    lastUpdated: r?.timestamp ?? s.created_at,
    pH: r?.ph ?? NaN,
    soilTemperature: r?.soil_temperature ?? NaN,
    soilMoisture: r?.soil_moisture ?? NaN,
    electricalConductivity: r?.electrical_conductivity ?? NaN,
    nitrogen: NaN, phosphorus: NaN, potassium: NaN, magnesium: NaN, soc: NaN,
    gasComposition: 'n/a', battery: NaN, signalStrength: NaN,
  };
  if (r) sensor.status = statusFromScore(sensorScore(sensor));
  return sensor;
}
