import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import type { Sensor, SoilZone, LayerKey, MapMode } from '../types';

interface Props {
  fieldCenter: { latitude: number; longitude: number };
  zones: SoilZone[];
  sensors: Sensor[];
  onSelectSensor: (sensor: Sensor) => void;
  visibleLayers: LayerKey[];
  mapMode: MapMode;
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1f2937' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1120' }] }
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getHeatIntensity = (sensor: Sensor) => {
  const moistureRisk = clamp((55 - sensor.soilMoisture) / 55, 0, 1);
  const temperatureRisk = clamp((sensor.soilTemperature - 18) / 12, 0, 1);
  const phRisk = clamp(Math.abs(sensor.pH - 6.7) / 2.2, 0, 1);
  const conductivityRisk = clamp((sensor.electricalConductivity - 1.2) / 1.4, 0, 1);

  return clamp((moistureRisk + temperatureRisk + phRisk + conductivityRisk) / 4, 0.05, 1);
};

const getHeatColor = (intensity: number) => {
  if (intensity < 0.35) return 'rgba(34,197,94,0.2)';
  if (intensity < 0.65) return 'rgba(250,204,21,0.22)';
  return 'rgba(239,68,68,0.24)';
};

const statusColor = (status: string) => {
  if (status === 'healthy') return 'green';
  if (status === 'warning') return 'orange';
  if (status === 'critical') return 'red';
  return 'blue';
};

export default function FieldMap({ fieldCenter, zones, sensors, onSelectSensor, visibleLayers, mapMode }: Props) {
  const region: Region = {
    latitude: fieldCenter.latitude,
    longitude: fieldCenter.longitude,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015
  };

  const showZones = mapMode === 'zones' && visibleLayers.includes('soilMoisture');
  const showHeatmap = mapMode === 'heatmap';

  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={region}
      showsUserLocation={false}
      customMapStyle={darkMapStyle}
    >
      {showZones
        ? zones.map((zone) => (
            <Circle
              key={zone.id}
              center={zone.center}
              radius={zone.radiusMeters}
              fillColor={
                zone.color === 'green'
                  ? 'rgba(34,197,94,0.25)'
                  : zone.color === 'yellow'
                    ? 'rgba(234,179,8,0.24)'
                    : 'rgba(239,68,68,0.24)'
              }
              strokeColor={
                zone.color === 'green'
                  ? 'rgba(34,197,94,0.85)'
                  : zone.color === 'yellow'
                    ? 'rgba(234,179,8,0.85)'
                    : 'rgba(239,68,68,0.85)'
              }
              strokeWidth={2}
            />
          ))
        : null}

      {showHeatmap
        ? sensors.map((sensor) => {
            const heat = getHeatIntensity(sensor);
            return (
              <Circle
                key={`${sensor.id}-heat`}
                center={sensor.coordinates}
                radius={160 + heat * 260}
                fillColor={getHeatColor(heat)}
                strokeColor="rgba(0,0,0,0)"
                strokeWidth={0}
              />
            );
          })
        : null}

      {sensors.map((sensor) => (
        <Marker key={sensor.id} coordinate={sensor.coordinates} onPress={() => onSelectSensor(sensor)}>
          <View style={[styles.marker, { backgroundColor: statusColor(sensor.status) }]}>
            <Text style={styles.markerText}>.</Text>
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, width: '100%', minHeight: 420, borderRadius: 12 },
  marker: {
    width: 18,
    height: 18,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff'
  },
  markerText: { color: '#fff', fontSize: 14, lineHeight: 14 }
});
