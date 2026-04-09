import React from 'react';
import { Platform } from 'react-native';
import type { Sensor, SoilZone, LayerKey, MapMode, Coordinate, SoilGridsProperty, SoilDepth } from '../types';

interface Props {
  fieldCenter: { latitude: number; longitude: number };
  fieldBoundary: Coordinate[];
  zones: SoilZone[];
  sensors: Sensor[];
  onSelectSensor: (sensor: Sensor) => void;
  onSelectZone: (zone: SoilZone) => void;
  activeZoneId?: string;
  visibleLayers: LayerKey[];
  selectedSoilProperty?: SoilGridsProperty;
  selectedDepth?: SoilDepth;
  mapMode: MapMode;
  theme?: 'light' | 'dark';
}

type FieldMapComponent = React.ComponentType<Props>;

const FieldMapImpl: FieldMapComponent =
  Platform.OS === 'web'
    ? (require('./FieldMap.web').default as FieldMapComponent)
    : (require('./FieldMap.native').default as FieldMapComponent);

export default function FieldMap(props: Props) {
  return <FieldMapImpl {...props} />;
}
