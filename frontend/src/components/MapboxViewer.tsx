import Map, { Source, Layer, Marker, NavigationControl, ScaleControl } from 'react-map-gl/mapbox';
import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNowStrict } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Sensor, SoilZone, Field, MapMode } from '@/types';
import { METRICS, STATUS_COLORS, classLabels, formatMetric, heatPoints, pointInPolygon, type MetricKey } from '@/data/metrics';
import { COVERAGE_RADIUS_M, buildRaster, estimate, loadGreenness, rasterExtent, type Greenness } from '@/data/fieldRaster';
import { useDateLocale } from '@/i18n';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const MAP_STYLES: Record<MapMode, string> = {
  zones: 'mapbox://styles/mapbox/light-v11',
  // чистый снимок без подписей — как у агро-платформ, подписи мешают читать карту показателей
  heatmap: 'mapbox://styles/mapbox/satellite-v9',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

const ZONE_COLORS: Record<string, string> = {
  green: '#2fa84f',
  yellow: '#f3b32a',
  red: '#e0301e',
};

const OFFLINE_COLOR = '#8e8e93';

interface MapboxViewerProps {
  sensors: Sensor[];
  zones: SoilZone[];
  field: Field;
  mapMode: MapMode;
  metric: MetricKey;
  onMetricChange: (metric: MetricKey) => void;
  onSelectSensor: (sensor: Sensor) => void;
  onSelectZone: (zone: SoilZone) => void;
  activeSensorId?: string | null;
  activeZoneId?: string | null;
}

export function MapboxViewer({
  sensors, zones, field, mapMode, metric, onMetricChange, onSelectSensor, onSelectZone, activeSensorId, activeZoneId,
}: MapboxViewerProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [hover, setHover] = useState<{ x: number; y: number; value: number; nearest: number } | null>(null);

  // на телефоне легенда закрывала бы полкарты — открывается по тапу
  const [legendOpen, setLegendOpen] = useState(() => window.innerWidth >= 768);
  const [sat, setSat] = useState<{ key: string; fn: Greenness } | null>(null);

  const isHeatmap = mapMode === 'heatmap';
  const points = useMemo(() => heatPoints(sensors, metric), [sensors, metric]);
  const extent = useMemo(() => rasterExtent(points, zones), [points, zones]);
  const extKey = extent && `${extent.minLng},${extent.minLat},${extent.maxLng},${extent.maxLat}`;
  const satFn = sat && sat.key === extKey ? sat.fn : undefined;
  const raster = useMemo(
    () => isHeatmap && extent ? buildRaster(points, zones, metric, extent, satFn) : null,
    [isHeatmap, points, zones, metric, extent, satFn],
  );
  const inside = (lng: number, lat: number) => zones.length
    ? zones.some(z => pointInPolygon({ lng, lat }, z.coordinates))
    : estimate(points, metric, undefined, lng, lat).nearest <= COVERAGE_RADIUS_M;

  const [token, setToken] = useState(() => MAPBOX_TOKEN || (typeof window !== 'undefined' ? localStorage.getItem('mapbox_token') || '' : ''));
  const [loadingConfig, setLoadingConfig] = useState(!MAPBOX_TOKEN);

  useEffect(() => {
    if (!token) {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      fetch(`${apiUrl}/api/config`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.mapbox_token) {
            setToken(data.mapbox_token);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingConfig(false));
    }
  }, [token]);

  // Снимок под полем — детализация карты; до загрузки (или без него) карта — чистая интерполяция
  useEffect(() => {
    if (!isHeatmap || !extent || !token) return;
    let alive = true;
    const key = `${extent.minLng},${extent.minLat},${extent.maxLng},${extent.maxLat}`;
    loadGreenness(extent, token).then(fn => { if (alive && fn) setSat({ key, fn }); });
    return () => { alive = false; };
  }, [isHeatmap, extent, token]);

  if (!token) {
    if (loadingConfig) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#f5f5f7]">
          <div className="w-6 h-6 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center bg-[#f5f5f7]">
        <div className="w-20 h-20 bg-white rounded-[32px] shadow-xl flex items-center justify-center mb-8">
          <span className="text-4xl">🗺️</span>
        </div>
        <h3 className="text-2xl font-black tracking-tight text-[#1d1d1f] mb-3">Map Infrastructure Offline</h3>
        <p className="text-sm text-[#86868b] max-w-sm leading-relaxed font-medium">
          Configure <code className="bg-[#e5e5ea] px-1.5 py-0.5 rounded text-[#0071e3]">MAPBOX_TOKEN</code> in your Fly.io secrets or environment to enable geospatial visualization.
        </p>
      </div>
    );
  }

  const def = METRICS[metric];
  const initialView = zones.length
    ? {
        bounds: [
          [Math.min(...zones.flatMap(z => z.coordinates.map(c => c.lng))), Math.min(...zones.flatMap(z => z.coordinates.map(c => c.lat)))],
          [Math.max(...zones.flatMap(z => z.coordinates.map(c => c.lng))), Math.max(...zones.flatMap(z => z.coordinates.map(c => c.lat)))],
        ] as [[number, number], [number, number]],
        fitBoundsOptions: { padding: 40 },
      }
    : { longitude: field.center.longitude, latitude: field.center.latitude, zoom: 14 };

  return (
    <div className="w-full h-full relative">
      <Map
        // Поле вписывается в экран целиком; без зон — центр поля
        initialViewState={initialView}
        mapStyle={MAP_STYLES[mapMode]}
        mapboxAccessToken={token}
        style={{ width: '100%', height: '100%' }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onMouseMove={(e: any) => {
          const { lng, lat } = e.lngLat;
          if (!raster || !inside(lng, lat)) return setHover(null);
          setHover({ x: e.point.x, y: e.point.y, ...estimate(points, metric, satFn, lng, lat) });
        }}
        onMouseOut={() => setHover(null)}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-left" />

        {/* ─── INTERPOLATION RASTER (only in heatmap mode) ─── */}
        {raster && (
          <Source id="interp-src" type="image" url={raster.url} coordinates={raster.coordinates}>
            <Layer id="interp-layer" type="raster" paint={{ 'raster-opacity': 1, 'raster-fade-duration': 0, 'raster-resampling': 'nearest' }} />
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
                'fill-opacity': isHeatmap ? 0 : (isActive ? 0.35 : 0.15),
              }} />
              {/* Border outline — always visible */}
              <Layer id={`line-${zone.id}`} type="line" paint={{
                'line-color': isHeatmap ? '#ffffff' : color,
                'line-width': isActive ? 3 : isHeatmap ? 1.5 : 2,
                'line-opacity': isHeatmap ? 0.9 : 0.8,
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
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-2 py-0.5 rounded-md bg-white/95 text-[#1d1d1f] text-[10px] font-bold font-data cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                {zone.healthScore}
              </motion.div>
            </Marker>
          );
        })}

        {/* ─── SENSOR MARKERS ─── */}
        {sensors.map(sensor => {
          const isActive = activeSensorId === sensor.id;
          const color = sensor.offline ? OFFLINE_COLOR : STATUS_COLORS[sensor.status];
          const value = def.read(sensor);

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

                <div
                  className={`w-4 h-4 rounded-full border-2 border-white shadow-lg transition-transform ${isActive ? 'scale-125' : 'scale-100'}`}
                  style={{ backgroundColor: color }}
                />
                {/* Реальный датчик подписан кодом с наклейки */}
                {sensor.registryId && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 rounded bg-[#1d1d1f] text-white text-[9px] font-black font-data whitespace-nowrap shadow">
                    {sensor.registryId}
                  </div>
                )}

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <div className="bg-[#1d1d1f] text-white px-3 py-2.5 rounded-xl shadow-2xl flex flex-col gap-1.5 min-w-[150px] border border-white/10">
                    <span className="text-[10px] font-black uppercase tracking-widest truncate">{sensor.registryId ? sensor.nameKey : t(sensor.nameKey)}</span>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[10px] font-bold text-white/60">{t(def.labelKey)}</span>
                      <span className="text-[13px] font-black font-data">{formatMetric(metric, value)}</span>
                    </div>
                    <span className="text-[9px] font-bold text-white/60">
                      {sensor.registryId && !Number.isFinite(value) ? t('map.waiting') : formatDistanceToNowStrict(new Date(sensor.lastUpdated), { addSuffix: true, locale: dateLocale })}
                      {Number.isFinite(sensor.battery) && ` · ${sensor.battery}% ${t('map.battery')}`}
                    </span>
                  </div>
                </div>
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* ─── Подсказка под курсором: оценка в точке и до ближайшего датчика ─── */}
      {hover && Number.isFinite(hover.value) && (
        <div className="absolute z-10 pointer-events-none px-2 py-1 rounded-md bg-[#1d1d1f]/90 text-white text-[10px] font-bold font-data whitespace-nowrap"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          ≈ {formatMetric(metric, hover.value)} · {t('map.nearest', { m: Math.round(hover.nearest) })}
        </div>
      )}

      {/* ─── Панель слоя: показатель + легенда с долей площади по классам ─── */}
      {isHeatmap && (
        <div className="absolute z-10 bottom-8 left-3 right-3 md:left-auto md:right-4 md:w-[300px] bg-white/95 backdrop-blur-xl border border-black/5 rounded-xl shadow-pro">
          <button onClick={() => setLegendOpen(v => !v)} className="w-full flex items-center justify-between px-3 pt-2.5 pb-1.5">
            <span className="text-[11px] font-bold text-[#1d1d1f]">{t('map.layer')}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#86868b] transition-transform ${legendOpen ? '' : 'rotate-180'}`} />
          </button>
          <div className="px-3 pb-3 flex flex-col gap-2.5">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-[#86868b]">{t('map.measurement')}</span>
              <select value={metric} onChange={e => onMetricChange(e.target.value as MetricKey)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-black/10 bg-white text-[12px] font-semibold outline-none focus:ring-2 focus:ring-[#0071e3]/20"
              >
                {(Object.keys(METRICS) as MetricKey[]).map(k => <option key={k} value={k}>{t(METRICS[k].labelKey)}{METRICS[k].unit && `, ${METRICS[k].unit}`}</option>)}
              </select>
            </label>
            {legendOpen && raster && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold text-[#86868b]">{t('map.legendShare')}</span>
                <div className="flex gap-1 items-end">
                  {def.colors.map((c, i) => {
                    const share = raster.shares[i];
                    const max = Math.max(...raster.shares) || 1;
                    return (
                      <div key={c} className="flex-1 min-w-0 flex flex-col items-center gap-0.5">
                        <span className="text-[9px] font-bold font-data text-[#1d1d1f]">{Math.round(share * 100)}%</span>
                        <div className="w-full h-10 flex items-end">
                          <div className="w-full rounded-sm" style={{ height: `${Math.max(share / max * 100, 6)}%`, backgroundColor: c }} />
                        </div>
                        <span className="text-[8.5px] font-data text-[#6e6e73] whitespace-nowrap">{classLabels(metric)[i]}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[9.5px] text-[#86868b] leading-snug">
                  {satFn ? t('map.detailSat') : t('map.detailSensors')} · {t('map.paleFar')}
                </p>
              </div>
            )}
            {!points.length && <p className="text-[10px] font-bold text-[#86868b]">{t('map.noData')}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
