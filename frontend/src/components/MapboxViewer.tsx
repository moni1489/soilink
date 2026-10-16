import Map, { Source, Layer, Marker, NavigationControl, ScaleControl } from 'react-map-gl/mapbox';
import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNowStrict } from 'date-fns';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Sensor, SoilZone, Field, MapMode } from '@/types';
import { METRICS, STATUS_COLORS, classIndex, formatMetric, heatPoints, idw, metersPerDeg, pointInPolygon, type IdwPoint, type MetricKey } from '@/data/metrics';
import { useDateLocale } from '@/i18n';

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

const OFFLINE_COLOR = '#8e8e93';
/** Поле без контуров зон — закрашиваем круги этого радиуса вокруг датчиков */
const COVERAGE_RADIUS_M = 450;
/** Разрешение растра: метров на пиксель (не крупнее MAX_PX по стороне) */
const RASTER_M_PER_PX = 4;
const MAX_PX = 1200;

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
  /** Карточка над легендой в левом верхнем углу (сводка по полю) */
  topLeft?: ReactNode;
}

const hexRgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

/** Достоверность оценки падает с расстоянием до ближайшего датчика → прозрачность пикселя */
const confidenceAlpha = (nearestM: number) => 0.82 - Math.min(Math.max((nearestM - 250) / 600, 0), 1) * 0.5;

/**
 * Растр интерполяции по показаниям датчиков, обрезанный по контурам зон.
 * Каждый пиксель — отдельная IDW-оценка, раскрашенная по классу (без размытия heatmap-слоя).
 */
