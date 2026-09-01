import Map, { Source, Layer, Marker, NavigationControl, ScaleControl } from 'react-map-gl/mapbox';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Sensor, SoilZone, Field, MapMode } from '@/types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const MAP_STYLES: Record<MapMode, string> = {
  zones: 'mapbox://styles/mapbox/light-v11',
  heatmap: 'mapbox://styles/mapbox/satellite-streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
};

const ZONE_COLORS: Record<string, string> = {
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
};

interface MapboxViewerProps {
  sensors: Sensor[];
  zones: SoilZone[];
  field: Field;
  mapMode: MapMode;
  onSelectSensor: (sensor: Sensor) => void;
  onSelectZone: (zone: SoilZone) => void;
  activeSensorId?: string | null;
  activeZoneId?: string | null;
}

/** Simple point-in-polygon check using ray-casting algorithm */
function pointInPolygon(point: {lng: number, lat: number}, vs: {lng: number, lat: number}[]) {
  const x = point.lng, y = point.lat;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].lng, yi = vs[i].lat;
    const xj = vs[j].lng, yj = vs[j].lat;
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Generate a grid of points strictly within a polygon for heatmap coverage */
function generateZoneHeatPoints(zone: SoilZone, gridSize = 12) {
  const lngs = zone.coordinates.map(c => c.lng);
  const lats = zone.coordinates.map(c => c.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  // weight: 0 = perfectly healthy, 1 = critical
  const weight = parseFloat((1 - zone.healthScore / 100).toFixed(3));

  const points = [];
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lng = minLng + (maxLng - minLng) * (i + 0.5) / gridSize;
      const lat = minLat + (maxLat - minLat) * (j + 0.5) / gridSize;
      
      if (pointInPolygon({lng, lat}, zone.coordinates)) {
        points.push({ lng, lat, weight: weight * 0.75 });
      }
    }
  }
  return points;
}

