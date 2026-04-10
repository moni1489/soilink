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
  historicalOffset?: number;
}

const SOILGRIDS_CONFIG: Record<SoilGridsProperty, { slug: string }> = {
  clay: { slug: 'clay' },
  sand: { slug: 'sand' },
  silt: { slug: 'silt' },
  phh2o: { slug: 'phh2o' },
  nitrogen: { slug: 'nitrogen' },
  soc: { slug: 'soc' },
  bdod: { slug: 'bdod' },
};

const mapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: '#000000',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0
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
  visibleLayers: LayerKey[],
  offset: number = 0
) => ({
  type: 'FeatureCollection' as const,
  features: generateHeatGridPoints(boundary, sensors, visibleLayers, 36).map((point, index) => {
    // Simulate historical change: intensity fluctuates slightly based on offset
    const seed = (index * 1337) % 100;
    const variation = (Math.sin(seed + offset) * 0.15);
    const simulatedIntensity = Math.min(1.2, Math.max(0, point.intensity + variation));

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [point.longitude, point.latitude]
      },
      properties: {
        id: `heat-${index}`,
        intensity: simulatedIntensity
      }
    };
  })
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
  theme = 'dark',
  historicalOffset = 0
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const mapLoadingTimeoutRef = useRef<any>(null);
  const currentStyleRef = useRef<string>('');
  const [mapLoading, setMapLoading] = useState(false);
  const loadingTimeoutRef = useRef<any>(null);
  const onSelectSensorRef = useRef(onSelectSensor);
  const onSelectZoneRef = useRef(onSelectZone);
  const zonesRef = useRef(zones);
  const visibleLayersRef = useRef(visibleLayers);
  const selectedSoilPropertyRef = useRef(selectedSoilProperty);
  const selectedDepthRef = useRef(selectedDepth);
  const mapModeRef = useRef(mapMode);
  const themeRef = useRef(theme);
  const activeZoneIdRef = useRef(activeZoneId);
  const popupRef = useRef<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const zonesGeoJson = useMemo(() => getZonesGeoJson(zones), [zones]);
  const heatGeoJson = useMemo(
    () => getHeatGeoJson(fieldBoundary, sensors, visibleLayers, historicalOffset),
    [fieldBoundary, sensors, visibleLayers, historicalOffset]
  );

  useEffect(() => {
    onSelectSensorRef.current = onSelectSensor;
    onSelectZoneRef.current = onSelectZone;
    zonesRef.current = zones;
    visibleLayersRef.current = visibleLayers;
    selectedSoilPropertyRef.current = selectedSoilProperty;
    selectedDepthRef.current = selectedDepth;
    mapModeRef.current = mapMode;
    themeRef.current = theme;
    activeZoneIdRef.current = activeZoneId;
  }, [onSelectSensor, onSelectZone, zones, visibleLayers, selectedSoilProperty, selectedDepth, mapMode, theme, activeZoneId]);

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

        const initialStyle = theme === 'light' ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/dark-v11';
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: initialStyle,
          center: [fieldCenter.longitude, fieldCenter.latitude],
          zoom: 15.5,
          pitch: 55,
          bearing: -15,
          attributionControl: false
        });
        currentStyleRef.current = initialStyle;

        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

        const resizeHandler = () => {
          if (mapRef.current) mapRef.current.resize();
        };
        window.addEventListener('resize', resizeHandler);
        (map as any)._resizeHandler = resizeHandler;

        const addSourcesAndLayers = () => {
          if (!mapRef.current) return;
          const currentMap = mapRef.current;
          
          const boundary = fieldBoundary;
          const curZones = zonesRef.current;
          const curSensors = sensors; // sensors comes from props, but let's use a stable value if possible
          const curLayers = visibleLayersRef.current;
          const curProperty = selectedSoilPropertyRef.current;
          const curDepth = selectedDepthRef.current;
          const curMapMode = mapModeRef.current;
          const curTheme = themeRef.current;
          const curActiveZoneId = activeZoneIdRef.current;

          // Sources helper
          const safeAddSource = (id: string, config: any) => {
            try {
              if (!currentMap.getSource(id)) currentMap.addSource(id, config);
            } catch (e) {
              console.warn(`Source ${id} failed:`, e);
            }
          };

          // Layers helper
          const safeAddLayer = (config: any, beforeId?: string) => {
            try {
              if (!currentMap.getLayer(config.id)) currentMap.addLayer(config, beforeId);
              else {
                // If it exists, just update its visibility to be sure
                if (config.layout?.visibility) {
                  currentMap.setLayoutProperty(config.id, 'visibility', config.layout.visibility);
                }
              }
            } catch (e) {
              console.warn(`Layer ${config.id} failed:`, e);
            }
          };

          // Sources
          safeAddSource('field-boundary', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [closeRing(boundary).map(toLngLat)] },
                properties: {}
              }]
            }
          });

          safeAddSource('zones', { type: 'geojson', data: getZonesGeoJson(curZones) });
          safeAddSource('heat-points', { type: 'geojson', data: getHeatGeoJson(boundary, curSensors, curLayers) });

          const sgConfig = SOILGRIDS_CONFIG[curProperty];
          const layerName = `${sgConfig.slug}_${curDepth}_mean`;
          safeAddSource('soilgrids-source', {
            type: 'raster',
            tiles: [`https://maps.isric.org/mapserv?map=/srv/node/mappings/${sgConfig.slug}.map&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${layerName}&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE&HEIGHT=256&WIDTH=256&CRS=EPSG:3857&BBOX={bbox-epsg-3857}`],
            tileSize: 256
          });

          safeAddSource('zone-labels', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: curZones.map((zone) => {
                const centroid = getPolygonCentroid(zone.polygon);
                return {
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: [centroid.longitude, centroid.latitude] },
                  properties: { name: zone.name }
                };
              })
            }
          });

          safeAddSource('satellite-source', {
            type: 'raster',
            tiles: [`https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.png?access_token=${mapboxConfig.token}`],
            tileSize: 256
          });

          // Layers
          safeAddLayer({
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite-source',
            layout: { visibility: curMapMode === 'satellite' ? 'visible' : 'none' },
            paint: { 'raster-opacity': 1 }
          });

          safeAddLayer({
            id: 'sky',
            type: 'sky',
            paint: { 'sky-type': 'atmosphere', 'sky-atmosphere-sun': [0.0, 0.0], 'sky-atmosphere-sun-intensity': 15 }
          });

          safeAddLayer({
            id: 'soilgrids-layer',
            type: 'raster',
            source: 'soilgrids-source',
            paint: { 'raster-opacity': 0.7 },
            layout: { visibility: curLayers.includes('soilGrids') ? 'visible' : 'none' }
          }, 'zone-polygons-fill');

          safeAddLayer({
            id: 'field-boundary-fill',
            type: 'fill',
            source: 'field-boundary',
            paint: {
              'fill-color': curTheme === 'light' ? '#F1F5F9' : '#000000',
              'fill-opacity': curTheme === 'light' ? 0.3 : 0.2
            }
          });

          safeAddLayer({
            id: 'zone-polygons-fill',
            type: 'fill',
            source: 'zones',
            paint: {
              'fill-color': ['get', 'color'],
              'fill-opacity': curMapMode === 'zones' ? 0.4 : 0
            }
          });

          safeAddLayer({
            id: 'zone-polygons-line',
            type: 'line',
            source: 'zones',
            paint: {
              'line-color': '#FFFFFF',
              'line-width': 2.5,
              'line-opacity': 1.0
            }
          });

          safeAddLayer({
            id: 'heat-surface',
            type: 'heatmap',
            source: 'heat-points',
            layout: { visibility: curMapMode === 'heatmap' ? 'visible' : 'none' },
            paint: {
              'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0.08, 1, 1.15],
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 11, 0.9, 17, 1.75],
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 11, 24, 17, 64],
              'heatmap-opacity': 0.8,
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(0, 0, 255, 0)',
                0.2, 'rgba(56, 189, 248, 0.4)',
                0.5, 'rgba(234, 179, 8, 0.7)',
                0.8, 'rgba(249, 115, 22, 0.85)',
                1, 'rgba(239, 68, 68, 0.95)'
              ]
            }
          });

          safeAddLayer({
            id: 'field-boundary-line',
            type: 'line',
            source: 'field-boundary',
            paint: { 'line-color': '#FFFFFF', 'line-width': 3.5, 'line-opacity': 0.8 }
          });

          safeAddLayer({
            id: 'active-zone-line',
            type: 'line',
            source: 'zones',
            layout: { visibility: curActiveZoneId ? 'visible' : 'none' },
            paint: { 'line-color': '#00F59B', 'line-width': 4.5 },
            filter: ['==', ['get', 'id'], curActiveZoneId ?? '__none__']
          });

          safeAddLayer({
            id: 'zone-label-layer',
            type: 'symbol',
            source: 'zone-labels',
            layout: {
              visibility: curMapMode === 'zones' ? 'visible' : 'none',
              'text-field': ['get', 'name'],
              'text-size': 12,
              'text-font': ['Open Sans Semibold']
            },
            paint: {
              'text-color': curTheme === 'light' ? '#334155' : '#f8fafc',
              'text-halo-color': curTheme === 'light' ? '#ffffff' : '#020617',
              'text-halo-width': 1.2
            }
          });
        };

        (map as any)._addSourcesAndLayers = addSourcesAndLayers;


        map.on('load', () => {
          if (cancelled) return;
          addSourcesAndLayers();

          // Focus logic
          const bounds = closeRing(fieldBoundary).reduce(
            (col, coord) => col.extend([coord.longitude, coord.latitude]),
            new mapboxgl.LngLatBounds(toLngLat(fieldBoundary[0]), toLngLat(fieldBoundary[0]))
          );
          map.fitBounds(bounds, { padding: 20, duration: 1000, maxZoom: 16 });

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
          if ((map as any)._addSourcesAndLayers) (map as any)._addSourcesAndLayers();
          setTimeout(() => map.resize(), 100);
        });

      } catch (err) {
        setError(`Mapbox failed: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    };

    init();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        if ((mapRef.current as any)._resizeHandler) {
          window.removeEventListener('resize', (mapRef.current as any)._resizeHandler);
        }
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

    if (map.getLayer('satellite-layer')) {
      map.setLayoutProperty('satellite-layer', 'visibility', mapMode === 'satellite' ? 'visible' : 'none');
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
    const wmsUrl = `https://maps.isric.org/mapserv?map=/srv/node/mappings/${config.slug}.map&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${layerName}&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE&HEIGHT=256&WIDTH=256&CRS=EPSG:3857&BBOX={bbox-epsg-3857}`;

    setMapLoading(true);

    if (map.getLayer('soilgrids-layer')) map.removeLayer('soilgrids-layer');
    if (map.getSource('soilgrids-source')) map.removeSource('soilgrids-source');

    map.addSource('soilgrids-source', {
      type: 'raster',
      tiles: [wmsUrl],
      tileSize: 256,
      maxzoom: 14 // ISRIC WMS overzoom
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

    // Theme switching logic (only for vector base)
    let targetStyle = theme === 'light' ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/dark-v11';

    if (currentStyleRef.current !== targetStyle) {
      currentStyleRef.current = targetStyle;
      setMapLoading(true);
      map.setStyle(targetStyle);

      // Re-add essential layers after style change
      map.once('style.load', () => {
        setMapLoading(false);
        if ((map as any)._addSourcesAndLayers) (map as any)._addSourcesAndLayers();
        setTimeout(() => map.resize(), 100);
      });
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
      
      {mapLoading && mapMode !== 'satellite' && (
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
