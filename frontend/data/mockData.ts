import { Field, Sensor, SoilZone, StatisticCard, Recommendation } from '../types';

export const fields: Field[] = [
  {
    id: 'field-1',
    name: 'Field 1',
    // Based on a real farmland parcel near Gerasimovka, east of Oskemen.
    areaHectares: 87.4,
    center: {
      latitude: 49.9372,
      longitude: 82.4281
    },
    boundary: [
      { latitude: 49.9411, longitude: 82.4219 },
      { latitude: 49.9397, longitude: 82.4343 },
      { latitude: 49.9334, longitude: 82.4357 },
      { latitude: 49.9312, longitude: 82.4236 },
      { latitude: 49.9328, longitude: 82.4212 }
    ]
  },
  {
    id: 'field-2',
    name: 'Field 2',
    areaHectares: 18.5,
    center: {
      latitude: 49.9672,
      longitude: 82.3944
    },
    boundary: [
      { latitude: 49.9698, longitude: 82.392 },
      { latitude: 49.969, longitude: 82.3979 },
      { latitude: 49.9661, longitude: 82.3984 },
      { latitude: 49.9648, longitude: 82.3957 },
      { latitude: 49.9655, longitude: 82.3914 },
      { latitude: 49.9679, longitude: 82.3908 }
    ]
  },
  {
    id: 'field-3',
    name: 'Field 3',
    areaHectares: 22.2,
    center: {
      latitude: 49.957,
      longitude: 82.3774
    },
    boundary: [
      { latitude: 49.9592, longitude: 82.3745 },
      { latitude: 49.9584, longitude: 82.3812 },
      { latitude: 49.9549, longitude: 82.3803 },
      { latitude: 49.9557, longitude: 82.3736 }
    ]
  }
];

