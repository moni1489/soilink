import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE, Region, WMSTile } from 'react-native-maps';
import type { Sensor, SoilZone, LayerKey, MapMode, Coordinate, SoilGridsProperty, SoilDepth } from '../types';
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
  selectedSoilProperty?: SoilGridsProperty;
  selectedDepth?: SoilDepth;
  mapMode: MapMode;
  theme?: 'light' | 'dark';
  historicalOffset?: number;
}

const SOILGRIDS_CONFIG: Record<SoilGridsProperty, { id: number; slug: string }> = {
  clay: { id: 6, slug: 'clay' },
  sand: { id: 2, slug: 'sand' },
  silt: { id: 4, slug: 'silt' },
  phh2o: { id: 10, slug: 'phh2o' },
  nitrogen: { id: 26, slug: 'nitrogen' },
  soc: { id: 30, slug: 'soc' },
  bdod: { id: 13, slug: 'bdod' },
};

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
  selectedSoilProperty = 'clay',
  selectedDepth = '0-5cm',
  mapMode,
  theme = 'dark',
  historicalOffset = 0
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const loadingTimeoutRef = React.useRef<any>(null);
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

  const showZones = mapMode === 'zones';
  const showHeatmap = mapMode === 'heatmap';

  const temporalSensors = useMemo(() => {
    if (historicalOffset === 0) return sensors;
    return sensors.map(s => ({
      ...s,
      soilMoisture: Math.max(0, Math.min(100, s.soilMoisture + Math.sin(historicalOffset * 1.5 + (s.id === 'sensor-3' ? 5 : 0)) * 25)),
      pH: Math.max(0, Math.min(14, s.pH + Math.cos(historicalOffset * 0.8) * 0.8))
    }));
  }, [sensors, historicalOffset]);

  const zoneHeatIndex = useMemo(
    () => buildZoneHeatIndex(zones, temporalSensors, visibleLayers),
    [zones, temporalSensors, visibleLayers]
  );

  return (
    <MapView
      key={fieldCenter.latitude + '-' + fieldCenter.longitude}
      style={styles.map}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialCamera={{
        center: { latitude: region.latitude, longitude: region.longitude },
        pitch: 45,
        heading: -15,
        altitude: 2000,
        zoom: 15.5
      }}
      mapType={mapMode === 'satellite' ? 'hybrid' : 'standard'}
      customMapStyle={theme === 'dark' ? darkMapStyle : undefined}
      showsUserLocation={false}
      pitchEnabled={true}
    >
      {visibleLayers.includes('soilGrids') && (
        <WMSTile
          key={`${selectedSoilProperty}-${selectedDepth}`}
          urlTemplate={`https://maps.isric.org/mapserv?map=/srv/node/mappings/${SOILGRIDS_CONFIG[selectedSoilProperty].id}.map&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${SOILGRIDS_CONFIG[selectedSoilProperty].slug}_${selectedDepth}_mean&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE&HEIGHT=256&WIDTH=256&CRS=EPSG:3857&BBOX={minX},{minY},{maxX},{maxY}`}
          tileSize={256}
          opacity={0.65}
        />
      )}
      <Polygon
        coordinates={fieldBoundary}
        fillColor="rgba(0,0,0,0)"
        strokeColor="#00F59B"
        strokeWidth={3}
      />

      {zones.map((zone) => (
        <Polygon
          key={zone.id}
          coordinates={zone.polygon}
          tappable
          onPress={() => onSelectZone(zone)}
          fillColor={
            showHeatmap
              ? getZoneHeatFill(zoneHeatIndex[zone.id] ?? 0.05)
              : (showZones ? getZoneFillColor(zone.color, 0.32) : 'rgba(0,0,0,0)')
          }
          strokeColor="rgba(226,247,236,0.6)"
          strokeWidth={1.5}
        />
      ))}

      {zones.map((zone) => {
        const centroid = {
          latitude: zone.polygon.reduce((sum, p) => sum + p.latitude, 0) / zone.polygon.length,
          longitude: zone.polygon.reduce((sum, p) => sum + p.longitude, 0) / zone.polygon.length
        };
        return (
          <Marker
            key={`label-${zone.id}`}
            coordinate={centroid}
            tracksViewChanges={false}
          >
            <View style={styles.zoneLabelContainer}>
              <Text style={[styles.zoneLabelText, { color: theme === 'light' ? '#334155' : '#f8fafc' }]}>
                {zone.name}
              </Text>
            </View>
          </Marker>
        );
      })}

      {activeZoneId
        ? zones
            .filter((zone) => zone.id === activeZoneId)
            .map((zone) => (
              <Polygon
                key={`active-${zone.id}`}
                coordinates={zone.polygon}
                fillColor="rgba(0,0,0,0)"
                strokeColor="rgba(103,232,249,0.98)"
                strokeWidth={4.2}
              />
            ))
        : null}

      {/* Sensors removed as requested */}
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
  },
  zoneLabelContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.1)'
  },
  zoneLabelText: {
    fontSize: 10,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  }
});
