import { Sensor, Zone, Recommendation } from '../types';

export const MOOK_FIELD_COORDS = {
  latitude: 49.9483,
  longitude: 82.6278,
  latitudeDelta: 0.005,
  longitudeDelta: 0.005,
};

export const MOCK_SENSORS: Sensor[] = [
  {
    id: "sensor-main",
    name: "Main Hub (Ust-Kamenogorsk)",
    coordinates: { latitude: 49.9483, longitude: 82.6278 },
    status: "active",
    lastUpdated: new Date().toISOString(),
    premiumFeatures: true,
    data: {
      ph: 6.5,
      temperature: 22.4,
      moisture: 45,
      electricalConductivity: 1.2,
      gasComposition: { co2: 400, o2: 21 },
      vibroacoustic: "Normal - No compaction detected",
    },
  },
  {
    id: "sensor-2",
    name: "North Point (Warning)",
    coordinates: { latitude: 49.9490, longitude: 82.6285 },
    status: "warning",
    lastUpdated: new Date().toISOString(),
    premiumFeatures: false,
    data: {
      ph: 5.8,
      temperature: 23.1,
      moisture: 30, // low
      electricalConductivity: 1.5,
      gasComposition: { co2: 420, o2: 20.8 },
    },
  },
  {
    id: "sensor-3",
    name: "West Point (Critical)",
    coordinates: { latitude: 49.9475, longitude: 82.6265 },
    status: "critical",
    lastUpdated: new Date().toISOString(),
    premiumFeatures: false,
    data: {
      ph: 7.2,
      temperature: 26.5,
      moisture: 15, // very low
      electricalConductivity: 2.1,
      gasComposition: { co2: 450, o2: 20.5 },
    },
  },
  {
    id: "sensor-4",
    name: "South-East (Healthy)",
    coordinates: { latitude: 49.9472, longitude: 82.6288 },
    status: "active",
    lastUpdated: new Date().toISOString(),
    premiumFeatures: true,
    data: {
      ph: 6.8,
      temperature: 21.5,
      moisture: 42,
      electricalConductivity: 1.1,
      gasComposition: { co2: 395, o2: 21 },
      vibroacoustic: "Optimal aeration levels",
    },
  }
];

export const MOCK_ZONES: Zone[] = [
  {
    id: "zone-1",
    status: "healthy",
    coordinates: [
      { latitude: 49.9495, longitude: 82.6270 },
      { latitude: 49.9495, longitude: 82.6295 },
      { latitude: 49.9485, longitude: 82.6295 },
      { latitude: 49.9485, longitude: 82.6270 },
    ],
  },
  {
    id: "zone-2",
    status: "warning",
    coordinates: [
      { latitude: 49.9485, longitude: 82.6270 },
      { latitude: 49.9485, longitude: 82.6295 },
      { latitude: 49.9470, longitude: 82.6295 },
      { latitude: 49.9470, longitude: 82.6270 },
    ],
  },
  {
    id: "zone-3",
    status: "critical",
    coordinates: [
      { latitude: 49.9480, longitude: 82.6250 },
      { latitude: 49.9480, longitude: 82.6270 },
      { latitude: 49.9470, longitude: 82.6270 },
      { latitude: 49.9470, longitude: 82.6250 },
    ],
  },
];

export const MOCK_RECOMMENDATIONS: Recommendation[] = [
  { id: "rec-1", type: "critical", messageKey: "rec.lowMoisture" },
  { id: "rec-2", type: "warning", messageKey: "rec.phImbalance" },
  { id: "rec-3", type: "plan", messageKey: "rec.weatherPlan" },
  { id: "rec-4", type: "premium", messageKey: "rec.compaction" },
];