export const sensors: Sensor[] = [
  {
    id: 'sensor-1',
    fieldId: 'field-1',
    name: 'Sector 1 Probe',
    coordinates: { latitude: 49.938650, longitude: 82.424725 },
    status: 'healthy',
    lastUpdated: '2026-03-22T06:10:00Z',
    pH: 6.8,
    soilTemperature: 17.1,
    soilMoisture: 54,
    electricalConductivity: 1.08,
    gasComposition: 'N2 78%, O2 21%, CO2 0.04%',
    premiumFeatures: {}
  },
  {
    id: 'sensor-2',
    fieldId: 'field-1',
    name: 'Sector 2 Probe',
    coordinates: { latitude: 49.938200, longitude: 82.431187 },
    status: 'warning',
    lastUpdated: '2026-03-22T06:08:00Z',
    pH: 5.8,
    soilTemperature: 21.3,
    soilMoisture: 36,
    electricalConductivity: 1.62,
    gasComposition: 'N2 77%, O2 20%, CO2 0.05%',
    premiumFeatures: { vibroacousticSoilStructureAnalysis: 'Localized layer hardening at 20-30 cm depth' }
  },
  {
    id: 'sensor-3',
    fieldId: 'field-1',
    name: 'Sector 3 Probe',
    coordinates: { latitude: 49.934600, longitude: 82.431925 },
    status: 'critical',
    lastUpdated: '2026-03-22T06:03:00Z',
    pH: 4.9,
    soilTemperature: 27.4,
    soilMoisture: 19,
    electricalConductivity: 2.31,
    gasComposition: 'N2 75%, O2 19%, CO2 0.10%',
    premiumFeatures: {
      vibroacousticSoilStructureAnalysis: 'High compaction and microcrack density, intervention required'
    }
  },
  {
    id: 'sensor-4',
    fieldId: 'field-1',
    name: 'Sector 4 Probe',
    coordinates: { latitude: 49.932913, longitude: 82.425750 },
    status: 'healthy',
    lastUpdated: '2026-03-22T06:00:00Z',
    pH: 6.9,
    soilTemperature: 16.2,
    soilMoisture: 49,
    electricalConductivity: 1.14,
    gasComposition: 'N2 78%, O2 21%, CO2 0.03%'
  },
  {
    id: 'sensor-5',
    fieldId: 'field-1',
    name: 'Sector 5 Probe',
    coordinates: { latitude: 49.934475, longitude: 82.423125 },
    status: 'healthy',
    lastUpdated: '2026-03-22T05:57:00Z',
    pH: 6.7,
    soilTemperature: 16.8,
    soilMoisture: 52,
    electricalConductivity: 1.12,
    gasComposition: 'N2 78%, O2 21%, CO2 0.04%',
    premiumFeatures: { vibroacousticSoilStructureAnalysis: 'Balanced granular profile with moderate porosity' }
  },
  {
    id: 'sensor-6',
    fieldId: 'field-2',
    name: 'Moisture Probe 11',
    coordinates: { latitude: 49.9688, longitude: 82.3932 },
    status: 'healthy',
    lastUpdated: '2026-03-22T06:06:00Z',
    pH: 6.7,
    soilTemperature: 17.2,
    soilMoisture: 54,
    electricalConductivity: 1.03,
    gasComposition: 'N2 78%, O2 21%, CO2 0.03%'
  },
  {
    id: 'sensor-7',
    fieldId: 'field-2',
    name: 'EC Sensor 12',
    coordinates: { latitude: 49.9675, longitude: 82.397 },
    status: 'warning',
    lastUpdated: '2026-03-22T06:02:00Z',
    pH: 6,
    soilTemperature: 21.6,
    soilMoisture: 35,
    electricalConductivity: 1.84,
    gasComposition: 'N2 77%, O2 20%, CO2 0.07%',
    premiumFeatures: { vibroacousticSoilStructureAnalysis: 'Patchy compaction near eastern strip' }
  },
  {
    id: 'sensor-8',
    fieldId: 'field-2',
    name: 'Thermal Node 13',
    coordinates: { latitude: 49.9659, longitude: 82.3928 },
    status: 'healthy',
    lastUpdated: '2026-03-22T05:58:00Z',
    pH: 6.6,
    soilTemperature: 18.9,
    soilMoisture: 45,
    electricalConductivity: 1.2,
    gasComposition: 'N2 78%, O2 21%, CO2 0.04%'
  },
  {
    id: 'sensor-9',
    fieldId: 'field-2',
    name: 'Compaction Probe 14',
    coordinates: { latitude: 49.9656, longitude: 82.3961 },
    status: 'critical',
    lastUpdated: '2026-03-22T05:54:00Z',
    pH: 5.1,
    soilTemperature: 25.4,
    soilMoisture: 22,
    electricalConductivity: 2.21,
    gasComposition: 'N2 76%, O2 19%, CO2 0.09%',
    premiumFeatures: { vibroacousticSoilStructureAnalysis: 'Dense hardpan under 25 cm, tillage required' }
  },
  {
    id: 'sensor-10',
    fieldId: 'field-3',
    name: 'Soil Probe 21',
    coordinates: { latitude: 49.9583, longitude: 82.3756 },
    status: 'healthy',
    lastUpdated: '2026-03-22T06:07:00Z',
    pH: 6.9,
    soilTemperature: 16.9,
    soilMoisture: 52,
    electricalConductivity: 1.09,
    gasComposition: 'N2 78%, O2 21%, CO2 0.04%'
  },
  {
    id: 'sensor-11',
    fieldId: 'field-3',
    name: 'Soil Probe 22',
    coordinates: { latitude: 49.9577, longitude: 82.3798 },
    status: 'warning',
    lastUpdated: '2026-03-22T06:01:00Z',
    pH: 5.7,
    soilTemperature: 22.1,
    soilMoisture: 31,
    electricalConductivity: 1.63,
    gasComposition: 'N2 77%, O2 20%, CO2 0.06%'
  },
  {
    id: 'sensor-12',
    fieldId: 'field-3',
    name: 'Gas Node 23',
    coordinates: { latitude: 49.9564, longitude: 82.3772 },
    status: 'healthy',
    lastUpdated: '2026-03-22T05:56:00Z',
    pH: 6.5,
    soilTemperature: 18.3,
    soilMoisture: 43,
    electricalConductivity: 1.25,
    gasComposition: 'N2 78%, O2 21%, CO2 0.04%'
  },
  {
    id: 'sensor-13',
    fieldId: 'field-3',
    name: 'Hybrid Node 24',
    coordinates: { latitude: 49.9558, longitude: 82.3791 },
    status: 'critical',
    lastUpdated: '2026-03-22T05:51:00Z',
    pH: 4.9,
    soilTemperature: 26.8,
    soilMoisture: 19,
    electricalConductivity: 2.41,
    gasComposition: 'N2 75%, O2 19%, CO2 0.11%',
    premiumFeatures: { vibroacousticSoilStructureAnalysis: 'Critical compaction pocket detected in southern wedge' }
  }
];

