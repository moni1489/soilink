import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { renderSVG } from 'uqr';
import { ArrowLeft, Printer, Download, Copy, Check, Pencil, Trash2, MapPin, AlertTriangle, Radio } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, CartesianGrid } from 'recharts';
import { fields } from '@/data/mockData';
import { useUser } from '@/auth/useAuth';
import { canManageSensors, canViewField } from '@/auth/roles';
import { useDateLocale } from '@/i18n';
import { SensorForm } from '@/components/SensorForm';
import { ConnectionPill } from '@/pages/SensorsPage';
import { METRICS, STATUS_COLORS, formatMetric, metricStatus, type MetricKey } from '@/data/metrics';
import {
  deleteSensor, getReadings, getSensor, updateSensor, webhookUrl, type Reading, type RegistrySensor,
} from '@/services/sensorService';

const PERIODS = [[24, 'sensors.p24h'], [168, 'sensors.p7d'], [720, 'sensors.p30d']] as const;

/** Показатели, которые меряет датчик, и где они лежат в показании */
const SERIES: { metric: Exclude<MetricKey, 'index'>; pick: (r: Reading) => number; color: string }[] = [
  { metric: 'moisture',    pick: r => r.soil_moisture,           color: '#2a78d6' },
  { metric: 'temperature', pick: r => r.soil_temperature,        color: '#eb6834' },
  { metric: 'ph',          pick: r => r.ph,                      color: '#1baf7a' },
  { metric: 'ec',          pick: r => r.electrical_conductivity, color: '#6250d6' },
];

