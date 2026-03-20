import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import type { Sensor, SoilZone, LayerKey, MapMode } from '../types';
import mapboxConfig from '../config/mapbox';

interface Props {
  fieldCenter: { latitude: number; longitude: number };
  zones: SoilZone[];
  sensors: Sensor[];
  onSelectSensor: (sensor: Sensor) => void;
  visibleLayers: LayerKey[];
  mapMode: MapMode;
}

const mapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '450px',
  borderRadius: '12px',
  overflow: 'hidden',
  background: '#111827'
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getHeatIntensity = (sensor: Sensor) => {
  const moistureRisk = clamp((55 - sensor.soilMoisture) / 55, 0, 1);
  const temperatureRisk = clamp((sensor.soilTemperature - 18) / 12, 0, 1);
  const phRisk = clamp(Math.abs(sensor.pH - 6.7) / 2.2, 0, 1);
  const conductivityRisk = clamp((sensor.electricalConductivity - 1.2) / 1.4, 0, 1);

  return clamp((moistureRisk + temperatureRisk + phRisk + conductivityRisk) / 4, 0.05, 1);
};

export default function FieldMap({ fieldCenter, zones, sensors, onSelectSensor, visibleLayers, mapMode }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let map: any = null;

    const init = async () => {
      if (!containerRef.current) return;

      const token = mapboxConfig.token?.trim();
      if (!token) {
        setError('Mapbox token is missing.');
        return;
      }

      try {
        const mapboxgl = (await import('mapbox-gl')).default;

        try {
          await import('mapbox-gl/dist/mapbox-gl.css');
        } catch {
          // CSS import can fail in some bundler setups; map can still render.
        }

        mapboxgl.accessToken = token;

        map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [fieldCenter.longitude, fieldCenter.latitude],
          zoom: 14
        });

        map.on('error', (event: any) => {
          const message = event?.error?.message as string | undefined;
          if (message) setError(`Mapbox error: ${message}`);
        });

        map.on('load', () => {
          const showZones = mapMode === 'zones' && visibleLayers.includes('soilMoisture');
          const showHeatmap = mapMode === 'heatmap';

          map.addSource('zones', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: zones.map((zone) => ({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [zone.center.longitude, zone.center.latitude]
                },
                properties: { color: zone.color }
              }))
            }
          });

          map.addLayer({
            id: 'zone-circles',
            type: 'circle',
            source: 'zones',
            layout: {
              visibility: showZones ? 'visible' : 'none'
            },
            paint: {
              'circle-color': ['match', ['get', 'color'], 'green', '#22c55e', 'yellow', '#facc15', 'red', '#ef4444', '#000'],
              'circle-opacity': 0.24,
              'circle-radius': 82,
              'circle-stroke-width': 2,
              'circle-stroke-color': ['match', ['get', 'color'], 'green', '#4ade80', 'yellow', '#fde047', 'red', '#f87171', '#000']
            }
          });

          map.addSource('sensor-heat', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: sensors.map((sensor) => ({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [sensor.coordinates.longitude, sensor.coordinates.latitude]
                },
                properties: {
                  intensity: getHeatIntensity(sensor)
                }
              }))
            }
          });

          map.addLayer({
            id: 'sensor-heat-layer',
            type: 'heatmap',
            source: 'sensor-heat',
            layout: {
              visibility: showHeatmap ? 'visible' : 'none'
            },
            paint: {
              'heatmap-weight': ['get', 'intensity'],
              'heatmap-intensity': 1.1,
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 14, 35, 17, 50],
              'heatmap-opacity': 0.84,
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0,
                'rgba(34,197,94,0)',
                0.25,
                'rgba(74,222,128,0.35)',
                0.55,
                'rgba(250,204,21,0.55)',
                0.8,
                'rgba(249,115,22,0.72)',
                1,
                'rgba(239,68,68,0.9)'
              ]
            }
          });

          sensors.forEach((sensor) => {
            const markerElement = document.createElement('button');
            markerElement.style.width = '18px';
            markerElement.style.height = '18px';
            markerElement.style.borderRadius = '999px';
            markerElement.style.backgroundColor =
              sensor.status === 'healthy' ? '#22c55e' : sensor.status === 'warning' ? '#f97316' : '#ef4444';
            markerElement.style.border = '2px solid #fff';
            markerElement.style.cursor = 'pointer';
            markerElement.style.padding = '0';
            markerElement.style.outline = 'none';
            markerElement.title = sensor.name;
            markerElement.onclick = () => onSelectSensor(sensor);

            new mapboxgl.Marker(markerElement)
              .setLngLat([sensor.coordinates.longitude, sensor.coordinates.latitude])
              .addTo(map);
          });

          map.resize();
          setTimeout(() => map?.resize(), 0);
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`Mapbox failed to load: ${message}`);
      }
    };

    init();

    return () => {
      if (map) map.remove();
    };
  }, [fieldCenter, zones, sensors, onSelectSensor, visibleLayers, mapMode]);

  if (error) {
    return (
      <View style={styles.webError}>
        <Text>{error}</Text>
      </View>
    );
  }

  return <div ref={containerRef} style={mapContainerStyle} />;
}

const styles = StyleSheet.create({
  webError: { padding: 20, backgroundColor: '#fee2e2', borderRadius: 8 }
});