export function MapboxViewer({
  sensors, zones, field, mapMode, onSelectSensor, onSelectZone, activeSensorId, activeZoneId,
}: MapboxViewerProps) {
  const [viewState, setViewState] = useState({
    longitude: field.center.longitude,
    latitude: field.center.latitude,
    zoom: 13.5,
  });

  /** Build the GeoJSON for the heatmap (zone grid points + sensor hotspots) */
  const heatmapGeoJSON = useMemo(() => {
    const zonePoints = zones.flatMap(zone => generateZoneHeatPoints(zone, 12));
    const sensorPoints = sensors.map(s => ({
      lng: s.coordinates.longitude,
      lat: s.coordinates.latitude,
      weight:
        s.status === 'critical' ? 1.0 :
        s.status === 'warning'  ? 0.62 : 0.08,
    }));

    return {
      type: 'FeatureCollection' as const,
      features: [...zonePoints, ...sensorPoints].map(p => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        properties: { weight: p.weight },
      })),
    };
  }, [zones, sensors]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center bg-[#f5f5f7]">
        <div className="w-20 h-20 bg-white rounded-[32px] shadow-xl flex items-center justify-center mb-8">
           <span className="text-4xl">🗺️</span>
        </div>
        <h3 className="text-2xl font-black tracking-tight text-[#1d1d1f] mb-3">Map Infrastructure Offline</h3>
        <p className="text-sm text-[#86868b] max-w-sm leading-relaxed font-medium">
          Please configure your <code className="bg-[#e5e5ea] px-1.5 py-0.5 rounded text-[#0071e3]">VITE_MAPBOX_TOKEN</code> in the environment settings to enable geospatial visualization.
        </p>
      </div>
    );
  }

  const isHeatmap = mapMode === 'heatmap';

  return (
    <div className="w-full h-full relative">
      <Map
        {...viewState}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onMove={(evt: any) => setViewState(evt.viewState)}
        mapStyle={MAP_STYLES[mapMode]}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {/* ─── HEATMAP LAYER (only in heatmap mode) ─── */}
        {isHeatmap && (
          <Source id="heatmap-src" type="geojson" data={heatmapGeoJSON}>
            <Layer
              id="soil-heatmap"
              type="heatmap"
              paint={{
                // Weight each point by its health property
                'heatmap-weight': ['get', 'weight'],
                // Increase intensity with zoom
                'heatmap-intensity': [
                  'interpolate', ['linear'], ['zoom'],
                  12, 1.2,
                  15, 2.8,
                ],
                // Color ramp: green (healthy/cool) → amber (warning) → red (critical/hot)
                'heatmap-color': [
                  'interpolate', ['linear'], ['heatmap-density'],
                  0,    'rgba(16,185,129,0)',      // transparent
                  0.10, 'rgba(16,185,129,0.55)',   // green — optimal
                  0.35, 'rgba(132,204,22,0.65)',   // lime
                  0.55, 'rgba(245,158,11,0.75)',   // amber — warning
                  0.75, 'rgba(249,115,22,0.85)',   // orange
                  1.0,  'rgba(239,68,68,0.92)',    // red — critical
                ],
                // Smaller radius so heatmap stays mostly inside the polygon
                'heatmap-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  12, 30,
                  14, 50,
                  16, 90,
                ],
                'heatmap-opacity': 0.85,
              }}
            />
          </Source>
        )}

        {/* ─── ZONE POLYGONS ─── */}
        {zones.map(zone => {
          const color = ZONE_COLORS[zone.color] ?? '#6b7280';
          const isActive = activeZoneId === zone.id;
          return (
            <Source key={zone.id} id={`src-${zone.id}`} type="geojson" data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                // GeoJSON requires the ring to be closed (first = last point)
                coordinates: [[
                  ...zone.coordinates.map(c => [c.lng, c.lat]),
                  [zone.coordinates[0].lng, zone.coordinates[0].lat],
                ]],
              },
            }}>
              {/* Fill: show always in zones mode; in heatmap mode show just a subtle overlay */}
              <Layer id={`fill-${zone.id}`} type="fill" paint={{
                'fill-color': color,
                'fill-opacity': isHeatmap
                  ? (isActive ? 0.12 : 0.06)
                  : (isActive ? 0.35 : 0.15),
              }} />
              {/* Border outline — always visible */}
              <Layer id={`line-${zone.id}`} type="line" paint={{
                'line-color': color,
                'line-width': isActive ? 4 : isHeatmap ? 2.5 : 2,
                'line-opacity': isHeatmap ? 1 : 0.8,
                'line-dasharray': isHeatmap ? [2, 0] : [1],
              }} />
            </Source>
          );
        })}

        {/* ─── ZONE LABELS ─── */}
        {zones.map(zone => {
          const lng = zone.coordinates.reduce((s, c) => s + c.lng, 0) / zone.coordinates.length;
          const lat = zone.coordinates.reduce((s, c) => s + c.lat, 0) / zone.coordinates.length;
          const color = ZONE_COLORS[zone.color] ?? '#6b7280';
          return (
            <Marker key={`lbl-${zone.id}`} longitude={lng} latitude={lat} anchor="center"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={(e: any) => { e?.originalEvent?.stopPropagation?.(); onSelectZone(zone); }}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1.5 rounded-full bg-white text-[#1d1d1f] text-[11px] font-black cursor-pointer shadow-xl border border-[#d2d2d7]/50 flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {zone.healthScore}%
              </motion.div>
            </Marker>
          );
        })}

        {/* ─── HEATMAP LEGEND (only in heatmap mode) ─── */}
        {isHeatmap && (
          <div className="absolute bottom-10 left-4 z-10 bg-black/70 backdrop-blur-md rounded-xl px-4 py-3 flex flex-col gap-2">
            <span className="text-white text-[9px] font-black uppercase tracking-widest mb-1">Здоровье почвы</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2.5 rounded-full" style={{
                background: 'linear-gradient(to right, #10b981, #84cc16, #f59e0b, #f97316, #ef4444)'
              }} />
            </div>
            <div className="flex justify-between text-[9px] font-bold text-white/70">
              <span>Оптимально</span>
              <span>Критично</span>
            </div>
          </div>
        )}

        {/* ─── SENSOR MARKERS ─── */}
        {sensors.map(sensor => {
          const isActive = activeSensorId === sensor.id;
          const color =
            sensor.status === 'critical' ? '#ff3b30' :
            sensor.status === 'warning'  ? '#ff9500' : '#34c759';

          return (
            <Marker
              key={sensor.id}
              longitude={sensor.coordinates.longitude}
              latitude={sensor.coordinates.latitude}
              anchor="center"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={(e: any) => { e?.originalEvent?.stopPropagation?.(); onSelectSensor(sensor); }}
            >
              <div className="relative cursor-pointer group">
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 2.5, opacity: 0.2 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  )}
                </AnimatePresence>

                <motion.div
                  className={`w-5 h-5 rounded-full border-[3px] shadow-xl transition-all ${isActive ? 'scale-125' : 'scale-100'}`}
                  style={{
                    backgroundColor: 'white',
                    borderColor: color,
                    boxShadow: `0 0 15px ${color}33`,
                  }}
                >
                  <div className="absolute inset-[3px] rounded-full" style={{ backgroundColor: color, opacity: isActive ? 1 : 0.3 }} />
                </motion.div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-[#1d1d1f] text-white text-[10px] font-black px-2 py-1 rounded shadow-lg whitespace-nowrap uppercase tracking-widest">
                    {sensor.name}
                  </div>
                </div>
              </div>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}
