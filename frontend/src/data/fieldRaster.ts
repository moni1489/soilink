import type { SoilZone } from '@/types';
import { METRICS, classIndex, idw, metersPerDeg, type IdwPoint, type MetricKey } from './metrics';

/** Поле без контуров зон — закрашиваем круги этого радиуса вокруг датчиков */
export const COVERAGE_RADIUS_M = 450;
/** Разрешение растра: метров на пиксель (не крупнее MAX_PX по стороне) — как у снимка z14@2x */
const RASTER_M_PER_PX = 3;
const MAX_PX = 1400;

export interface Extent { minLng: number; maxLng: number; minLat: number; maxLat: number }

export function rasterExtent(points: IdwPoint[], zones: SoilZone[]): Extent | null {
  if (!points.length) return null;
  const m = metersPerDeg(points[0].lat);
  const pad = { lng: COVERAGE_RADIUS_M / m.x, lat: COVERAGE_RADIUS_M / m.y };
  const all = zones.length ? zones.flatMap(z => z.coordinates) : points.flatMap(p => [
    { lng: p.lng - pad.lng, lat: p.lat - pad.lat }, { lng: p.lng + pad.lng, lat: p.lat + pad.lat },
  ]);
  return {
    minLng: Math.min(...all.map(c => c.lng)), maxLng: Math.max(...all.map(c => c.lng)),
    minLat: Math.min(...all.map(c => c.lat)), maxLat: Math.max(...all.map(c => c.lat)),
  };
}

export const extentKey = (e: Extent) => [e.minLng, e.minLat, e.maxLng, e.maxLat].map(v => v.toFixed(4)).join(',');

// ─── Спутниковый снимок → «зелень» ───

/** Зелень снимка в точке, в σ от среднего по полю (0 — снимка нет) */
export type Greenness = (lng: number, lat: number) => number;

const SAT_ZOOM = 14;
const TILE = 512; // @2x-тайл: ~3 м на пиксель на широте ВКО
const WORLD = TILE * 2 ** SAT_ZOOM;
const worldX = (lng: number) => (lng + 180) / 360 * WORLD;
const worldY = (lat: number) => {
  const s = Math.sin(lat * Math.PI / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * WORLD;
};

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous'; // тайлы Mapbox отдаются с CORS — иначе getImageData запрещён
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const cache = new Map<string, Promise<Greenness | null>>();

/** Снимок грузится один раз на контур поля; не загрузился — карта остаётся гладкой интерполяцией */
export function loadGreenness(ext: Extent, token: string): Promise<Greenness | null> {
  const key = extentKey(ext);
  if (!cache.has(key)) cache.set(key, fetchGreenness(ext, token).catch(() => null));
  return cache.get(key)!;
}

async function fetchGreenness(ext: Extent, token: string): Promise<Greenness | null> {
  const [x0, x1, y0, y1] = [worldX(ext.minLng), worldX(ext.maxLng), worldY(ext.maxLat), worldY(ext.minLat)];
  const [tx0, tx1, ty0, ty1] = [x0, x1, y0, y1].map(v => Math.floor(v / TILE));
  // ponytail: до 16 тайлов (~6×6 км) — для поля с запасом; больше — грузить по видимой области
  if ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) > 16) return null;

  const W = (tx1 - tx0 + 1) * TILE, H = (ty1 - ty0 + 1) * TILE;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const jobs: Promise<void>[] = [];
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) {
    jobs.push(loadImage(`https://api.mapbox.com/v4/mapbox.satellite/${SAT_ZOOM}/${tx}/${ty}@2x.jpg90?access_token=${token}`)
      .then(img => ctx.drawImage(img, (tx - tx0) * TILE, (ty - ty0) * TILE)));
  }
  await Promise.all(jobs);

  // Excess Green: (2G − R − B) / (R + G + B) — индекс растительности по обычному RGB-снимку
  const { data } = ctx.getImageData(0, 0, W, H);
  const g = new Float32Array(W * H);
  for (let i = 0; i < g.length; i++) {
    const r = data[i * 4], gr = data[i * 4 + 1], b = data[i * 4 + 2];
    g[i] = (2 * gr - r - b) / (r + gr + b + 1);
  }
  // Норма — по области поля, а не по всему тайлу
  const ox = tx0 * TILE, oy = ty0 * TILE;
  let sum = 0, sq = 0, n = 0;
  for (let y = Math.floor(y0 - oy); y < y1 - oy; y++) for (let x = Math.floor(x0 - ox); x < x1 - ox; x++) {
    const v = g[y * W + x]; sum += v; sq += v * v; n++;
  }
  const mean = sum / n, sd = Math.sqrt(Math.max(sq / n - mean * mean, 1e-9));

  return (lng, lat) => {
    const x = Math.floor(worldX(lng) - ox), y = Math.floor(worldY(lat) - oy);
    if (x < 0 || y < 0 || x >= W || y >= H) return 0;
    return Math.max(-2.5, Math.min(2.5, (g[y * W + x] - mean) / sd));
  };
}

