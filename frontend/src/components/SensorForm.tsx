import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LocateFixed, Loader2 } from 'lucide-react';
import type { Field } from '@/types';
import type { RegistrySensor, SensorInput } from '@/services/sensorService';

interface SensorFormProps {
  fields: Field[];
  initial?: RegistrySensor;
  submitLabel: string;
  onSubmit: (data: SensorInput) => Promise<void>;
  onCancel: () => void;
}

const inputCls = 'w-full px-3 py-2 bg-[#f5f5f7] border border-black/5 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3]/40';
const num = (v: string) => (v.trim() === '' ? null : Number(v));

export function SensorForm({ fields, initial, submitLabel, onSubmit, onCancel }: SensorFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    field_id: initial?.field_id ?? fields[0]?.id ?? '',
    model: initial?.model ?? '',
    dev_eui: initial?.dev_eui ?? '',
    depth_cm: String(initial?.depth_cm ?? 20),
    latitude: initial?.latitude?.toString() ?? '',
    longitude: initial?.longitude?.toString() ?? '',
    notes: initial?.notes ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }));

  // Ставят датчик в поле с телефона: скан QR → «Здесь» → координаты точки установки
  const locate = () => {
    if (!navigator.geolocation) return setError(t('sensors.locationError'));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setLocating(false);
      },
      () => { setError(t('sensors.locationError')); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const eui = form.dev_eui.replace(/[\s:-]/g, '');
    if (eui && !/^[0-9a-fA-F]{16}$/.test(eui)) return setError(t('sensors.devEuiInvalid'));
    const [lat, lng] = [num(form.latitude), num(form.longitude)];
    if ((lat != null && !(Math.abs(lat) <= 90)) || (lng != null && !(Math.abs(lng) <= 180))) return setError(t('sensors.coordsInvalid'));
    setBusy(true); setError('');
    try {
      await onSubmit({
        name: form.name.trim(), field_id: form.field_id, model: form.model.trim(),
        dev_eui: eui || null, depth_cm: Number(form.depth_cm) || 0,
        latitude: lat, longitude: lng, notes: form.notes.trim(),
      });
    } catch (err) {
      setError(err instanceof Error && err.message.includes('DevEUI') ? t('sensors.devEuiTaken') : t('sensors.saveError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Labeled label={t('sensors.form.name')}>
        <input required value={form.name} onChange={set('name')} className={inputCls} placeholder={t('sensors.form.namePlaceholder')} />
      </Labeled>
      <Labeled label={t('sensors.form.field')}>
        <select value={form.field_id} onChange={set('field_id')} className={inputCls}>
          {fields.map(f => <option key={f.id} value={f.id}>{t(f.nameKey)}</option>)}
        </select>
      </Labeled>
      <Labeled label={t('sensors.form.devEui')} hint={t('sensors.form.devEuiHint')}>
        <input value={form.dev_eui} onChange={set('dev_eui')} className={`${inputCls} font-data uppercase`} placeholder="24E124…" autoCapitalize="characters" spellCheck={false} />
      </Labeled>
      <Labeled label={t('sensors.form.model')}>
        <input value={form.model} onChange={set('model')} className={inputCls} placeholder="Soil 4-in-1, LoRaWAN" />
      </Labeled>
      <Labeled label={t('sensors.form.coords')}>
        <div className="flex gap-2">
          <input value={form.latitude} onChange={set('latitude')} inputMode="decimal" className={`${inputCls} font-data`} placeholder={t('sensors.form.lat')} />
          <input value={form.longitude} onChange={set('longitude')} inputMode="decimal" className={`${inputCls} font-data`} placeholder={t('sensors.form.lng')} />
          <button type="button" onClick={locate} title={t('sensors.form.here')}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 rounded-lg bg-[#f5f5f7] border border-black/5 text-[12px] font-bold hover:bg-black/5"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4 text-[#0071e3]" />}
            <span className="hidden sm:inline">{t('sensors.form.here')}</span>
          </button>
        </div>
      </Labeled>
      <Labeled label={t('sensors.form.depth')}>
        <input type="number" min={0} max={200} value={form.depth_cm} onChange={set('depth_cm')} className={`${inputCls} font-data`} />
      </Labeled>
      <div className="sm:col-span-2">
        <Labeled label={t('sensors.form.notes')}>
          <textarea rows={2} value={form.notes} onChange={set('notes')} className={`${inputCls} resize-none`} />
        </Labeled>
      </div>
      {error && <p className="sm:col-span-2 text-[12px] font-bold text-red-600">{error}</p>}
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-[12px] font-bold text-[#6e6e73] hover:bg-black/5">{t('sensors.cancel')}</button>
        <button disabled={busy} className="px-4 py-2 rounded-lg bg-[#0071e3] text-white text-[12px] font-bold hover:bg-[#0077ed] disabled:opacity-50 flex items-center gap-2">
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{submitLabel}
        </button>
      </div>
    </form>
  );
}

function Labeled({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-black uppercase tracking-wider text-[#6e6e73]">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-[#86868b]">{hint}</span>}
    </label>
  );
}
