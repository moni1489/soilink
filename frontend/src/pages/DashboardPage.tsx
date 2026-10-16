import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapboxViewer } from '@/components/MapboxViewer';
import { SensorPanel } from '@/components/SensorPanel';
import { ChatInterface } from '@/components/ChatInterface';
import { ComparisonModal } from '@/components/ComparisonModal';
import { DepthProfileModal } from '@/components/DepthProfileModal';
import { RecommendationsPanel } from '@/components/RecommendationsPanel';
import { MLAnalysisPanel } from '@/components/MLAnalysisPanel';
import { WeatherWidget } from '@/components/WeatherWidget';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNowStrict } from 'date-fns';
import { SoilAnalysisCard } from '@/components/SoilAnalysisCard';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Field, Sensor, SoilZone, MapMode, WeatherData, SensorStatus } from '@/types';
import { fields, sensors, zones, recommendations, weather } from '@/data/mockData';
import { fetchRealWeather } from '@/services/weatherService';
import { useUser } from '@/auth/useAuth';
import { canViewField, canExportData } from '@/auth/roles';
import { ExportDataModal } from '@/components/ExportDataModal';
import { METRICS, STATUS_COLORS, heatPoints, idw, pointInPolygon, sensorScore, statusFromScore, type MetricKey } from '@/data/metrics';
import { OFFLINE_AFTER_MIN } from '@/services/sensorService';
import { listSensors, toMapSensor } from '@/services/sensorService';
import { useDateLocale } from '@/i18n';

const ZONE_COLOR: Record<SensorStatus, SoilZone['color']> = { healthy: 'green', warning: 'yellow', critical: 'red' };
const REFRESH_MS = 60_000;
const SELECT = 'max-w-[150px] md:max-w-[200px] truncate px-2 py-1 rounded-lg border border-black/10 bg-white text-[12px] font-semibold outline-none focus:ring-2 focus:ring-[#0071e3]/20';
const TOOLBAR_BTN = 'flex-shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-black/10 hover:bg-[#f5f5f7]';

/** Индекс зоны — среднее по датчикам внутри неё; без датчиков — интерполяция в центре зоны */
function zoneFromSensors(zone: SoilZone, sensors: Sensor[]): SoilZone {
  const inside = sensors.filter(s => !s.offline && pointInPolygon({ lng: s.coordinates.longitude, lat: s.coordinates.latitude }, zone.coordinates));
  const lng = zone.coordinates.reduce((a, c) => a + c.lng, 0) / zone.coordinates.length;
  const lat = zone.coordinates.reduce((a, c) => a + c.lat, 0) / zone.coordinates.length;
  const scores = inside.map(sensorScore);
  const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : idw(heatPoints(sensors, 'index'), lng, lat).value;
  if (!Number.isFinite(score)) return zone;
  const healthScore = Math.round(score);
  return { ...zone, healthScore, color: ZONE_COLOR[statusFromScore(healthScore)] };
}

type Panel = 'map' | 'recommendations' | 'chat' | 'analysis' | 'ml';

