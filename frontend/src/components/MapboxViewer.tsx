import Map, { Source, Layer, Marker, NavigationControl, ScaleControl } from 'react-map-gl/mapbox';
import { useState } from 'react';
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

export function MapboxViewer({
  sensors, zones, field, mapMode, onSelectSensor, onSelectZone, activeSensorId, activeZoneId,
}: MapboxViewerProps) {
  const [viewState, setViewState] = useState({
    longitude: field.center.longitude,
    latitude: field.center.latitude,
    zoom: 14,
  });

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
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
           <NavigationControl position="top-right" />
        </div>
        <ScaleControl position="bottom-right" />

        {/* Zones */}
        {zones.map(zone => {
          const color = ZONE_COLORS[zone.color] ?? '#6b7280';
          const isActive = activeZoneId === zone.id;
          return (
            <Source key={zone.id} id={`src-${zone.id}`} type="geojson" data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [zone.coordinates.map(c => [c.lng, c.lat])],
              },
            }}>
              <Layer id={`fill-${zone.id}`} type="fill" paint={{
                'fill-color': color,
                'fill-opacity': isActive ? 0.35 : 0.15,
              }} />
              <Layer id={`line-${zone.id}`} type="line" paint={{
                'line-color': color,
                'line-width': isActive ? 4 : 2,
                'line-opacity': 0.8,
              }} />
            </Source>
          );
        })}

        {/* Zone Markers (Labels) */}
        {zones.map(zone => {
          const lng = zone.coordinates.reduce((s, c) => s + c.lng, 0) / zone.coordinates.length;
          const lat = zone.coordinates.reduce((s, c) => s + c.lat, 0) / zone.coordinates.length;
          return (
            <Marker key={`lbl-${zone.id}`} longitude={lng} latitude={lat} anchor="center"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={(e: any) => { e?.originalEvent?.stopPropagation?.(); onSelectZone(zone); }}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1 rounded-full bg-white text-[#1d1d1f] text-[11px] font-black cursor-pointer shadow-xl border border-[#d2d2d7]/50 flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ZONE_COLORS[zone.color] }} />
                {zone.healthScore}%
              </motion.div>
            </Marker>
          );
        })}

        {/* Sensor Markers - Apple Style */}
        {sensors.map(sensor => {
          const isActive = activeSensorId === sensor.id;
          const color =
            sensor.status === 'critical' ? '#ff3b30' :
            sensor.status === 'warning' ? '#ff9500' : '#34c759';
          
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
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
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
                    boxShadow: `0 0 15px ${color}33`
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
