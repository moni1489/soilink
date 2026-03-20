import React from 'react';
import { Platform } from 'react-native';
import type { Sensor, SoilZone, LayerKey, MapMode } from '../types';

interface Props {
  fieldCenter: { latitude: number; longitude: number };
  zones: SoilZone[];
  sensors: Sensor[];
  onSelectSensor: (sensor: Sensor) => void;
  visibleLayers: LayerKey[];
  mapMode: MapMode;
}

type FieldMapComponent = React.ComponentType<Props>;

const FieldMapImpl: FieldMapComponent =
  Platform.OS === 'web'
    ? (require('./FieldMap.web').default as FieldMapComponent)
    : (require('./FieldMap.native').default as FieldMapComponent);

export default function FieldMap(props: Props) {
  return <FieldMapImpl {...props} />;
}