export const zones: SoilZone[] = [
  {
    id: 'zone-f1-sector-1',
    fieldId: 'field-1',
    name: 'Sector 1',
    color: 'green',
    polygon: [
      { latitude: 49.9411, longitude: 82.4219 },
      { latitude: 49.9404, longitude: 82.4281 },
      { latitude: 49.93615, longitude: 82.42735 },
      { latitude: 49.93695, longitude: 82.42155 }
    ]
  },
  {
    id: 'zone-f1-sector-2',
    fieldId: 'field-1',
    name: 'Sector 2',
    color: 'yellow',
    polygon: [
      { latitude: 49.9397, longitude: 82.4343 },
      { latitude: 49.93655, longitude: 82.4350 },
      { latitude: 49.93615, longitude: 82.42735 },
      { latitude: 49.9404, longitude: 82.4281 }
    ]
  },
  {
    id: 'zone-f1-sector-3',
    fieldId: 'field-1',
    name: 'Sector 3',
    color: 'red',
    polygon: [
      { latitude: 49.9334, longitude: 82.4357 },
      { latitude: 49.9323, longitude: 82.42965 },
      { latitude: 49.93615, longitude: 82.42735 },
      { latitude: 49.93655, longitude: 82.4350 }
    ]
  },
  {
    id: 'zone-f1-sector-4',
    fieldId: 'field-1',
    name: 'Sector 4',
    color: 'green',
    polygon: [
      { latitude: 49.9312, longitude: 82.4236 },
      { latitude: 49.9320, longitude: 82.4224 },
      { latitude: 49.93615, longitude: 82.42735 },
      { latitude: 49.9323, longitude: 82.42965 }
    ]
  },
  {
    id: 'zone-f1-sector-5',
    fieldId: 'field-1',
    name: 'Sector 5',
    color: 'green',
    polygon: [
      { latitude: 49.9328, longitude: 82.4212 },
      { latitude: 49.93695, longitude: 82.42155 },
      { latitude: 49.93615, longitude: 82.42735 },
      { latitude: 49.9320, longitude: 82.4224 }
    ]
  },
  {
    id: 'zone-f2-north-west',
    fieldId: 'field-2',
    name: 'Sector 1',
    color: 'green',
    polygon: [
      { latitude: 49.9698, longitude: 82.392 },
      { latitude: 49.969, longitude: 82.3979 },
      { latitude: 49.9677, longitude: 82.3967 },
      { latitude: 49.9684, longitude: 82.3944 },
      { latitude: 49.9671, longitude: 82.3923 },
      { latitude: 49.9679, longitude: 82.3908 }
    ]
  },
  {
    id: 'zone-f2-east-strip',
    fieldId: 'field-2',
    name: 'Sector 2',
    color: 'yellow',
    polygon: [
      { latitude: 49.9677, longitude: 82.3967 },
      { latitude: 49.969, longitude: 82.3979 },
      { latitude: 49.9661, longitude: 82.3984 },
      { latitude: 49.9663, longitude: 82.3964 }
    ]
  },
  {
    id: 'zone-f2-south-core',
    fieldId: 'field-2',
    name: 'Sector 3',
    color: 'red',
    polygon: [
      { latitude: 49.9663, longitude: 82.3964 },
      { latitude: 49.9661, longitude: 82.3984 },
      { latitude: 49.9648, longitude: 82.3957 },
      { latitude: 49.9661, longitude: 82.3937 }
    ]
  },
  {
    id: 'zone-f2-west-band',
    fieldId: 'field-2',
    name: 'Sector 4',
    color: 'green',
    polygon: [
      { latitude: 49.9679, longitude: 82.3908 },
      { latitude: 49.9671, longitude: 82.3923 },
      { latitude: 49.9661, longitude: 82.3937 },
      { latitude: 49.9655, longitude: 82.3914 }
    ]
  },
  {
    id: 'zone-f2-center-lane',
    fieldId: 'field-2',
    name: 'Sector 5',
    color: 'yellow',
    polygon: [
      { latitude: 49.9671, longitude: 82.3923 },
      { latitude: 49.9684, longitude: 82.3944 },
      { latitude: 49.9677, longitude: 82.3967 },
      { latitude: 49.9663, longitude: 82.3964 },
      { latitude: 49.9661, longitude: 82.3937 }
    ]
  },
  {
    id: 'zone-f3-north-strip',
    fieldId: 'field-3',
    name: 'Sector 1',
    color: 'green',
    polygon: [
      { latitude: 49.9592, longitude: 82.3745 },
      { latitude: 49.9584, longitude: 82.3812 },
      { latitude: 49.9574, longitude: 82.3794 },
      { latitude: 49.958, longitude: 82.3766 }
    ]
  },
  {
    id: 'zone-f3-center',
    fieldId: 'field-3',
    name: 'Sector 2',
    color: 'yellow',
    polygon: [
      { latitude: 49.958, longitude: 82.3766 },
      { latitude: 49.9574, longitude: 82.3794 },
      { latitude: 49.956, longitude: 82.3788 },
      { latitude: 49.9564, longitude: 82.3757 }
    ]
  },
  {
    id: 'zone-f3-south-hotspot',
    fieldId: 'field-3',
    name: 'Sector 3',
    color: 'red',
    polygon: [
      { latitude: 49.956, longitude: 82.3788 },
      { latitude: 49.9574, longitude: 82.3794 },
      { latitude: 49.9584, longitude: 82.3812 },
      { latitude: 49.9549, longitude: 82.3803 }
    ]
  },
  {
    id: 'zone-f3-west',
    fieldId: 'field-3',
    name: 'Sector 4',
    color: 'green',
    polygon: [
      { latitude: 49.9592, longitude: 82.3745 },
      { latitude: 49.958, longitude: 82.3766 },
      { latitude: 49.9564, longitude: 82.3757 },
      { latitude: 49.9557, longitude: 82.3736 }
    ]
  },
  {
    id: 'zone-f3-south-west',
    fieldId: 'field-3',
    name: 'Sector 5',
    color: 'yellow',
    polygon: [
      { latitude: 49.9557, longitude: 82.3736 },
      { latitude: 49.9564, longitude: 82.3757 },
      { latitude: 49.956, longitude: 82.3788 },
      { latitude: 49.9549, longitude: 82.3803 }
    ]
  }
];

