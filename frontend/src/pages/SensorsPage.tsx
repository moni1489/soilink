import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { fields } from '@/data/mockData';
import { useUser } from '@/auth/useAuth';
import { canManageSensors, canViewField } from '@/auth/roles';
import { useDateLocale } from '@/i18n';
import { SensorForm } from '@/components/SensorForm';
import { formatMetric } from '@/data/metrics';
import { connectionOf, createSensor, listSensors, type Connection, type RegistrySensor } from '@/services/sensorService';

const CONNECTION_STYLE: Record<Connection, { dot: string; text: string; key: string }> = {
  online:  { dot: 'bg-green-500', text: 'text-green-700 bg-green-50', key: 'sensors.conn.online' },
  offline: { dot: 'bg-red-500',   text: 'text-red-700 bg-red-50',     key: 'sensors.conn.offline' },
  waiting: { dot: 'bg-[#8e8e93]', text: 'text-[#6e6e73] bg-[#f5f5f7]', key: 'sensors.conn.waiting' },
};

export function ConnectionPill({ sensor }: { sensor: RegistrySensor }) {
  const { t } = useTranslation();
  const st = CONNECTION_STYLE[connectionOf(sensor)];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${st.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{t(st.key)}
    </span>
  );
}

export function SensorsPage() {
  const { t } = useTranslation();
  const user = useUser();
  const navigate = useNavigate();
  const dateLocale = useDateLocale();
  const visibleFields = useMemo(() => fields.filter(f => canViewField(user, f.id)), [user]);
  const [list, setList] = useState<RegistrySensor[] | null>(null);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    listSensors().then(l => { setList(l); setError(false); }).catch(() => setError(true));
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const fieldName = (id: string) => { const f = fields.find(x => x.id === id); return f ? t(f.shortKey) : id; };
  const rows = (list ?? []).filter(s => visibleFields.some(f => f.id === s.field_id));
  const counts = rows.reduce((a, s) => ({ ...a, [connectionOf(s)]: a[connectionOf(s)] + 1 }), { online: 0, offline: 0, waiting: 0 } as Record<Connection, number>);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 md:py-8 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">{t('sensors.title')}</h2>
            <p className="text-[13px] text-[#6e6e73] mt-1">{t('sensors.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={load} title={t('common.refresh')} className="p-2 rounded-lg hover:bg-black/5 text-[#6e6e73]"></button>
            {canManageSensors(user) && !adding && (
              <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0071e3] text-white text-[12px] font-bold hover:bg-[#0077ed]">
                <span className="hidden sm:inline">{t('sensors.add')}</span>
              </button>
            )}
          </div>
        </div>

        {rows.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(counts) as Connection[]).map(c => (
              <span key={c} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${CONNECTION_STYLE[c].text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${CONNECTION_STYLE[c].dot}`} />{t(CONNECTION_STYLE[c].key)}: <span className="font-data">{counts[c]}</span>
              </span>
            ))}
          </div>
        )}

        {adding && (
          <div className="bg-white rounded-2xl border border-black/5 shadow-pro p-4 md:p-5">
            <h3 className="text-[13px] font-bold mb-3">{t('sensors.newTitle')}</h3>
            <SensorForm fields={visibleFields} submitLabel={t('sensors.create')} onCancel={() => setAdding(false)}
              onSubmit={async data => { const s = await createSensor(data); navigate(`/sensors/${s.id}`); }}
            />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-[12px] font-bold">
            {t('sensors.loadError')}
          </div>
        )}

        {list && rows.length === 0 && !error && (
          <div className="p-10 text-center text-[13px] text-[#86868b] bg-white rounded-2xl border border-black/5">{t('sensors.empty')}</div>
        )}

        {rows.length > 0 && (
          <div className="bg-white rounded-2xl border border-black/5 shadow-pro overflow-hidden divide-y divide-black/5">
            {rows.map(s => {
              const r = s.last_reading;
              return (
                <Link key={s.id} to={`/sensors/${s.id}`} className="flex items-center gap-3 md:gap-4 px-4 py-3 hover:bg-[#f5f5f7] transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-[#f5f5f7] flex items-center justify-center flex-shrink-0"></div>
                  <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1.6fr_auto] md:items-center gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-black font-data text-[#0071e3] flex-shrink-0">{s.id}</span>
                        <span className="text-[13px] font-bold truncate">{s.name}</span>
                      </div>
                      <span className="text-[11px] text-[#86868b] truncate block">{fieldName(s.field_id)}{s.model && ` · ${s.model}`}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <ConnectionPill sensor={s} />
                      {r && <span className="text-[11px] text-[#86868b] truncate">{formatDistanceToNowStrict(new Date(r.timestamp), { addSuffix: true, locale: dateLocale })}</span>}
                    </div>
                    <div className="text-[11px] font-bold font-data text-[#1d1d1f] flex gap-3 flex-wrap">
                      {r ? <>
                        <span>{formatMetric('moisture', r.soil_moisture)}</span>
                        <span>{formatMetric('temperature', r.soil_temperature)}</span>
                        <span>pH {formatMetric('ph', r.ph)}</span>
                        <span>EC {formatMetric('ec', r.electrical_conductivity)}</span>
                      </> : <span className="text-[#86868b] font-sans">{s.dev_eui ? t('sensors.noPackets') : t('sensors.noDevEui')}</span>}
                    </div>
                    <span className="hidden md:block text-[10px] font-data text-[#86868b] uppercase">{s.dev_eui ?? '—'}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
