import { Field, Sensor, SoilZone, StatisticCard, Recommendation } from '../types';

export const fields: Field[] = [
  {
    id: 'field-1',
    name: 'Field 1',
    areaHectares: 20,
    center: {
      latitude: 49.9689,
      longitude: 82.5946
    }
  },
  {
    id: 'field-2',
    name: 'Field 2',
    areaHectares: 18.5,
    center: {
      latitude: 49.9715,
      longitude: 82.6021
    }
  },
  {
    id: 'field-3',
    name: 'Field 3',
    areaHectares: 22.2,
    center: {
      latitude: 49.9632,
      longitude: 82.6137
    }
  }
];

export const sensors: Sensor[] = [
  {
    id: 'sensor-1',
    name: 'Moisture Probe 01',
    coordinates: { latitude: 49.9698, longitude: 82.5979 },
    status: 'healthy',
    lastUpdated: '2026-03-20T09:10:00Z',
    pH: 6.8,
    soilTemperature: 16.4,
    soilMoisture: 42,
    electricalConductivity: 1.2,
    gasComposition: 'N2 78%, O2 21%, CO2 0.04%',
    premiumFeatures: { vibroacousticSoilStructureAnalysis: 'Stable structure with minimal compaction' }
  },
  {
    id: 'sensor-2',
    name: 'Temperature Probe 02',
    coordinates: { latitude: 49.9674, longitude: 82.5912 },
    status: 'warning',
    lastUpdated: '2026-03-20T09:08:00Z',
    pH: 5.9,
    soilTemperature: 21.1,
    soilMoisture: 34,
    electricalConductivity: 1.45,
    gasComposition: 'N2 77%, O2 20%, CO2 0.05%',
    premiumFeatures: { vibroacousticSoilStructureAnalysis: 'Medium structure irregularities detected' }
  },
  {
    id: 'sensor-3',
    name: 'Accuracy Sensor 03',
    coordinates: { latitude: 49.9711, longitude: 82.5996 },
    status: 'critical',
    lastUpdated: '2026-03-20T09:03:00Z',
    pH: 4.8,
    soilTemperature: 26.5,
    soilMoisture: 21,
    electricalConductivity: 2.3,
    gasComposition: 'N2 75%, O2 19%, CO2 0.10%',
    premiumFeatures: { vibroacousticSoilStructureAnalysis: 'Severe compaction detected; recommend remediation' }
  },
  {
    id: 'sensor-4',
    name: 'Gas Sensor 04',
    coordinates: { latitude: 49.9668, longitude: 82.6039 },
    status: 'healthy',
    lastUpdated: '2026-03-20T09:00:00Z',
    pH: 7.1,
    soilTemperature: 15.3,
    soilMoisture: 48,
    electricalConductivity: 1.1,
    gasComposition: 'N2 78%, O2 21%, CO2 0.03%'
  }
];

export const zones: SoilZone[] = [
  {
    id: 'zone-green',
    name: 'Healthy zone',
    color: 'green',
    center: { latitude: 49.969, longitude: 82.596 },
    radiusMeters: 500
  },
  {
    id: 'zone-yellow',
    name: 'Warning zone',
    color: 'yellow',
    center: { latitude: 49.967, longitude: 82.605 },
    radiusMeters: 320
  },
  {
    id: 'zone-red',
    name: 'Critical zone',
    color: 'red',
    center: { latitude: 49.971, longitude: 82.598 },
    radiusMeters: 250
  }
];

export const statistics: StatisticCard[] = [
  { id: 'stats-soil', label: 'overallSoilHealth', value: '78%' },
  { id: 'stats-water', label: 'dailyWaterUsage', value: '5.4 m3' },
  { id: 'stats-sensors', label: 'activeSensors', value: '4' },
  { id: 'stats-alerts', label: 'alertsToday', value: '3' }
];

export const recommendations: Recommendation[] = [
  {
    id: 'rec-1',
    level: 'critical',
    titleKey: 'recIrrigationOverloadTitle',
    messageKey: 'recIrrigationOverloadMessage',
    sensorId: 'sensor-3',
    timeline: [
      { id: 'rec-1-step-1', labelKey: 'rec1Step1', dueAt: '2026-03-20 17:30', completed: true },
      { id: 'rec-1-step-2', labelKey: 'rec1Step2', dueAt: '2026-03-20 20:00', completed: false },
      { id: 'rec-1-step-3', labelKey: 'rec1Step3', dueAt: '2026-03-21 08:00', completed: false }
    ]
  },
  {
    id: 'rec-2',
    level: 'warning',
    titleKey: 'recLowPhTitle',
    messageKey: 'recLowPhMessage',
    sensorId: 'sensor-2',
    timeline: [
      { id: 'rec-2-step-1', labelKey: 'rec2Step1', dueAt: '2026-03-20 19:00', completed: true },
      { id: 'rec-2-step-2', labelKey: 'rec2Step2', dueAt: '2026-03-21 06:30', completed: false }
    ]
  },
  {
    id: 'rec-3',
    level: 'plan',
    titleKey: 'recAerialSurveyTitle',
    messageKey: 'recAerialSurveyMessage',
    timeline: [
      { id: 'rec-3-step-1', labelKey: 'rec3Step1', dueAt: '2026-03-21 09:00', completed: false },
      { id: 'rec-3-step-2', labelKey: 'rec3Step2', dueAt: '2026-03-21 13:30', completed: false }
    ]
  },
  {
    id: 'rec-4',
    level: 'premium',
    titleKey: 'recVibroAlertTitle',
    messageKey: 'recVibroAlertMessage',
    sensorId: 'sensor-3',
    timeline: [
      { id: 'rec-4-step-1', labelKey: 'rec4Step1', dueAt: '2026-03-20 18:45', completed: true },
      { id: 'rec-4-step-2', labelKey: 'rec4Step2', dueAt: '2026-03-21 07:15', completed: false }
    ]
  }
];