export function SensorDetailPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const user = useUser();
  const navigate = useNavigate();
  const dateLocale = useDateLocale();
  const [sensor, setSensor] = useState<RegistrySensor | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [hours, setHours] = useState<number>(168);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    getSensor(id).then(s => { setSensor(s); setNotFound(false); }).catch(() => setNotFound(true));
    getReadings(id, hours).then(setReadings).catch(() => setReadings([]));
  }, [id, hours]);
  // Раз в минуту — после подключения к хабу первые пакеты появятся сами
  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  const pageUrl = `${window.location.origin}/sensors/${id}`;
  const qrSvg = useMemo(() => renderSVG(pageUrl, { ecc: 'M', border: 2 }), [pageUrl]);
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (notFound) return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-[#6e6e73]">
      <p className="text-[14px] font-bold">{t('sensors.notFound', { id })}</p>
      <Link to="/sensors" className="text-[12px] font-bold text-[#0071e3]">{t('sensors.back')}</Link>
    </div>
  );
  if (!sensor) return <div className="h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" /></div>;
  if (!canViewField(user, sensor.field_id)) return <div className="h-full flex items-center justify-center text-[13px] text-[#6e6e73]">{t('sensors.noAccess')}</div>;

  const field = fields.find(f => f.id === sensor.field_id);
  const last = sensor.last_reading;
  const canManage = canManageSensors(user);

  const downloadQr = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([qrSvg], { type: 'image/svg+xml' }));
    a.download = `${sensor.id}-qr.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const copyWebhook = () => {
    navigator.clipboard?.writeText(webhookUrl()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  const remove = async () => {
    if (!confirm(t('sensors.deleteConfirm', { id: sensor.id }))) return;
    await deleteSensor(sensor.id);
    navigate('/sensors');
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 md:py-8 flex flex-col gap-5">
        {/* Шапка */}
        <div className="flex flex-col gap-2">
          <Link to="/sensors" className="flex items-center gap-1 text-[12px] font-bold text-[#0071e3] w-fit"><ArrowLeft className="w-3.5 h-3.5" />{t('sensors.back')}</Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">{sensor.name}</h2>
            <span className="px-2 py-0.5 rounded-md bg-[#1d1d1f] text-white text-[11px] font-black font-data">{sensor.id}</span>
            <ConnectionPill sensor={sensor} />
          </div>
          <p className="text-[12px] text-[#6e6e73]">
            {field ? t(field.nameKey) : sensor.field_id}
            {last && ` · ${t('sensors.lastPacket')} ${formatDistanceToNowStrict(new Date(last.timestamp), { addSuffix: true, locale: dateLocale })}`}
            {` · ${t('sensors.packets', { count: sensor.readings_count })}`}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
          <div className="flex flex-col gap-5 min-w-0">
            {/* Текущие значения */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SERIES.map(({ metric: key, pick }) => {
                const value = last ? pick(last) : NaN;
                const st = metricStatus(key, value);
                const { ok } = METRICS[key];
                return (
                  <div key={key} className="bg-white rounded-xl border border-black/5 shadow-pro p-3.5 flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#6e6e73] truncate">{t(METRICS[key].labelKey)}</span>
                    <span className="text-2xl font-bold font-data leading-tight">{formatMetric(key, value)}</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#86868b]">
                      {st && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[st] }} />}
                      {ok ? t('sensors.norm', { lo: ok[0], hi: ok[1] }) : t('sensors.noNorm')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Графики */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-pro p-4 md:p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[13px] font-bold">{t('sensors.history')}</h3>
                <div className="flex bg-[#f5f5f7] p-0.5 rounded-lg">
                  {PERIODS.map(([h, key]) => (
                    <button key={h} onClick={() => setHours(h)}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${hours === h ? 'bg-white shadow-sm text-[#1d1d1f]' : 'text-[#6e6e73]'}`}
                    >{t(key)}</button>
                  ))}
                </div>
              </div>
              {readings.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-2 text-center">
                  <Radio className="w-6 h-6 text-[#c7c7cc]" />
                  <p className="text-[12px] text-[#86868b] max-w-sm">{sensor.readings_count ? t('sensors.noReadingsPeriod') : t('sensors.noReadings')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SERIES.map(s => <MetricChart key={s.metric} {...s} readings={readings} hours={hours} />)}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {/* QR-наклейка */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-pro p-4 flex flex-col gap-3">
              <h3 className="text-[13px] font-bold">{t('sensors.qr')}</h3>
              <div className="flex gap-3 items-center">
                <div className="w-28 h-28 flex-shrink-0 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                <p className="text-[11px] text-[#6e6e73] leading-relaxed">{t('sensors.qrHint')}</p>
              </div>
              {isLocalhost && (
                <p className="flex gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 p-2 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{t('sensors.qrLocalhost')}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => window.print()} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1d1d1f] text-white text-[11px] font-bold hover:bg-black"><Printer className="w-3.5 h-3.5" />{t('sensors.print')}</button>
                <button onClick={downloadQr} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#f5f5f7] text-[11px] font-bold hover:bg-black/5"><Download className="w-3.5 h-3.5" />SVG</button>
              </div>
            </div>

            {/* Паспорт */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-pro p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-bold">{t('sensors.passport')}</h3>
                {canManage && !editing && (
                  <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-[11px] font-bold text-[#0071e3]"><Pencil className="w-3 h-3" />{t('sensors.edit')}</button>
                )}
              </div>
              {editing ? (
                <SensorForm fields={fields.filter(f => canViewField(user, f.id))} initial={sensor} submitLabel={t('sensors.save')} onCancel={() => setEditing(false)}
                  onSubmit={async data => { setSensor(await updateSensor(sensor.id, data)); setEditing(false); load(); }}
                />
              ) : (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[12px]">
                  <Row label="DevEUI"><span className="font-data uppercase">{sensor.dev_eui ?? <span className="text-amber-600 font-sans font-bold normal-case">{t('sensors.noDevEui')}</span>}</span></Row>
                  <Row label={t('sensors.form.model')}>{sensor.model || '—'}</Row>
                  <Row label={t('sensors.form.depth')}><span className="font-data">{sensor.depth_cm}</span></Row>
                  <Row label={t('sensors.form.coords')}>
                    {sensor.latitude != null && sensor.longitude != null
                      ? <a className="font-data text-[#0071e3] inline-flex items-center gap-1" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${sensor.latitude},${sensor.longitude}`}><MapPin className="w-3 h-3" />{sensor.latitude.toFixed(5)}, {sensor.longitude.toFixed(5)}</a>
                      : <span className="text-amber-600 font-bold">{t('sensors.noCoords')}</span>}
                  </Row>
                  <Row label={t('sensors.registered')}>{format(new Date(sensor.created_at), 'dd.MM.yyyy')}</Row>
                  {sensor.notes && <Row label={t('sensors.form.notes')}>{sensor.notes}</Row>}
                </dl>
              )}
              {canManage && editing && (
                <button onClick={remove} className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 w-fit"><Trash2 className="w-3.5 h-3.5" />{t('sensors.delete')}</button>
              )}
            </div>

            {/* Подключение к хабу */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-pro p-4 flex flex-col gap-2.5">
              <h3 className="text-[13px] font-bold">{t('sensors.hub')}</h3>
              <ol className="list-decimal pl-4 flex flex-col gap-1.5 text-[11px] text-[#6e6e73] leading-relaxed">
                <li>{t('sensors.hubStep1')}</li>
                <li>{t('sensors.hubStep2')}</li>
              </ol>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 min-w-0 truncate px-2 py-1.5 bg-[#f5f5f7] rounded-md text-[10px] font-data">{webhookUrl()}</code>
                <button onClick={copyWebhook} title={t('sensors.copy')} className="p-1.5 rounded-md hover:bg-black/5 flex-shrink-0">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-[#6e6e73]" />}
                </button>
              </div>
              <p className="text-[11px] text-[#6e6e73] leading-relaxed">{t('sensors.hubStep3')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Наклейка — видна только при печати */}
      <div className="print-label">
        <div className="[&>svg]:w-full [&>svg]:h-full" style={{ width: '30mm', height: '30mm' }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <div>
          <div style={{ fontSize: '7pt', fontWeight: 700, letterSpacing: '0.1em' }}>SOILINK</div>
          <div style={{ fontSize: '14pt', fontWeight: 800, fontFamily: 'monospace' }}>{sensor.id}</div>
          <div style={{ fontSize: '8pt' }}>{sensor.name}</div>
          {sensor.dev_eui && <div style={{ fontSize: '6.5pt', fontFamily: 'monospace' }}>EUI {sensor.dev_eui.toUpperCase()}</div>}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <>
    <dt className="text-[#86868b] whitespace-nowrap">{label}</dt>
    <dd className="font-medium min-w-0 break-words">{children}</dd>
  </>;
}

function MetricChart({ metric, pick, color, readings, hours }: (typeof SERIES)[number] & { readings: Reading[]; hours: number }) {
  const { t } = useTranslation();
  const data = readings.map(r => ({ ts: new Date(r.timestamp).getTime(), v: pick(r) })).filter(d => Number.isFinite(d.v));
  const values = data.map(d => d.v);
  const stats = values.length ? { min: Math.min(...values), avg: values.reduce((a, b) => a + b, 0) / values.length, max: Math.max(...values) } : null;
  const { ok } = METRICS[metric];
  const tickFmt = (ts: number) => format(ts, hours <= 24 ? 'HH:mm' : 'dd.MM');

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#fbfbfd] border border-black/5 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-bold">{t(METRICS[metric].labelKey)}</span>
        {stats && (
          <span className="text-[10px] font-data text-[#6e6e73] whitespace-nowrap">
            {t('sensors.min')} <b className="text-[#1d1d1f]">{formatMetric(metric, stats.min)}</b> · {t('sensors.avg')} <b className="text-[#1d1d1f]">{formatMetric(metric, stats.avg)}</b> · {t('sensors.max')} <b className="text-[#1d1d1f]">{formatMetric(metric, stats.max)}</b>
          </span>
        )}
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#000" strokeOpacity={0.05} vertical={false} />
            {/* Зелёная полоса — оптимальный диапазон */}
            {ok && <ReferenceArea y1={ok[0]} y2={ok[1]} fill="#0ca30c" fillOpacity={0.07} stroke="none" ifOverflow="hidden" />}
            <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={tickFmt}
              tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} minTickGap={30} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              labelFormatter={ts => format(Number(ts), 'dd.MM HH:mm')}
              formatter={(v) => [formatMetric(metric, Number(v)), t(METRICS[metric].labelKey)]}
              contentStyle={{ borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', fontSize: 11 }}
            />
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={data.length < 40 ? { r: 2.5 } : false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
