import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileSpreadsheet, FileJson, Radio, Layers, BrainCircuit, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { Field } from '@/types';
import { DATASETS, exportDataset, type ExportDataset, type ExportFormat } from '@/services/exportService';

const DATASET_ICONS: Record<ExportDataset, typeof Radio> = {
  sensors: Radio,
  profile: Layers,
  predictions: BrainCircuit,
};

export function ExportDataModal({ isOpen, onClose, activeField, fields, exportedBy }: {
  isOpen: boolean;
  onClose: () => void;
  activeField: Field;
  fields: Field[];
  exportedBy: string;
}) {
  const [scope, setScope] = useState<'active' | 'all'>('active');
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const targetFields = scope === 'active' ? [activeField] : fields;

  const handleExport = async (dataset: ExportDataset, fmt: ExportFormat) => {
    setBusy(`${dataset}-${fmt}`);
    setResult(null);
    try {
      const count = await exportDataset(dataset, targetFields, fmt, exportedBy);
      setResult(count > 0
        ? { ok: true, text: `«${DATASETS[dataset].label}»: выгружено строк — ${count}` }
        : { ok: false, text: `«${DATASETS[dataset].label}»: по выбранным полям нет данных` });
    } catch {
      setResult({ ok: false, text: 'Не удалось сформировать файл' });
    } finally {
      setBusy(null);
    }
  };

  const fmtBtn = 'flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-bold border transition-all disabled:opacity-40';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 sm:p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold">Выгрузка данных</h2>
                <p className="text-[12px] text-[#6e6e73] font-medium mt-1">CSV открывается в Excel, JSON — для Python и других систем</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-lg flex-shrink-0" aria-label="Закрыть"><X className="w-5 h-5 text-[#6e6e73]" /></button>
            </div>

            <label className="block text-[11px] font-bold text-[#6e6e73] uppercase tracking-wider mb-2">Поля</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#f5f5f7] rounded-xl mb-6">
              {([['active', activeField.name.split(' — ')[1] ?? activeField.name], ['all', `Все поля (${fields.length})`]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setScope(key)} disabled={key === 'all' && fields.length < 2}
                  className={`py-2 px-3 rounded-lg text-[12px] font-bold truncate transition-all disabled:opacity-40 ${scope === key ? 'bg-white shadow-sm text-[#0071e3]' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="block text-[11px] font-bold text-[#6e6e73] uppercase tracking-wider mb-2">Набор данных</label>
            <div className="space-y-2">
              {(Object.keys(DATASETS) as ExportDataset[]).map(ds => {
                const Icon = DATASET_ICONS[ds];
                return (
                  <div key={ds} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-black/5 bg-[#fbfbfd]">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0071e3] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold">{DATASETS[ds].label}</p>
                        <p className="text-[11px] text-[#6e6e73] leading-snug">{DATASETS[ds].description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {([['csv', FileSpreadsheet, 'CSV'], ['json', FileJson, 'JSON']] as const).map(([fmt, FmtIcon, label]) => (
                        <button key={fmt} onClick={() => handleExport(ds, fmt)} disabled={busy !== null}
                          className={`${fmtBtn} ${fmt === 'csv' ? 'bg-[#0071e3] text-white border-[#0071e3] hover:bg-[#0077ed]' : 'bg-white text-[#1d1d1f] border-black/10 hover:border-black/20'}`}
                        >
                          {busy === `${ds}-${fmt}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FmtIcon className="w-3.5 h-3.5" />}
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {result && (
              <div className={`mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold ${result.ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {result.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {result.text}
              </div>
            )}

            <p className="mt-5 text-[11px] text-[#86868b] flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 flex-shrink-0" />
              Если сервер недоступен, профиль и предсказания берутся из демо-данных — это указано в колонке «Источник».
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
