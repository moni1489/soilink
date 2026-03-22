import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import type { Sensor, SoilZone, LayerKey, MapMode, Coordinate } from '../types';
import mapboxConfig from '../config/mapbox';
import { closeRing, generateHeatGridPoints, getPolygonCentroid, pointInPolygon } from '../utils/map';

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

const mapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '68vh',
  minHeight: '620px',
  maxHeight: '860px',
  borderRadius: '14px',
  overflow: 'hidden',
  background: '#08111f',
  border: '1px solid #233247'
};

const toLngLat = (point: Coordinate) => [point.longitude, point.latitude] as [number, number];

const getZonesGeoJson = (zones: SoilZone[]) => ({
  type: 'FeatureCollection' as const,
  features: zones.map((zone) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [closeRing(zone.polygon).map(toLngLat)]
    },
    properties: {
      id: zone.id,
      color: zone.color,
      name: zone.name
    }
  }))
});

const getHeatGeoJson = (
  boundary: Coordinate[],
  sensors: Sensor[],
  visibleLayers: LayerKey[]
) => ({
  type: 'FeatureCollection' as const,
  features: generateHeatGridPoints(boundary, sensors, visibleLayers, 36).map((point, index) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [point.longitude, point.latitude]
    },
    properties: {
      id: `heat-${index}`,
      intensity: point.intensity
    }
  }))
});

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const markerRef = useRef<any[]>([]);
  const onSelectSensorRef = useRef(onSelectSensor);
  const onSelectZoneRef = useRef(onSelectZone);
  const zonesRef = useRef(zones);
  const [error, setError] = useState<string | null>(null);

  const zonesGeoJson = useMemo(() => getZonesGeoJson(zones), [zones]);
  const heatGeoJson = useMemo(
    () => getHeatGeoJson(fieldBoundary, sensors, visibleLayers),
    [fieldBoundary, sensors, visibleLayers]
  );

  useEffect(() => {
    onSelectSensorRef.current = onSelectSensor;
  }, [onSelectSensor]);

  useEffect(() => {
    onSelectZoneRef.current = onSelectZone;
    zonesRef.current = zones;
  }, [onSelectZone, zones]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!containerRef.current) return;

      const token = mapboxConfig.token?.trim();
      if (!token) {
        setError('Mapbox token is missing. Add EXPO_PUBLIC_MAPBOX_TOKEN and restart Expo.');
        return;
      }

      try {
        const mapboxgl = (await import('mapbox-gl')).default;

        try {
          await import('mapbox-gl/dist/mapbox-gl.css');
        } catch {
          // CSS import can fail in some bundler setups.
        }

        if (cancelled) return;

        mapboxgl.accessToken = token;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [fieldCenter.longitude, fieldCenter.latitude],
          zoom: 15.5,
          pitch: 0,
          attributionControl: false
        });

        mapRef.current = map;

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

        map.on('error', (event: any) => {
          const message = event?.error?.message as string | undefined;
          if (message) setError(`Mapbox error: ${message}`);
        });

        map.on('load', () => {
          const showZones = mapMode === 'zones' && visibleLayers.length > 0;
          const showHeatmap = mapMode === 'heatmap' && visibleLayers.length > 0;
          const boundaryCoordinates = closeRing(fieldBoundary).map(toLngLat);
          const focusCoordinates = [
            ...boundaryCoordinates,
            ...sensors.map(
              (sensor) => [sensor.coordinates.longitude, sensor.coordinates.latitude] as [number, number]
            )
          ];

          if (focusCoordinates.length > 1) {
            const bounds = focusCoordinates.reduce(
              (collection, coordinate) => collection.extend(coordinate),
              new mapboxgl.LngLatBounds(focusCoordinates[0], focusCoordinates[0])
            );

            map.fitBounds(bounds, { padding: 44, duration: 0, maxZoom: 16.2 });
          }

          map.addSource('field-boundary', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Polygon',
                    coordinates: [boundaryCoordinates]
                  },
                  properties: {}
                }
              ]
            }
          });

          map.addSource('zones', {
            type: 'geojson',
            data: zonesGeoJson
          });

          map.addSource('heat-points', {
            type: 'geojson',
            data: heatGeoJson
          });

          map.addLayer({
            id: 'field-boundary-fill',
            type: 'fill',
            source: 'field-boundary',
            paint: {
              'fill-color': '#0b2f23',
              'fill-opacity': 0.12
            }
          });

          map.addLayer({
            id: 'zone-polygons-fill',
            type: 'fill',
            source: 'zones',
            layout: {
              visibility: showZones ? 'visible' : 'none'
            },
            paint: {
              'fill-color': [
                'match',
                ['get', 'color'],
                'green',
                '#166534',
                'yellow',
                '#a16207',
                'red',
                '#991b1b',
                '#166534'
              ],
              'fill-opacity': 0.28
            }
          });

          map.addLayer({
            id: 'heat-surface',
            type: 'heatmap',
            source: 'heat-points',
            maxzoom: 18,
            layout: {
              visibility: showHeatmap ? 'visible' : 'none'
            },
            paint: {
              'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['get', 'intensity'],
                0,
                0.08,
                0.4,
                0.4,
                0.7,
                0.75,
                1,
                1.15
              ],
              'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                11,
                0.9,
                13,
                1.15,
                15,
                1.45,
                17,
                1.75
              ],
              'heatmap-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                11,
                18,
                13,
                26,
                15,
                36,
                17,
                48
              ],
              'heatmap-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                11,
                0.72,
                14,
                0.82,
                17,
                0.9
              ],
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0,
                'rgba(34,197,94,0)',
                0.18,
                'rgba(34,197,94,0.62)',
                0.38,
                'rgba(250,204,21,0.74)',
                0.62,
                'rgba(251,146,60,0.82)',
                1,
                'rgba(239,68,68,0.94)'
              ]
            }
          });

          map.addLayer({
            id: 'field-boundary-line',
            type: 'line',
            source: 'field-boundary',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#9ee6b5',
              'line-width': 2.3
            }
          });

          map.addLayer({
            id: 'zone-polygons-line',
            type: 'line',
            source: 'zones',
            layout: {
              visibility: showZones || showHeatmap ? 'visible' : 'none',
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#e2f7ec',
              'line-width': 2.1
            }
          });

          map.addLayer({
            id: 'active-zone-line',
            type: 'line',
            source: 'zones',
            layout: {
              visibility: activeZoneId ? 'visible' : 'none',
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#67e8f9',
              'line-width': 3.3
            },
            filter: ['==', ['get', 'id'], activeZoneId ?? '__none__']
          });

          map.addSource('zone-labels', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: zones.map((zone) => {
                const centroid = getPolygonCentroid(zone.polygon);
                return {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [centroid.longitude, centroid.latitude]
                  },
                  properties: { name: zone.name }
                };
              })
            }
          });

          map.addLayer({
            id: 'zone-label-layer',
            type: 'symbol',
            source: 'zone-labels',
            layout: {
              visibility: showZones ? 'visible' : 'none',
              'text-field': ['get', 'name'],
              'text-size': 12,
              'text-font': ['Open Sans Semibold']
            },
            paint: {
              'text-color': '#f8fafc',
              'text-halo-color': '#020617',
              'text-halo-width': 1.2
            }
          });

          const handleZoneClick = (event: any) => {
            const zoneId = event?.features?.[0]?.properties?.id as string | undefined;
            if (!zoneId) return;
            const zone = zonesRef.current.find((item) => item.id === zoneId);
            if (zone) onSelectZoneRef.current(zone);
          };

          const handleHeatClick = (event: any) => {
            const longitude = event?.lngLat?.lng as number | undefined;
            const latitude = event?.lngLat?.lat as number | undefined;
            if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
            const zone = zonesRef.current.find((item) =>
              pointInPolygon({ latitude, longitude }, item.polygon)
            );
            if (zone) onSelectZoneRef.current(zone);
          };

          map.on('click', 'zone-polygons-fill', handleZoneClick);
          map.on('click', 'heat-surface', handleHeatClick);

          const setPointer = () => {
            map.getCanvas().style.cursor = 'pointer';
          };
          const unsetPointer = () => {
            map.getCanvas().style.cursor = '';
          };

          map.on('mouseenter', 'zone-polygons-fill', setPointer);
          map.on('mouseleave', 'zone-polygons-fill', unsetPointer);
          map.on('mouseenter', 'heat-surface', setPointer);
          map.on('mouseleave', 'heat-surface', unsetPointer);

          markerRef.current.forEach((marker) => marker.remove());
          markerRef.current = sensors.map((sensor) => {
            const markerElement = document.createElement('button');
            markerElement.style.width = '22px';
            markerElement.style.height = '22px';
            markerElement.style.borderRadius = '999px';
            markerElement.style.backgroundColor =
              sensor.status === 'healthy'
                ? '#16a34a'
                : sensor.status === 'warning'
                  ? '#d97706'
                  : '#dc2626';
            markerElement.style.border = '3px solid #ffffff';
            markerElement.style.cursor = 'pointer';
            markerElement.style.padding = '0';
            markerElement.style.outline = 'none';
            markerElement.style.display = 'flex';
            markerElement.style.alignItems = 'center';
            markerElement.style.justifyContent = 'center';
            markerElement.style.boxShadow = '0 0 0 1px rgba(8,17,31,0.45), 0 6px 18px rgba(8,17,31,0.45)';
            markerElement.title = sensor.name;
            markerElement.onclick = () => onSelectSensorRef.current(sensor);

            const centerDot = document.createElement('span');
            centerDot.style.width = '6px';
            centerDot.style.height = '6px';
            centerDot.style.borderRadius = '999px';
            centerDot.style.backgroundColor = '#ffffff';
            markerElement.appendChild(centerDot);

            return new mapboxgl.Marker(markerElement)
              .setLngLat([sensor.coordinates.longitude, sensor.coordinates.latitude])
              .addTo(map);
          });

          map.resize();
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`Mapbox failed to load: ${message}`);
      }
    };

    init();

    return () => {
      cancelled = true;
      markerRef.current.forEach((marker) => marker.remove());
      markerRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [fieldCenter.latitude, fieldCenter.longitude, fieldBoundary, zones, sensors, activeZoneId, mapMode, visibleLayers, zonesGeoJson, heatGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const showZones = mapMode === 'zones' && visibleLayers.length > 0;
    const showHeatmap = mapMode === 'heatmap' && visibleLayers.length > 0;

    if (map.getLayer('zone-polygons-fill')) {
      map.setLayoutProperty('zone-polygons-fill', 'visibility', showZones ? 'visible' : 'none');
    }
    if (map.getLayer('heat-surface')) {
      map.setLayoutProperty('heat-surface', 'visibility', showHeatmap ? 'visible' : 'none');
    }
    if (map.getLayer('zone-polygons-line')) {
      map.setLayoutProperty(
        'zone-polygons-line',
        'visibility',
        showZones || showHeatmap ? 'visible' : 'none'
      );
    }
    if (map.getLayer('zone-label-layer')) {
      map.setLayoutProperty('zone-label-layer', 'visibility', showZones ? 'visible' : 'none');
    }
    if (map.getLayer('active-zone-line')) {
      map.setLayoutProperty('active-zone-line', 'visibility', activeZoneId ? 'visible' : 'none');
      map.setFilter('active-zone-line', ['==', ['get', 'id'], activeZoneId ?? '__none__']);
    }

    const zoneSource = map.getSource('zones') as any;
    if (zoneSource?.setData) zoneSource.setData(zonesGeoJson);

    const heatSource = map.getSource('heat-points') as any;
    if (heatSource?.setData) heatSource.setData(heatGeoJson);
  }, [mapMode, visibleLayers, zonesGeoJson, heatGeoJson, activeZoneId]);

  if (error) {
    return (
      <View style={styles.webError}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return <div ref={containerRef} style={mapContainerStyle} />;
}

const styles = StyleSheet.create({
  webError: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7f1d1d',
    backgroundColor: '#1f1115'
  },
  errorText: {
    color: '#fecaca'
  }
});