function buildRaster(points: IdwPoint[], zones: SoilZone[], metric: MetricKey) {
  if (!points.length) return null;
  const rings = zones.map(z => z.coordinates);
  const lat0 = points[0].lat;
  const m = metersPerDeg(lat0);
  const pad = { lng: COVERAGE_RADIUS_M / m.x, lat: COVERAGE_RADIUS_M / m.y };
  const all = rings.length ? rings.flat() : points.flatMap(p => [
    { lng: p.lng - pad.lng, lat: p.lat - pad.lat }, { lng: p.lng + pad.lng, lat: p.lat + pad.lat },
  ]);
  const minLng = Math.min(...all.map(c => c.lng)), maxLng = Math.max(...all.map(c => c.lng));
  const minLat = Math.min(...all.map(c => c.lat)), maxLat = Math.max(...all.map(c => c.lat));
  const scale = Math.max((maxLng - minLng) * m.x, (maxLat - minLat) * m.y) / MAX_PX;
  const mPerPx = Math.max(RASTER_M_PER_PX, scale);
  const W = Math.max(1, Math.round((maxLng - minLng) * m.x / mPerPx));
  const H = Math.max(1, Math.round((maxLat - minLat) * m.y / mPerPx));

  const src = document.createElement('canvas');
  src.width = W; src.height = H;
  const img = src.getContext('2d')!.createImageData(W, H);
  const palette = METRICS[metric].colors.map(hexRgb);
  for (let y = 0; y < H; y++) {
    const lat = maxLat - (y + 0.5) / H * (maxLat - minLat);
    for (let x = 0; x < W; x++) {
      const lng = minLng + (x + 0.5) / W * (maxLng - minLng);
      const { value, nearest } = idw(points, lng, lat, m);
      const [r, g, b] = palette[classIndex(metric, value)];
      const i = (y * W + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b;
      img.data[i + 3] = Math.round(confidenceAlpha(nearest) * 255);
    }
  }
  src.getContext('2d')!.putImageData(img, 0, 0);

  // Обрезка по контурам через clip — край сглажен, внутри классы остаются чёткими
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const ctx = out.getContext('2d')!;
  const px = (c: { lng: number; lat: number }) =>
    [(c.lng - minLng) / (maxLng - minLng) * W, (maxLat - c.lat) / (maxLat - minLat) * H] as const;
  ctx.beginPath();
  if (rings.length) {
    for (const ring of rings) ring.forEach((c, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, ...px(c)));
  } else {
    for (const p of points) {
      const [cx, cy] = px(p);
      ctx.moveTo(cx + COVERAGE_RADIUS_M / mPerPx, cy);
      ctx.arc(cx, cy, COVERAGE_RADIUS_M / mPerPx, 0, Math.PI * 2);
    }
  }
  ctx.clip();
  ctx.drawImage(src, 0, 0);

  return {
    url: out.toDataURL(),
    coordinates: [[minLng, maxLat], [maxLng, maxLat], [maxLng, minLat], [minLng, minLat]] as [number, number][],
  };
}

/** Внутри закрашенной области (зоны или круги покрытия)? — для подсказки под курсором */
function insideCoverage(lng: number, lat: number, zones: SoilZone[], points: IdwPoint[]) {
  if (zones.length) return zones.some(z => pointInPolygon({ lng, lat }, z.coordinates));
  return idw(points, lng, lat).nearest <= COVERAGE_RADIUS_M;
}

export function MapboxViewer({
  sensors, zones, field, mapMode, metric, onMetricChange, onSelectSensor, onSelectZone, activeSensorId, activeZoneId, topLeft,
}: MapboxViewerProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [viewState, setViewState] = useState({
    longitude: field.center.longitude,
    latitude: field.center.latitude,
    zoom: 13.5,
  });
  const [hover, setHover] = useState<{ x: number; y: number; value: number; nearest: number } | null>(null);

  const isHeatmap = mapMode === 'heatmap';
  const points = useMemo(() => heatPoints(sensors, metric), [sensors, metric]);
  const raster = useMemo(() => isHeatmap ? buildRaster(points, zones, metric) : null, [isHeatmap, points, zones, metric]);

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

  return (
    <div className="w-full h-full relative">
      <Map
        {...viewState}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onMove={(evt: any) => setViewState(evt.viewState)}
        mapStyle={MAP_STYLES[mapMode]}
        mapboxAccessToken={token}
        style={{ width: '100%', height: '100%' }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onMouseMove={(e: any) => {
          const { lng, lat } = e.lngLat;
          if (!raster || !insideCoverage(lng, lat, zones, points)) return setHover(null);
          setHover({ x: e.point.x, y: e.point.y, ...idw(points, lng, lat) });
        }}
        onMouseOut={() => setHover(null)}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />

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
                'line-width': isActive ? 3.5 : isHeatmap ? 1.5 : 2,
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

      {/* ─── Сводка + слой и легенда (легенда только в режиме карты показателей) ─── */}
      <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10 flex flex-col gap-2 w-[min(260px,calc(100%-120px))] md:w-[260px]">
      {topLeft}
      {isHeatmap && (
        <div className="bg-white/95 backdrop-blur-xl border border-black/5 rounded-xl shadow-pro p-2 flex flex-col gap-2">
          <div className="flex bg-[#f5f5f7] p-0.5 rounded-lg">
            {(Object.keys(METRICS) as MetricKey[]).map(k => (
              <button key={k} onClick={() => onMetricChange(k)}
                className={`flex-1 px-1 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-all ${metric === k ? 'bg-white shadow-sm text-[#1d1d1f]' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}
              >{t(`${METRICS[k].labelKey}Short`)}</button>
            ))}
          </div>
          <div className="px-1">
            <div className="flex gap-[2px] h-2.5">
              {def.colors.map(c => <div key={c} className="flex-1 first:rounded-l last:rounded-r" style={{ backgroundColor: c }} />)}
            </div>
            <div className="relative h-3.5 mt-0.5">
              {def.breaks.map((b, i) => (
                <span key={b} className="absolute -translate-x-1/2 text-[9px] font-bold font-data text-[#6e6e73]"
                  style={{ left: `${(i + 1) / def.colors.length * 100}%` }}
                >{b}</span>
              ))}
            </div>
            <div className="text-[9px] font-bold text-[#86868b] mt-0.5 leading-snug">
              <span className="text-[#1d1d1f]">{t(def.labelKey)}{def.unit && `, ${def.unit}`}</span> · {t('map.paleFar')}
            </div>
          </div>
          {!points.length && <p className="px-1 text-[10px] font-bold text-[#86868b]">{t('map.noData')}</p>}
        </div>
      )}
      </div>
    </div>
  );
}