export function DashboardPage() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const user = useUser();
  const visibleFields = useMemo(() => fields.filter(f => canViewField(user, f.id)), [user]);
  const [activeFieldId, setActiveFieldId] = useState((visibleFields[0] ?? fields[0]).id);
  const [activeZoneFilter, setActiveZoneFilter] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>('heatmap');
  const [metric, setMetric] = useState<MetricKey>('index');
  const navigate = useNavigate();
  const dateLocale = useDateLocale();
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [selectedZone, setSelectedZone] = useState<SoilZone | null>(null);
  const [panel, setPanel] = useState<Panel>(isMobile ? 'map' : 'recommendations');
  // на десктопе карта видна всегда — вкладка «Карта» есть только на мобильном
  const tab: Panel = !isMobile && panel === 'map' ? 'recommendations' : panel;
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [depthProfileOpen, setDepthProfileOpen] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!mapFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setMapFullscreen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mapFullscreen]);

  // Mapbox GL only recomputes its canvas size on a real window resize event,
  // not on a CSS class/layout change — nudge it after toggling fullscreen.
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
    return () => clearTimeout(t);
  }, [mapFullscreen, panelCollapsed]);

  const activeField = useMemo(() => visibleFields.find(f => f.id === activeFieldId) ?? visibleFields[0] ?? fields[0], [visibleFields, activeFieldId]);
  // Реальные датчики из реестра — поверх демо-сети, обновляются раз в минуту
  const [liveSensors, setLiveSensors] = useState<Sensor[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => listSensors(activeFieldId)
      .then(list => alive && setLiveSensors(list.map(toMapSensor).filter((s): s is Sensor => !!s)))
      .catch(() => alive && setLiveSensors([]));
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, [activeFieldId]);
  const activeSensors = useMemo(() => [...sensors.filter(s => s.fieldId === activeFieldId), ...liveSensors], [activeFieldId, liveSensors]);
  const onlineSensors = useMemo(() => activeSensors.filter(s => !s.offline), [activeSensors]);
  const allFieldZones = useMemo(() => zones.filter(z => z.fieldId === activeFieldId).map(z => zoneFromSensors(z, activeSensors)), [activeFieldId, activeSensors]);
  const activeZones = useMemo(() => activeZoneFilter ? allFieldZones.filter(z => z.id === activeZoneFilter) : allFieldZones, [allFieldZones, activeZoneFilter]);
  const activeRecs = useMemo(() => recommendations.filter(r => !r.fieldId || r.fieldId === activeFieldId), [activeFieldId]);
  const [realWeather, setRealWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadWeather() {
      try {
        const live = await fetchRealWeather(activeField.center.latitude, activeField.center.longitude);
        if (isMounted) setRealWeather(live);
      } catch (err) {
        console.warn('Real weather fetch error, using fallback:', err);
      }
    }
    loadWeather();
    return () => { isMounted = false; };
  }, [activeField.center.latitude, activeField.center.longitude]);

  const activeWeather = realWeather || weather[activeFieldId] || weather['f-1'];

  const fieldStatus = useMemo(() => {
    const scores = onlineSensors.map(sensorScore);
    const score = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const count = (st: SensorStatus) => onlineSensors.filter(s => s.status === st).length;
    const last = onlineSensors.reduce<string | null>((a, s) => !a || s.lastUpdated > a ? s.lastUpdated : a, null);
    const moisture = onlineSensors.length ? onlineSensors.reduce((a, s) => a + s.soilMoisture, 0) / onlineSensors.length : null;
    return {
      score, status: score == null ? null : statusFromScore(score), last, moisture,
      counts: { healthy: count('healthy'), warning: count('warning'), critical: count('critical') } as Record<SensorStatus, number>,
      offline: activeSensors.length - onlineSensors.length,
    };
  }, [activeSensors, onlineSensors]);

  const selectSensor = (s: Sensor) => s.registryId ? navigate(`/sensors/${s.registryId}`) : setSelectedSensor(s);

  const TABS: [Panel, string][] = [
    ...(isMobile ? [['map', t('dash.tabMap')] as [Panel, string]] : []),
    ['recommendations', t('dash.tabInsights')],
    ['ml', t('dash.tabAnalysis')],
    ['analysis', t('dash.tabSoil')],
    ['chat', t('dash.tabChat')],
  ];
  const lastLabel = fieldStatus.last && formatDistanceToNowStrict(new Date(fieldStatus.last), { addSuffix: true, locale: dateLocale });

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7] overflow-hidden">
      {/* Панель инструментов */}
      <div className="flex-shrink-0 bg-white border-b border-black/5 px-3 md:px-5 h-12 flex items-center gap-2 md:gap-3 z-30 relative">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <select value={activeFieldId} onChange={e => { setActiveFieldId(e.target.value); setActiveZoneFilter(null); }} className={SELECT}>
            {visibleFields.map(f => <option key={f.id} value={f.id}>{t(f.shortKey)}</option>)}
          </select>
          <select value={activeZoneFilter ?? ''} onChange={e => setActiveZoneFilter(e.target.value || null)} className={`${SELECT} hidden sm:block`}>
            <option value="">{t('dash.allZones')}</option>
            {allFieldZones.map(z => <option key={z.id} value={z.id}>{t(z.nameKey)}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide ml-auto md:ml-2">
          <div className="flex bg-[#f5f5f7] p-0.5 rounded-lg flex-shrink-0">
            {([['heatmap', t('dash.heatmap')], ['zones', t('dash.zones')], ['satellite', t('dash.satellite')]] as [MapMode, string][]).map(([m, lbl]) => (
              <button key={m} onClick={() => setMapMode(m)}
                className={`px-2.5 md:px-3 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${mapMode === m ? 'bg-white shadow-sm text-[#1d1d1f]' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}
              >{lbl}</button>
            ))}
          </div>
          <button onClick={() => setDepthProfileOpen(true)} className={TOOLBAR_BTN}>{t('dash.profile')}</button>
          {canExportData(user) && (
            <button onClick={() => setExportOpen(true)} title={t('dash.exportTooltip')} className={TOOLBAR_BTN}>{t('dash.export')}</button>
          )}
        </div>

        <div className="flex-shrink-0 hidden lg:block ml-auto">
          <WeatherWidget data={activeWeather} />
        </div>
      </div>

      {/* Вкладки на мобильном — текстом, без иконок */}
      <div className="md:hidden flex-shrink-0 flex bg-white border-b border-black/5 overflow-x-auto scrollbar-hide">
        {TABS.map(([key, label]) => <TabButton key={key} active={tab === key} onClick={() => setPanel(key)}>{label}</TabButton>)}
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Левая панель: сводка поля + вкладки */}
        <aside className={`w-full md:w-[400px] ${isMobile && tab === 'map' ? 'hidden' : !isMobile && panelCollapsed ? 'hidden' : 'flex-1 md:flex-none'} min-h-0 flex flex-col md:border-r border-black/5 bg-[#fbfbfd]`}>
          <div className="hidden md:flex items-center flex-shrink-0 bg-white border-b border-black/5 px-2">
            {TABS.map(([key, label]) => <TabButton key={key} active={tab === key} onClick={() => setPanel(key)}>{label}</TabButton>)}
            <button onClick={() => setPanelCollapsed(true)} className="ml-auto px-2 py-1 rounded-md text-[11px] font-semibold text-[#6e6e73] hover:bg-black/5 hover:text-[#1d1d1f]">{t('dash.panelHide')}</button>
          </div>
          <div className={`flex-1 min-h-0 ${tab === 'chat' ? 'flex flex-col p-4' : 'overflow-y-auto p-4 flex flex-col gap-4'}`}>
            {tab !== 'chat' && <FieldInsightsCard status={fieldStatus} field={activeField} zones={allFieldZones} lastLabel={lastLabel} />}
            {tab === 'chat' ? (
              <ChatInterface isOpen={true} onClose={() => setPanel('recommendations')} context={{ field: activeField, sensors: activeSensors }} />
            ) : tab === 'analysis' ? (
              <SoilAnalysisCard fieldId={activeFieldId} />
            ) : tab === 'ml' ? (
              <MLAnalysisPanel fieldId={activeFieldId} />
            ) : (
              <RecommendationsPanel recommendations={activeRecs} />
            )}
          </div>
        </aside>

        <div className={mapFullscreen
          ? 'fixed inset-0 z-[100] bg-white'
          : `${isMobile ? (tab === 'map' ? 'flex-1' : 'hidden') : 'flex-1'} relative bg-white overflow-hidden`
        }>
          <MapboxViewer
            key={activeField.id}
            sensors={activeSensors}
            zones={activeZones}
            field={activeField}
            mapMode={mapMode}
            metric={metric}
            onMetricChange={setMetric}
            onSelectSensor={selectSensor}
            onSelectZone={setSelectedZone}
            activeSensorId={selectedSensor?.id ?? null}
            activeZoneId={selectedZone?.id ?? null}
          />

          {!isMobile && panelCollapsed && !mapFullscreen && (
            <button onClick={() => setPanelCollapsed(false)}
              className="absolute top-2.5 left-2.5 z-20 h-[29px] px-2.5 bg-white rounded-md shadow-[0_0_0_2px_rgba(0,0,0,0.1)] text-[11px] font-semibold hover:bg-[#f5f5f7]"
            >{t('dash.panelShow')}</button>
          )}

          <button onClick={() => setMapFullscreen(v => !v)}
            title={mapFullscreen ? t('dash.fullscreenExit') : t('dash.fullscreenEnter')}
            className="absolute top-2.5 right-12 z-20 h-[29px] px-2.5 bg-white rounded-md shadow-[0_0_0_2px_rgba(0,0,0,0.1)] text-[11px] font-semibold hover:bg-[#f5f5f7]"
          >
            {mapFullscreen ? t('dash.collapse') : t('dash.expand')}
          </button>

          <AnimatePresence>
            {selectedZone && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                className="absolute top-3 left-3 right-3 md:right-auto md:w-72 bg-white rounded-xl shadow-pro-lg z-30 overflow-hidden border border-black/5"
              >
                <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
                  <h3 className="font-semibold text-[13px] truncate">{t(selectedZone.nameKey)}</h3>
                  <button onClick={() => setSelectedZone(null)} className="px-2.5 py-1 rounded-lg text-[12px] font-semibold text-[#6e6e73] hover:bg-black/5 flex-shrink-0">{t('common.close')}</button>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-[#6e6e73]">{t('dash.soilIndex')}</span>
                    <span className="text-2xl font-bold font-data leading-none">{selectedZone.healthScore}<span className="text-[12px] text-[#86868b] font-sans"> / 100</span></span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setComparisonOpen(true)} className="py-2 bg-[#0071e3] text-white rounded-lg text-[11px] font-semibold hover:bg-[#0077ed]">{t('dash.analysis')}</button>
                    <button onClick={() => setDepthProfileOpen(true)} className="py-2 bg-[#f5f5f7] rounded-lg text-[11px] font-semibold hover:bg-black/5">{t('dash.report')}</button>
                  </div>
                  <div className="p-3 bg-blue-50/60 rounded-lg flex gap-2.5">
                    <p className="text-[11px] text-blue-900 leading-relaxed">{t('dash.mineralAlert')}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <SensorPanel isOpen={!!selectedSensor} sensor={selectedSensor} onClose={() => setSelectedSensor(null)} />
      <ComparisonModal isOpen={comparisonOpen} sensor={selectedSensor} onClose={() => setComparisonOpen(false)} />
      <DepthProfileModal isOpen={depthProfileOpen} onClose={() => setDepthProfileOpen(false)} />
      {canExportData(user) && (
        <ExportDataModal isOpen={exportOpen} onClose={() => setExportOpen(false)}
          activeField={activeField} fields={visibleFields} exportedBy={t(user.nameKey)}
        />
      )}
    </div>
  );
}

type FieldStatus = {
  score: number | null; status: SensorStatus | null; last: string | null; moisture: number | null;
  counts: Record<SensorStatus, number>; offline: number;
};

const BADGE: Record<SensorStatus, { key: string; cls: string }> = {
  healthy:  { key: 'dash.badgeOk',   cls: 'bg-green-50 text-green-700' },
  warning:  { key: 'dash.badgeWarn', cls: 'bg-amber-50 text-amber-700' },
  critical: { key: 'dash.badgeCrit', cls: 'bg-red-50 text-red-700' },
};

/** Шкала влажности: сухо → оптимум → избыток, с отметкой средней по полю */
const MOISTURE_SCALE = { min: 5, max: 50 };
/** Плавный переход: сухо (красный) → оптимум 24–38% (зелёный) → переувлажнение (синий) */
const MOISTURE_GRADIENT = `linear-gradient(to right, ${(
  [[5, '#e0301e'], [13, '#f4802a'], [19, '#f3d33c'], [25, '#2fa84f'], [37, '#2fa84f'], [44, '#3987e5'], [50, '#1c5cab']] as const
).map(([v, c]) => `${c} ${(v - MOISTURE_SCALE.min) / (MOISTURE_SCALE.max - MOISTURE_SCALE.min) * 100}%`).join(', ')})`;

/** Карточка «Сводка поля» — всё считается из показаний датчиков */
function FieldInsightsCard({ status: f, field, zones, lastLabel }: { status: FieldStatus; field: Field; zones: SoilZone[]; lastLabel: string | null }) {
  const { t } = useTranslation();
  const online = f.counts.healthy + f.counts.warning + f.counts.critical;
  const ok = METRICS.moisture.ok!;
  const pos = (v: number) => (Math.min(Math.max(v, MOISTURE_SCALE.min), MOISTURE_SCALE.max) - MOISTURE_SCALE.min) / (MOISTURE_SCALE.max - MOISTURE_SCALE.min) * 100;
  return (
    <section className="bg-white rounded-xl border border-black/5 shadow-sm p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold">{t('dash.summary')}</h3>
        {f.status && <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${BADGE[f.status].cls}`}>{t(BADGE[f.status].key)}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-[#6e6e73]">{t('dash.soilMoisture')}</span>
          <span className="text-[12px] font-semibold font-data">{f.moisture != null ? `${f.moisture.toFixed(0)}%` : '—'}</span>
        </div>
        <div className="relative">
          <div className="h-2 rounded-full" style={{ background: MOISTURE_GRADIENT }} />
          {f.moisture != null && (
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#1d1d1f] shadow" style={{ left: `${pos(f.moisture)}%` }} />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-[#86868b]">
          <span>{t('dash.dry')}</span><span>{t('dash.optimum', { lo: ok[0], hi: ok[1] })}</span><span>{t('dash.wet')}</span>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12px]">
        <Stat label={t('dash.soilIndex')}><span className="font-data">{f.score ?? '—'}</span><span className="text-[#86868b]"> / 100</span></Stat>
        <Stat label={t('dash.area')}><span className="font-data">{field.areaHectares}</span> {t('common.ha')}</Stat>
        <Stat label={t('dash.sensorsLabel')}>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />{t('dash.sensorsOnline', { n: online })}
            {f.offline > 0 && <span className="text-[#86868b]">· {t('dash.sensorsOffline', { n: f.offline })}</span>}
          </span>
        </Stat>
        <Stat label={t('dash.lastReading')}>{lastLabel ?? '—'}</Stat>
      </dl>

      {zones.length > 0 && (
        <div className="flex flex-col gap-2 pt-3 border-t border-black/5">
          <span className="text-[11px] text-[#6e6e73]">{t('dash.zonesTitle')}</span>
          {zones.map(z => (
            <div key={z.id} className="flex items-center gap-3 text-[12px]">
              <span className="flex-1 min-w-0 truncate">{t(z.nameKey)}</span>
              <div className="w-20 h-1.5 rounded-full bg-[#f0f0f2] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${z.healthScore}%`, backgroundColor: STATUS_COLORS[statusFromScore(z.healthScore)] }} />
              </div>
              <span className="w-7 text-right font-data font-semibold">{z.healthScore}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-[#86868b] -mt-1">{t('dash.offlineHint', { min: OFFLINE_AFTER_MIN })}</p>
    </section>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="text-[10px] text-[#86868b]">{label}</dt>
      <dd className="font-semibold truncate">{children}</dd>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex-shrink-0 px-3.5 py-3 text-[12px] font-semibold border-b-2 transition-colors whitespace-nowrap ${active ? 'border-[#0071e3] text-[#1d1d1f]' : 'border-transparent text-[#6e6e73] hover:text-[#1d1d1f]'}`}
    >{children}</button>
  );
}
