import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import type { Sensor, SoilZone, LayerKey, MapMode, Coordinate } from '../types';
import { buildZoneHeatIndex, getSensorHeatIntensity, getZoneFillColor } from '../utils/map';

interface Props {
  fieldCenter: { latitude: number; longitude: number };
  fieldBoundary: Coordinate[];
  zones: SoilZone[];
  sensors: Sensor[];
  onSelectSensor: (sensor: Sensor) => void;
  onSelectZone: (zone: SoilZone) => void;
  activeZoneId?: string;
  visibleLayers: LayerKey[];
  mapMode: MapMode;
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#020617' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#113127' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2a3648' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0b1220' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b2447' }] }
];

const statusColor = (status: Sensor['status']) => {
  if (status === 'healthy') return '#16a34a';
  if (status === 'warning') return '#d97706';
  return '#dc2626';
};

const getZoneHeatFill = (intensity: number) => {
  if (intensity < 0.35) return 'rgba(34,197,94,0.50)';
  if (intensity < 0.65) return 'rgba(250,204,21,0.56)';
  if (intensity < 0.82) return 'rgba(249,115,22,0.62)';
  return 'rgba(220,38,38,0.68)';
};

export default function FieldMap({
  fieldCenter,
  fieldBoundary,
  zones,
  sensors,
  onSelectSensor,
  onSelectZone,
  activeZoneId,
  visibleLayers,
  mapMode
}: Props) {
  const region: Region = useMemo(() => {
    const latitudes = fieldBoundary.map((point) => point.latitude);
    const longitudes = fieldBoundary.map((point) => point.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.75, 0.004),
      longitudeDelta: Math.max((maxLng - minLng) * 1.75, 0.004)
    };
  }, [fieldBoundary]);

  const showZones = mapMode === 'zones' && visibleLayers.length > 0;
  const showHeatmap = mapMode === 'heatmap' && visibleLayers.length > 0;

  const zoneHeatIndex = useMemo(
    () => buildZoneHeatIndex(zones, sensors, visibleLayers),
    [zones, sensors, visibleLayers]
  );

  return (
    <MapView
      key={fieldCenter.latitude + '-' + fieldCenter.longitude}
      style={styles.map}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={region}
      mapType="standard"
      customMapStyle={Platform.OS === 'android' ? darkMapStyle : undefined}
      showsUserLocation={false}
    >
      <Polygon
        coordinates={fieldBoundary}
        fillColor="rgba(11,18,32,0.05)"
        strokeColor="rgba(158,230,181,0.96)"
        strokeWidth={2.1}
      />

      {showZones || showHeatmap
        ? zones.map((zone) => (
            <Polygon
              key={zone.id}
              coordinates={zone.polygon}
              tappable
              onPress={() => onSelectZone(zone)}
              fillColor={
                showHeatmap
                  ? getZoneHeatFill(zoneHeatIndex[zone.id] ?? 0.05)
                  : getZoneFillColor(zone.color, 0.32)
              }
              strokeColor="rgba(226,247,236,0.96)"
              strokeWidth={2.1}
            />
          ))
        : null}

      {activeZoneId
        ? zones
            .filter((zone) => zone.id === activeZoneId)
            .map((zone) => (
              <Polygon
                key={`active-${zone.id}`}
                coordinates={zone.polygon}
                fillColor="rgba(0,0,0,0)"
                strokeColor="rgba(103,232,249,0.98)"
                strokeWidth={3.4}
              />
            ))
        : null}

      {sensors.map((sensor) => (
        <Marker
          key={sensor.id}
          coordinate={sensor.coordinates}
          onPress={() => onSelectSensor(sensor)}
          tracksViewChanges={false}
        >
          <View
            style={[
              styles.marker,
              {
                backgroundColor: statusColor(sensor.status),
                opacity: 0.92 + getSensorHeatIntensity(sensor, visibleLayers) * 0.08
              }
            ]}
          >
            <View style={styles.markerCore} />
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
    minHeight: 430,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#233247'
  },
  marker: {
    width: 22,
    height: 22,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#020617',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6
  },
  markerCore: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: '#ffffff'
  }
});