// ─── Растр ───

/** Оценка в точке: интерполяция датчиков + детализация по снимку */
export function estimate(points: IdwPoint[], metric: MetricKey, sat: Greenness | undefined, lng: number, lat: number, m = metersPerDeg(lat)) {
  const r = idw(points, lng, lat, m);
  return { value: r.value + (sat ? METRICS[metric].satGain * sat(lng, lat) : 0), nearest: r.nearest };
}

const hexRgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

/** Достоверность падает с расстоянием до ближайшего датчика → прозрачность пикселя */
const confidenceAlpha = (nearestM: number) => 0.92 - Math.min(Math.max((nearestM - 300) / 700, 0), 1) * 0.32;

/**
 * Растр по показаниям датчиков, обрезанный по контурам зон. Каждый пиксель — своя оценка,
 * раскрашенная по классу. shares — доля площади каждого класса (для легенды).
 */
export function buildRaster(points: IdwPoint[], zones: SoilZone[], metric: MetricKey, ext: Extent, sat?: Greenness) {
  const { minLng, maxLng, minLat, maxLat } = ext;
  const m = metersPerDeg(points[0].lat);
  const mPerPx = Math.max(RASTER_M_PER_PX, Math.max((maxLng - minLng) * m.x, (maxLat - minLat) * m.y) / MAX_PX);
  const W = Math.max(1, Math.round((maxLng - minLng) * m.x / mPerPx));
  const H = Math.max(1, Math.round((maxLat - minLat) * m.y / mPerPx));

  const src = document.createElement('canvas');
  src.width = W; src.height = H;
  const img = src.getContext('2d')!.createImageData(W, H);
  const palette = METRICS[metric].colors.map(hexRgb);
  const cls = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const lat = maxLat - (y + 0.5) / H * (maxLat - minLat);
    for (let x = 0; x < W; x++) {
      const lng = minLng + (x + 0.5) / W * (maxLng - minLng);
      const { value, nearest } = estimate(points, metric, sat, lng, lat, m);
      const k = classIndex(metric, value);
      const [r, g, b] = palette[k];
      const i = y * W + x;
      cls[i] = k;
      img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = Math.round(confidenceAlpha(nearest) * 255);
    }
  }
  src.getContext('2d')!.putImageData(img, 0, 0);

  // Обрезка по контурам через clip — край сглажен, внутри классы остаются чёткими
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  const px = (c: { lng: number; lat: number }) =>
    [(c.lng - minLng) / (maxLng - minLng) * W, (maxLat - c.lat) / (maxLat - minLat) * H] as const;
  ctx.beginPath();
  if (zones.length) {
    for (const z of zones) z.coordinates.forEach((c, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, ...px(c)));
  } else {
    for (const p of points) {
      const [cx, cy] = px(p);
      ctx.moveTo(cx + COVERAGE_RADIUS_M / mPerPx, cy);
      ctx.arc(cx, cy, COVERAGE_RADIUS_M / mPerPx, 0, Math.PI * 2);
    }
  }
  ctx.clip();
  ctx.drawImage(src, 0, 0);

  const counts = new Array(palette.length).fill(0);
  const alpha = ctx.getImageData(0, 0, W, H).data;
  for (let i = 0; i < cls.length; i++) if (alpha[i * 4 + 3] > 127) counts[cls[i]]++;
  const total = counts.reduce((a, b) => a + b, 0) || 1;

  return {
    url: out.toDataURL(),
    coordinates: [[minLng, maxLat], [maxLng, maxLat], [maxLng, minLat], [minLng, minLat]] as [number, number][],
    shares: counts.map(c => c / total),
  };
}
