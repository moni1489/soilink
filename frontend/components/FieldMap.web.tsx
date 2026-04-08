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
  borderRadius: '18px',
  overflow: 'hidden',
  background: '#0F1115',
  border: '1px solid rgba(255,255,255,0.05)'
};
const STATUS_COLOR: Record<Sensor['status'], string> = {
  healthy: '#00F59B',
  warning: '#FFB02E',
  critical: '#FF4D4D'
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
  const popupRef = useRef<any | null>(null);
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
        if (!document.getElementById('sensor-pulse-style')) {
          const styleElement = document.createElement('style');
          styleElement.id = 'sensor-pulse-style';
          styleElement.textContent = `
            .sensor-node-halo { animation: sensorPulse 1.7s ease-out infinite; }
            @keyframes sensorPulse {
              0% { transform: scale(0.8); opacity: 0.65; }
              70% { transform: scale(1.8); opacity: 0.05; }
              100% { transform: scale(2.1); opacity: 0; }
            }
          `;
          document.head.appendChild(styleElement);
        }

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/navigation-night-v1',
          center: [fieldCenter.longitude, fieldCenter.latitude],
          zoom: 15.5,
          pitch: 55,
          bearing: -15,
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

            map.fitBounds(bounds, { padding: 44, duration: 1400, maxZoom: 16.2 });
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

          // Add a beautiful sky layer for 3D horizon
          map.addLayer({
            id: 'sky',
            type: 'sky',
            paint: {
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [0.0, 0.0],
              'sky-atmosphere-sun-intensity': 15
            }
          });

          map.addLayer({
            id: 'field-boundary-fill',
            type: 'fill',
            source: 'field-boundary',
            paint: {
              'fill-color': '#0F1115',
              'fill-opacity': 0.08
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
                '#00F59B',
                'yellow',
                '#FFB02E',
                'red',
                '#FF4D4D',
                '#00F59B'
              ],
              'fill-opacity': 0.1
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
                24,
                13,
                34,
                15,
                48,
                17,
                64
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
                'rgba(30,58,138,0)',
                0.15,
                'rgba(30,64,175,0.45)',
                0.38,
                'rgba(0,245,155,0.72)',
                0.62,
                'rgba(255,176,46,0.84)',
                1,
                'rgba(210,105,79,0.94)'
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
              'line-color': '#00F59B',
              'line-width': 2
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
              'line-color': '#00F59B',
              'line-width': 2
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
          markerRef.current = sensors.slice(0, 5).map((sensor, index) => {
            const markerElement = document.createElement('button');
            markerElement.style.width = '26px';
            markerElement.style.height = '26px';
            markerElement.style.borderRadius = '999px';
            markerElement.style.backgroundColor = 'transparent';
            markerElement.style.border = 'none';
            markerElement.style.cursor = 'pointer';
            markerElement.style.padding = '0';
            markerElement.style.outline = 'none';
            markerElement.style.display = 'flex';
            markerElement.style.alignItems = 'center';
            markerElement.style.justifyContent = 'center';
            markerElement.style.position = 'relative';
            markerElement.style.boxShadow =
              sensor.status === 'critical' ? '0 0 20px rgba(255,77,77,0.62)' : '0 0 10px rgba(255,255,255,0.25)';
            markerElement.title = `S${index + 1}`;
            markerElement.onclick = () => onSelectSensorRef.current(sensor);

            const halo = document.createElement('span');
            halo.className = 'sensor-node-halo';
            halo.style.position = 'absolute';
            halo.style.width = '26px';
            halo.style.height = '26px';
            halo.style.borderRadius = '999px';
            halo.style.border = `1px solid ${sensor.status === 'critical' ? '#FF4D4D' : '#FFFFFF'}`;
            halo.style.backgroundColor =
              sensor.status === 'critical' ? 'rgba(255,77,77,0.25)' : 'rgba(255,255,255,0.16)';
            markerElement.appendChild(halo);

            const centerDot = document.createElement('div');
            centerDot.style.width = '10px';
            centerDot.style.height = '10px';
            centerDot.style.borderRadius = '999px';
            centerDot.style.backgroundColor = '#ffffff';
            centerDot.style.border = `1px solid ${STATUS_COLOR[sensor.status]}`;
            centerDot.style.zIndex = '2';
            markerElement.appendChild(centerDot);

            markerElement.onmouseenter = () => {
              if (!popupRef.current) {
                popupRef.current = new mapboxgl.Popup({
                  closeButton: false,
                  closeOnClick: false,
                  offset: 16
                });
              }
              popupRef.current
                .setLngLat([sensor.coordinates.longitude, sensor.coordinates.latitude])
                .setHTML(`
                  <div style="min-width:160px;padding:12px 14px;border-radius:14px;background:rgba(20,24,30,0.85);backdrop-filter: blur(14px);-webkit-backdrop-filter: blur(14px);border:1px solid rgba(255,255,255,0.12);box-shadow: 0 8px 32px rgba(0,0,0,0.4);color:#F8FAFC;font-family:Inter,system-ui,sans-serif;transform: translateY(-4px);transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                      <span style="font-size:10px;font-weight:700;letter-spacing:0.06em;color:#94A3B8;text-transform:uppercase;">${sensor.name || 'S' + (index + 1)}</span>
                      <span style="width:8px;height:8px;border-radius:999px;background-color:${STATUS_COLOR[sensor.status]};box-shadow: 0 0 8px ${STATUS_COLOR[sensor.status]}"></span>
                    </div>
                    <div style="font-size:13px;font-weight:600;line-height:1.6;">Temp: <span style="font-weight:400;color:#cbd5e1">${sensor.soilTemperature.toFixed(0)}°C</span></div>
                    <div style="font-size:13px;font-weight:600;line-height:1.6;">Moisture: <span style="font-weight:400;color:#cbd5e1">${sensor.soilMoisture}%</span></div>
                  </div>
                `)
                .addTo(map);
            };
            markerElement.onmouseleave = () => {
              if (popupRef.current) popupRef.current.remove();
            };

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
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [fieldCenter.latitude, fieldCenter.longitude, fieldBoundary, sensors]);

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
