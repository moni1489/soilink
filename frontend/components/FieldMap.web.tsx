import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import type { Sensor, SoilZone, LayerKey, MapMode, Coordinate, SoilGridsProperty, SoilDepth } from '../types';
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
  selectedSoilProperty?: SoilGridsProperty;
  selectedDepth?: SoilDepth;
  mapMode: MapMode;
  theme?: 'light' | 'dark';
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
  selectedSoilProperty = 'clay',
  selectedDepth = '0-5cm',
  mapMode,
  theme = 'dark'
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const loadingTimeoutRef = useRef<any>(null);
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
        try { await import('mapbox-gl/dist/mapbox-gl.css'); } catch {}

        if (cancelled) return;
        mapboxgl.accessToken = token;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: theme === 'light' ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/dark-v11',
          center: [fieldCenter.longitude, fieldCenter.latitude],
          zoom: 15.5,
          pitch: 55,
          bearing: -15,
          attributionControl: false
        });

        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

        const addSourcesAndLayers = () => {
          if (cancelled || !mapRef.current) return;
          const currentMap = mapRef.current;

          // Sources
          if (!currentMap.getSource('field-boundary')) {
            currentMap.addSource('field-boundary', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: [{
                  type: 'Feature',
                  geometry: { type: 'Polygon', coordinates: [closeRing(fieldBoundary).map(toLngLat)] },
                  properties: {}
                }]
              }
            });
          }

          if (!currentMap.getSource('zones')) {
            currentMap.addSource('zones', { type: 'geojson', data: zonesGeoJson });
          }

          if (!currentMap.getSource('heat-points')) {
            currentMap.addSource('heat-points', { type: 'geojson', data: heatGeoJson });
          }

          if (!currentMap.getSource('soilgrids-source')) {
            const config = SOILGRIDS_CONFIG[selectedSoilProperty];
            const layerName = `${config.slug}_${selectedDepth}_mean`;
            currentMap.addSource('soilgrids-source', {
              type: 'raster',
              tiles: [`https://maps.isric.org/mapserv?map=/srv/node/mappings/${config.id}.map&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${layerName}&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE&HEIGHT=256&WIDTH=256&CRS=EPSG:3857&BBOX={bbox-epsg-3857}`],
              tileSize: 256
            });
          }

          if (!currentMap.getSource('zone-labels')) {
            currentMap.addSource('zone-labels', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: zonesRef.current.map((zone) => {
                  const centroid = getPolygonCentroid(zone.polygon);
                  return {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [centroid.longitude, centroid.latitude] },
                    properties: { name: zone.name }
                  };
                })
              }
            });
          }

          // Layers
          if (!currentMap.getLayer('sky')) {
            currentMap.addLayer({
              id: 'sky',
              type: 'sky',
              paint: { 'sky-type': 'atmosphere', 'sky-atmosphere-sun': [0.0, 0.0], 'sky-atmosphere-sun-intensity': 15 }
            });
          }

          if (!currentMap.getLayer('soilgrids-layer')) {
            currentMap.addLayer({
              id: 'soilgrids-layer',
              type: 'raster',
              source: 'soilgrids-source',
              paint: { 'raster-opacity': 0.7 },
              layout: { visibility: visibleLayers.includes('soilGrids') ? 'visible' : 'none' }
            }, 'zone-polygons-fill');
          }

          if (!currentMap.getLayer('field-boundary-fill')) {
            currentMap.addLayer({
              id: 'field-boundary-fill',
              type: 'fill',
              source: 'field-boundary',
              paint: {
                'fill-color': theme === 'light' ? '#F1F5F9' : '#000000',
                'fill-opacity': theme === 'light' ? 0.3 : 0.2
              }
            });
          }

          if (!currentMap.getLayer('zone-polygons-fill')) {
            currentMap.addLayer({
              id: 'zone-polygons-fill',
              type: 'fill',
              source: 'zones',
              paint: {
                'fill-color': ['get', 'color'],
                'fill-opacity': mapMode === 'zones' ? 0.4 : 0
              }
            });
          }

          if (!currentMap.getLayer('zone-polygons-line')) {
            currentMap.addLayer({
              id: 'zone-polygons-line',
              type: 'line',
              source: 'zones',
              paint: {
                'line-color': '#00F59B',
                'line-width': 1.5,
                'line-opacity': 0.5
              }
            });
          }

          if (!currentMap.getLayer('heat-surface')) {
            currentMap.addLayer({
              id: 'heat-surface',
              type: 'heatmap',
              source: 'heat-points',
              layout: { visibility: mapMode === 'heatmap' ? 'visible' : 'none' },
              paint: {
                'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0.08, 1, 1.15],
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 11, 0.9, 17, 1.75],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 11, 24, 17, 64],
                'heatmap-opacity': 0.8,
                'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(30,58,138,0)', 0.38, 'rgba(0,245,155,0.72)', 1, 'rgba(210,105,79,0.94)']
              }
            });
          }

          if (!currentMap.getLayer('field-boundary-line')) {
            currentMap.addLayer({
              id: 'field-boundary-line',
              type: 'line',
              source: 'field-boundary',
              paint: { 'line-color': '#00F59B', 'line-width': 2.5 }
            });
          }

          if (!currentMap.getLayer('active-zone-line')) {
            currentMap.addLayer({
              id: 'active-zone-line',
              type: 'line',
              source: 'zones',
              layout: { visibility: activeZoneId ? 'visible' : 'none' },
              paint: { 'line-color': '#67e8f9', 'line-width': 3.5 },
              filter: ['==', ['get', 'id'], activeZoneId ?? '__none__']
            });
          }

          if (!currentMap.getLayer('zone-label-layer')) {
            currentMap.addLayer({
              id: 'zone-label-layer',
              type: 'symbol',
              source: 'zone-labels',
              layout: {
                visibility: mapMode === 'zones' ? 'visible' : 'none',
                'text-field': ['get', 'name'],
                'text-size': 12,
                'text-font': ['Open Sans Semibold']
              },
              paint: {
                'text-color': theme === 'light' ? '#334155' : '#f8fafc',
                'text-halo-color': theme === 'light' ? '#ffffff' : '#020617',
                'text-halo-width': 1.2
              }
            });
          }
        };

        map.on('load', () => {
          if (cancelled) return;
          addSourcesAndLayers();

          // Focus logic
          const bounds = closeRing(fieldBoundary).reduce(
            (col, coord) => col.extend([coord.longitude, coord.latitude]),
            new mapboxgl.LngLatBounds(toLngLat(fieldBoundary[0]), toLngLat(fieldBoundary[0]))
          );
          map.fitBounds(bounds, { padding: 44, duration: 1000, maxZoom: 16 });

          // Interactivity
          map.on('click', 'zone-polygons-fill', (e: any) => {
            const props = e.features[0].properties;
            const zone = zones.find((z) => z.id === props.id);
            if (zone) onSelectZone(zone);
          });

          const setPtr = () => { map.getCanvas().style.cursor = 'pointer'; };
          const unsetPtr = () => { map.getCanvas().style.cursor = ''; };
          map.on('mouseenter', 'zone-polygons-fill', setPtr);
          map.on('mouseleave', 'zone-polygons-fill', unsetPtr);
        });

        map.on('style.load', () => {
          if (cancelled) return;
          addSourcesAndLayers();
        });

      } catch (err) {
        setError(`Mapbox failed: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    };

    init();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [fieldCenter.latitude, fieldCenter.longitude, fieldBoundary]);

  // Update heatmap and interaction layer opacity
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    if (map.getLayer('zone-polygons-fill')) {
      map.setPaintProperty('zone-polygons-fill', 'fill-opacity', mapMode === 'zones' ? 0.4 : 0);
    }
    
    if (map.getLayer('heat-surface')) {
      map.setLayoutProperty('heat-surface', 'visibility', mapMode === 'heatmap' ? 'visible' : 'none');
    }
  }, [mapMode]);

  // Update SoilGrids Layer with Loading UX
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const isVisible = visibleLayers.includes('soilGrids');

    clearTimeout(loadingTimeoutRef.current);

    if (!isVisible) {
      if (map.getLayer('soilgrids-layer')) map.removeLayer('soilgrids-layer');
      if (map.getSource('soilgrids-source')) map.removeSource('soilgrids-source');
      setMapLoading(false);
      return;
    }

    const config = SOILGRIDS_CONFIG[selectedSoilProperty];
    const layerName = `${config.slug}_${selectedDepth}_mean`;
    const wmsUrl = `https://maps.isric.org/mapserv?map=/srv/node/mappings/${config.id}.map&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${layerName}&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE&HEIGHT=256&WIDTH=256&CRS=EPSG:3857&BBOX={bbox-epsg-3857}`;

    setMapLoading(true);

    if (map.getLayer('soilgrids-layer')) map.removeLayer('soilgrids-layer');
    if (map.getSource('soilgrids-source')) map.removeSource('soilgrids-source');

    map.addSource('soilgrids-source', {
      type: 'raster',
      tiles: [wmsUrl],
      tileSize: 256
    });

    map.addLayer(
      {
        id: 'soilgrids-layer',
        type: 'raster',
        source: 'soilgrids-source',
        paint: { 'raster-opacity': 0.7 }
      },
      'zone-polygons-fill'
    );

    loadingTimeoutRef.current = setTimeout(() => {
      setMapLoading(false);
    }, 800);

  }, [visibleLayers, selectedSoilProperty, selectedDepth]);

  const currentThemeRef = useRef(theme);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Theme switching safety
    if (currentThemeRef.current !== theme) {
      currentThemeRef.current = theme;
      const targetStyle = theme === 'light' ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/dark-v11';
      map.setStyle(targetStyle);
      return;
    }

    if (map.getLayer('active-zone-line')) {
      map.setLayoutProperty('active-zone-line', 'visibility', activeZoneId ? 'visible' : 'none');
      map.setFilter('active-zone-line', ['==', ['get', 'id'], activeZoneId ?? '__none__']);
    }

    const zSrc = map.getSource('zones') as any;
    if (zSrc?.setData) zSrc.setData(zonesGeoJson);
    const hSrc = map.getSource('heat-points') as any;
    if (hSrc?.setData) hSrc.setData(heatGeoJson);
  }, [mapMode, visibleLayers, zonesGeoJson, heatGeoJson, activeZoneId, theme, selectedSoilProperty]);

  if (error) {
    return (
      <View style={styles.webError}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <div 
        ref={containerRef} 
        style={mapContainerStyle}
        id="map-container"
      />
      
      {mapLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Fetching Soil Data...</Text>
          <View style={styles.loaderBar}>
            <View style={styles.loaderProgress} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative'
  },
  webError: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7f1d1d',
    backgroundColor: '#1f1115'
  },
  errorText: {
    color: '#fecaca'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(5, 150, 105, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'column',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    zIndex: 1000
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  loaderBar: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1,
    overflow: 'hidden'
  },
  loaderProgress: {
    width: '40%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    // Note: CSS Animation would be better here for web
  }
});
