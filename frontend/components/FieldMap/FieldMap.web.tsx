// To safely use mapbox-gl on the web, we must ensure it doesn't execute native mobile code.
// The .web.tsx extension guarantees this file is only bundled for the web.

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MOCK_SENSORS, MOCK_ZONES, MOOK_FIELD_COORDS } from '../../data/mockData';
import { CONFIG } from '../../constants/Config';
import { Sensor } from '../../types';

mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

interface MapProps {
  onSelectSensor: (sensor: Sensor) => void;
}

export default function FieldMapWeb({ onSelectSensor }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    // Initialize Web Mapbox GL Client
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: CONFIG.MAPBOX_STYLE_SATELLITE,
      center: [MOOK_FIELD_COORDS.longitude, MOOK_FIELD_COORDS.latitude],
      zoom: 15,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Draw Zones (Polygons)
      MOCK_ZONES.forEach((zone) => {
        const polygonCoordinates = zone.coordinates.map(coord => [coord.longitude, coord.latitude]);
        // Close the polygon array
        polygonCoordinates.push([zone.coordinates[0].longitude, zone.coordinates[0].latitude]);
        
        const fillColor = 
          zone.status === 'healthy' ? 'rgba(76, 175, 80, 0.4)' :
          zone.status === 'warning' ? 'rgba(255, 193, 7, 0.4)' :
          'rgba(244, 67, 54, 0.4)';

        const strokeColor =
          zone.status === 'healthy' ? '#4CAF50' :
          zone.status === 'warning' ? '#FFC107' : '#F44336';

        map.current.addSource(zone.id, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [polygonCoordinates]
            }
          }
        });

        map.current.addLayer({
          id: `${zone.id}-fill`,
          type: 'fill',
          source: zone.id,
          paint: {
            'fill-color': fillColor,
          }
        });

        map.current.addLayer({
          id: `${zone.id}-line`,
          type: 'line',
          source: zone.id,
          paint: {
            'line-color': strokeColor,
            'line-width': 2
          }
        });
      });

      // Draw Sensors (Markers)
      MOCK_SENSORS.forEach((sensor) => {
        const el = document.createElement('div');
        el.className = 'sensor-marker';
        const color = 
            sensor.status === 'active' ? '#4CAF50' :
            sensor.status === 'warning' ? '#FF9800' : '#F44336';
            
        el.style.backgroundColor = '#fff';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.borderRadius = '16px';
        el.style.border = `3px solid ${color}`;
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        
        el.addEventListener('click', () => {
          onSelectSensor(sensor);
        });

        if (map.current) {
          new mapboxgl.Marker(el)
            .setLngLat([sensor.coordinates.longitude, sensor.coordinates.latitude])
            .addTo(map.current);
        }
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 16, overflow: 'hidden', minHeight: 400, backgroundColor: '#e5e5e5', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
});