export const statistics: StatisticCard[] = [
  { id: 'stats-soil', label: 'overallSoilHealth', value: '78%' },
  { id: 'stats-water', label: 'dailyWaterUsage', value: '5.1 m3' },
  { id: 'stats-sensors', label: 'activeSensors', value: '5' },
  { id: 'stats-alerts', label: 'alertsToday', value: '3' }
];

export const recommendations: Recommendation[] = [
  {
    id: 'rec-1',
    fieldId: 'field-1',
    level: 'critical',
    titleKey: 'recIrrigationOverloadTitle',
    messageKey: 'recIrrigationOverloadMessage',
    sensorId: 'sensor-3',
    timeline: [
      { id: 'rec-1-step-1', labelKey: 'rec1Step1', dueAt: '2026-03-22 17:30', completed: true },
      { id: 'rec-1-step-2', labelKey: 'rec1Step2', dueAt: '2026-03-22 20:00', completed: false },
      { id: 'rec-1-step-3', labelKey: 'rec1Step3', dueAt: '2026-03-23 08:00', completed: false }
    ]
  },
  {
    id: 'rec-2',
    fieldId: 'field-1',
    level: 'warning',
    titleKey: 'recLowPhTitle',
    messageKey: 'recLowPhMessage',
    sensorId: 'sensor-2',
    timeline: [
      { id: 'rec-2-step-1', labelKey: 'rec2Step1', dueAt: '2026-03-22 19:00', completed: true },
      { id: 'rec-2-step-2', labelKey: 'rec2Step2', dueAt: '2026-03-23 06:30', completed: false }
    ]
  },
  {
    id: 'rec-3',
    fieldId: 'field-2',
    level: 'plan',
    titleKey: 'recAerialSurveyTitle',
    messageKey: 'recAerialSurveyMessage',
    timeline: [
      { id: 'rec-3-step-1', labelKey: 'rec3Step1', dueAt: '2026-03-23 09:00', completed: false },
      { id: 'rec-3-step-2', labelKey: 'rec3Step2', dueAt: '2026-03-23 13:30', completed: false }
    ]
  },
];
