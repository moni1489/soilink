import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, startOfToday, addDays, startOfWeek, eachDayOfInterval,
  isSameDay, isToday as isDateToday, startOfDay
} from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import {
  Droplet, FlaskConical, Bug, Clock, CheckCircle2, Calendar as CalendarIcon,
  Plus, X, ChevronLeft, ChevronRight, MapPin, Pencil, Trash2, UserRound, Lock, Check
} from 'lucide-react';
import type { TaskStatus, TaskType, WateringEvent } from '@/types';
import { generateTasks, fields } from '@/data/mockData';
import { useUser } from '@/auth/useAuth';
import { contractors, findAccount } from '@/auth/accounts';
import {
  ROLES, TASK_TYPE_LABELS, canViewTask, canViewField, canPlanTask,
  canOperateTask, canConfirmTask, levelOf,
} from '@/auth/roles';

const TYPE_STYLE: Record<TaskType, { icon: typeof Droplet; tint: string }> = {
  water:      { icon: Droplet,      tint: 'bg-blue-50 text-blue-600' },
  fertilizer: { icon: FlaskConical, tint: 'bg-green-50 text-green-600' },
  protection: { icon: Bug,          tint: 'bg-amber-50 text-amber-600' },
};

const STATUS: Record<TaskStatus, { label: string; tint: string }> = {
  scheduled:   { label: 'Запланировано', tint: 'bg-[#f5f5f7] text-[#6e6e73]' },
  in_progress: { label: 'В работе',      tint: 'bg-blue-50 text-blue-600' },
  completed:   { label: 'Выполнено',     tint: 'bg-green-50 text-green-600' },
  missed:      { label: 'Просрочено',    tint: 'bg-red-50 text-red-600' },
};

const pluralTasks = (n: number) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'ЗАДАЧА';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'ЗАДАЧИ';
  return 'ЗАДАЧ';
};

const fieldName = (id: string) => fields.find(f => f.id === id)?.name.split(' — ')[1] ?? id;

export function SchedulePage() {
  const user = useUser();
  const level = levelOf(user);
  const isContractor = level === 'contractor';

  const [tasks, setTasks] = useState<WateringEvent[]>(generateTasks);
  const [fieldFilter, setFieldFilter] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [showAddModal, setShowAddModal] = useState(false);

  const plannableTypes = ROLES[user.role].domains;
  const visibleTasks = useMemo(() => tasks.filter(t => canViewTask(user, t)), [tasks, user]);
  // Подрядчик видит только поля, на которых у него есть задания
  const visibleFields = useMemo(() => fields.filter(f =>
    isContractor ? visibleTasks.some(t => t.fieldId === f.id) : canViewField(user, f.id)
  ), [user, isContractor, visibleTasks]);

  const filteredTasks = useMemo(() =>
    fieldFilter ? visibleTasks.filter(t => t.fieldId === fieldFilter) : visibleTasks,
  [visibleTasks, fieldFilter]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { locale: ru });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [selectedDate]);

  const dailyTasks = useMemo(() =>
    filteredTasks.filter(t => isSameDay(t.date, selectedDate)).sort((a, b) => a.date.getTime() - b.date.getTime()),
  [filteredTasks, selectedDate]);

  const updateTask = (id: string, patch: Partial<WateringEvent>) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const accessNote = isContractor
    ? `${user.company} — показаны только назначенные вам задания`
    : level === 'field'
      ? `${ROLES[user.role].label}: поля ${visibleFields.map(f => fieldName(f.id)).join(', ')} — назначение исполнителей, статусы, факт`
      : level === 'specialist'
        ? `${ROLES[user.role].label}: просмотр всех работ, планирование — только «${plannableTypes.map(t => TASK_TYPE_LABELS[t]).join(', ')}»`
        : 'Полный доступ ко всем полям и операциям';

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7]">
      {/* Header */}
      <div className="px-4 sm:px-8 py-5 sm:py-8 bg-white border-b border-black/5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1d1d1f]">{isContractor ? 'Мои задания' : 'Календарь задач'}</h1>
          <p className="text-[12px] sm:text-[13px] text-[#6e6e73] font-medium flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 flex-shrink-0" />
            Сегодня: {format(new Date(), 'd MMMM yyyy', { locale: ru })}
          </p>
          <p className="text-[11px] text-[#86868b] font-medium flex items-center gap-1.5 mt-1">
            <Lock className="w-3 h-3 flex-shrink-0" /> {accessNote}
          </p>
        </div>

        {plannableTypes.length > 0 && (
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0071e3] text-white rounded-xl text-[13px] font-bold shadow-sm hover:bg-[#0077ed] transition-all w-full sm:w-auto flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> СОЗДАТЬ ЗАДАЧУ
          </button>
        )}
      </div>

      {/* Weekly Planner Strip */}
      <div className="px-4 sm:px-8 py-4 sm:py-6 bg-white border-b border-black/5 flex-shrink-0">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <div className="flex items-center gap-4">
               <h2 className="text-[13px] sm:text-[15px] font-bold text-[#1d1d1f] uppercase tracking-wider">
                  {format(selectedDate, 'LLLL yyyy', { locale: ru })}
               </h2>
               <div className="flex gap-1">
                  <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-1.5 hover:bg-black/5 rounded-lg transition-all"><ChevronLeft className="w-4 h-4 text-[#6e6e73]" /></button>
                  <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-1.5 hover:bg-black/5 rounded-lg transition-all"><ChevronRight className="w-4 h-4 text-[#6e6e73]" /></button>
               </div>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
               {visibleFields.length > 1 && (
                 <button onClick={() => setFieldFilter(null)}
                   className={`flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border ${fieldFilter === null ? 'bg-[#1d1d1f] text-white border-black' : 'bg-[#f5f5f7] text-[#6e6e73] border-black/5'}`}
                 >
                   Все поля
                 </button>
               )}
               {visibleFields.map(f => (
                 <button key={f.id} onClick={() => setFieldFilter(f.id)}
                   className={`flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border ${fieldFilter === f.id || visibleFields.length === 1 ? 'bg-[#1d1d1f] text-white border-black' : 'bg-[#f5f5f7] text-[#6e6e73] border-black/5'}`}
                 >
                   {fieldName(f.id)}
                 </button>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
            {calendarDays.map((day, i) => {
              const isSel = isSameDay(day, selectedDate);
              const isTod = isDateToday(day);
              const hasTasks = filteredTasks.some(t => isSameDay(t.date, day));
              return (
                 <button key={i} onClick={() => setSelectedDate(day)}
                   className={`flex flex-col items-center p-1.5 sm:p-3 rounded-lg sm:rounded-xl border transition-all ${isSel ? 'bg-[#0071e3] text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white text-[#6e6e73] border-black/5 hover:border-black/20'}`}
                 >
                    <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mb-1 ${isSel ? 'opacity-80' : 'opacity-60'}`}>
                       {format(day, 'EEEEEE', { locale: ru })}
                    </span>
                    <span className="text-sm sm:text-lg font-bold font-data">{format(day, 'd')}</span>
                    {isTod && !isSel && <div className="mt-1 w-1 h-1 rounded-full bg-blue-500" />}
                    {hasTasks && !isTod && !isSel && (
                       <div className="mt-1 w-3 h-1 rounded-full bg-blue-100" />
                    )}
                 </button>
              );
            })}
         </div>
      </div>

      {/* Daily Timeline View */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 sm:py-8 scrollbar-hide">
         <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-4 px-2">
               <h3 className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#6e6e73]">
                  {isDateToday(selectedDate) ? 'План на сегодня' : format(selectedDate, 'd MMMM', { locale: ru })}
               </h3>
               <span className="text-[11px] font-bold text-[#86868b]">{dailyTasks.length} {pluralTasks(dailyTasks.length)}</span>
            </div>

            <AnimatePresence mode="wait">
               {dailyTasks.length === 0 ? (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="py-20 text-center bg-white/50 border-2 border-dashed border-black/5 rounded-3xl"
                 >
                    <div className="w-16 h-16 bg-[#f5f5f7] rounded-full flex items-center justify-center mx-auto mb-4">
                       <Clock className="w-6 h-6 text-[#d2d2d7]" />
                    </div>
                    <p className="text-[14px] font-medium text-[#6e6e73]">
                      {isContractor ? 'На этот день заданий нет.' : 'Задач на этот день не запланировано.'}
                    </p>
                 </motion.div>
               ) : (
                 <div className="space-y-3">
                    {dailyTasks.map((task, i) => (
                       <TaskCard key={task.id} task={task} index={i}
                         onUpdate={patch => updateTask(task.id, patch)}
                         onDelete={() => deleteTask(task.id)}
                       />
                    ))}
                 </div>
               )}
            </AnimatePresence>
         </div>
      </div>

      <AddTaskModal isOpen={showAddModal} types={plannableTypes} fieldOptions={visibleFields}
        defaultFieldId={fieldFilter ?? visibleFields[0]?.id} managerName={user.name}
        onClose={() => setShowAddModal(false)}
        onAdd={t => { setTasks(prev => [...prev, t]); setShowAddModal(false); setSelectedDate(startOfDay(t.date)); }}
      />
    </div>
  );
}

function TaskCard({ task, index, onUpdate, onDelete }: {
  task: WateringEvent; index: number;
  onUpdate: (patch: Partial<WateringEvent>) => void;
  onDelete: () => void;
}) {
  const user = useUser();
  const canPlan = canPlanTask(user, task.type);
  const canOperate = canOperateTask(user, task);
  const canConfirm = canConfirmTask(user, task);
  const [editing, setEditing] = useState<'fact' | 'plan' | null>(null);
  const [draft, setDraft] = useState('');

  const { icon: Icon, tint } = TYPE_STYLE[task.type];
  const field = fields.find(f => f.id === task.fieldId);
  const assignee = findAccount(task.assigneeId);
  const done = task.status === 'completed';

  const startEdit = (kind: 'fact' | 'plan') => {
    setDraft(kind === 'fact' ? (task.factVolume ?? task.volume) : task.volume);
    setEditing(kind);
  };
  const saveEdit = () => {
    if (!draft.trim()) return;
    onUpdate(editing === 'fact' ? { factVolume: draft.trim() } : { volume: draft.trim() });
    setEditing(null);
  };

  const selectCls = 'h-8 px-2.5 rounded-lg bg-[#f5f5f7] border border-black/5 text-[12px] font-semibold outline-none focus:ring-2 focus:ring-blue-500/20';
  const actionBtn = 'flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-bold transition-all';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className="p-3 sm:p-5 bg-white border border-black/5 rounded-2xl shadow-sm transition-all hover:shadow-md"
    >
      <div className={`flex items-start gap-3 sm:gap-5 ${done ? 'opacity-70' : ''}`}>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${tint}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[13px] sm:text-[15px] font-bold ${done ? 'line-through text-[#6e6e73]' : ''}`}>
              {TASK_TYPE_LABELS[task.type]} · {task.sector}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#f5f5f7] text-[#6e6e73] uppercase tracking-wider">{task.crop}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${STATUS[task.status].tint}`}>{STATUS[task.status].label}</span>
          </div>
          <div className="flex items-center gap-x-4 gap-y-1 text-[11px] sm:text-[12px] font-medium text-[#6e6e73] flex-wrap">
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(task.date, 'HH:mm')} • {task.duration} мин</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {field?.name.split(' — ')[1]} · {field?.areaHectares} га</span>
            <span>Норма: <b className="text-[#1d1d1f]">{task.volume}</b></span>
            {task.factVolume && <span>Факт: <b className="text-green-600">{task.factVolume}</b></span>}
          </div>
          <div className="flex items-center gap-x-4 gap-y-1 text-[11px] font-medium text-[#86868b] mt-1 flex-wrap">
            <span className="flex items-center gap-1.5"><UserRound className="w-3.5 h-3.5" /> Исполнитель: {assignee?.company ?? 'не назначен'}</span>
            <span>План: {task.managerName}</span>
            {field && <span className="font-data">{field.center.latitude.toFixed(4)}, {field.center.longitude.toFixed(4)}</span>}
          </div>
        </div>
      </div>

      {/* Actions — each block appears only for roles allowed to use it */}
      {(canOperate || canPlan || canConfirm) && (
        <div className="mt-3 pt-3 border-t border-black/5 flex items-center gap-2 flex-wrap">
          {editing ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[11px] font-bold text-[#6e6e73] uppercase tracking-wider flex-shrink-0">
                {editing === 'fact' ? 'Факт' : 'Норма'}
              </span>
              <input value={draft} onChange={e => setDraft(e.target.value)} autoFocus
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }}
                className={`${selectCls} flex-1 min-w-0`}
              />
              <button onClick={saveEdit} className={`${actionBtn} bg-[#0071e3] text-white`}><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditing(null)} className={`${actionBtn} bg-[#f5f5f7] text-[#6e6e73]`}><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <>
              {canOperate && (
                <>
                  <select value={task.assigneeId ?? ''} onChange={e => onUpdate({ assigneeId: e.target.value || undefined })}
                    className={selectCls} aria-label="Исполнитель"
                  >
                    <option value="">Без исполнителя</option>
                    {contractors.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                  </select>
                  <select value={task.status} onChange={e => onUpdate({ status: e.target.value as TaskStatus })}
                    className={selectCls} aria-label="Статус"
                  >
                    {(Object.keys(STATUS) as TaskStatus[]).map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
                  </select>
                  <button onClick={() => startEdit('fact')} className={`${actionBtn} bg-[#f5f5f7] text-[#1d1d1f] hover:bg-black/10`}>
                    <Pencil className="w-3.5 h-3.5" /> Внести факт
                  </button>
                </>
              )}
              {canPlan && (
                <>
                  <button onClick={() => startEdit('plan')} className={`${actionBtn} bg-[#f5f5f7] text-[#1d1d1f] hover:bg-black/10`}>
                    <Pencil className="w-3.5 h-3.5" /> Изменить норму
                  </button>
                  <button onClick={onDelete} className={`${actionBtn} text-red-500 hover:bg-red-50`} aria-label="Удалить задачу">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {canConfirm && (
                <>
                  <button onClick={() => startEdit('fact')} className={`${actionBtn} bg-[#f5f5f7] text-[#1d1d1f] hover:bg-black/10`}>
                    <Pencil className="w-3.5 h-3.5" /> Указать факт
                  </button>
                  <button onClick={() => onUpdate({ status: 'completed', confirmedAt: new Date() })}
                    className={`${actionBtn} bg-green-500 text-white shadow-md shadow-green-500/20 hover:bg-green-600 ml-auto`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Подтвердить выполнение
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
      {task.confirmedAt && (
        <p className="mt-2 text-[11px] font-semibold text-green-600 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Подрядчик подтвердил выполнение {format(task.confirmedAt, 'd MMM, HH:mm', { locale: ru })}
        </p>
      )}
    </motion.div>
  );
}

function AddTaskModal({ isOpen, types, fieldOptions, defaultFieldId, managerName, onClose, onAdd }: {
  isOpen: boolean; types: TaskType[]; fieldOptions: typeof fields;
  defaultFieldId?: string; managerName: string;
  onClose: () => void; onAdd: (task: WateringEvent) => void;
}) {
  const [form, setForm] = useState({
    fieldId: defaultFieldId ?? '',
    sector: 'Зона А', crop: 'Пшеница',
    type: types[0] as TaskType | undefined,
    volume: '15 л/м²', duration: 40,
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });

  const fieldId = form.fieldId || defaultFieldId || fieldOptions[0]?.id;
  const type = form.type && types.includes(form.type) ? form.type : types[0];

  const handleSubmit = () => {
    if (!fieldId || !type) return;
    const [first, last = ''] = managerName.split(' ');
    onAdd({
      id: `t-${Date.now()}`, fieldId,
      date: new Date(form.date),
      sector: form.sector, crop: form.crop,
      managerName: `${first} ${last[0] ?? ''}.`, managerAvatar: '',
      type, volume: form.volume, duration: form.duration,
      status: 'scheduled', targetMoisture: 50,
    });
  };

  const inputCls = 'w-full h-11 px-4 rounded-xl bg-[#f5f5f7] border-transparent font-bold text-[14px]';
  const labelCls = 'block text-[11px] font-bold text-[#6e6e73] uppercase tracking-wider';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 sm:p-10 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-bold">Новая операция</h2>
              <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-lg"><X className="w-5 h-5 text-[#6e6e73]" /></button>
            </div>

            <div className="space-y-6">
               <div>
                  <label className={`${labelCls} mb-2`}>Тип воздействия</label>
                  <div className={`grid gap-3 ${types.length > 1 ? 'grid-cols-3' : 'grid-cols-1'}`}>
                     {types.map(t => {
                       const { icon: Icon } = TYPE_STYLE[t];
                       return (
                         <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                           className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold border transition-all ${type === t ? 'bg-[#0071e3] text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white border-black/10 text-[#6e6e73]'}`}
                         >
                           <Icon className="w-4 h-4" /> {TASK_TYPE_LABELS[t]}
                         </button>
                       );
                     })}
                  </div>
               </div>
               <div className="space-y-2">
                  <label className={labelCls}>Поле</label>
                  <select value={fieldId} onChange={e => setForm(f => ({ ...f, fieldId: e.target.value }))} className={inputCls}>
                    {fieldOptions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className={labelCls}>Сектор</label>
                     <input value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} className={inputCls} />
                  </div>
                  <div className="space-y-2">
                     <label className={labelCls}>Культура</label>
                     <input value={form.crop} onChange={e => setForm(f => ({ ...f, crop: e.target.value }))} className={inputCls} />
                  </div>
                  <div className="space-y-2">
                     <label className={labelCls}>Норма</label>
                     <input value={form.volume} onChange={e => setForm(f => ({ ...f, volume: e.target.value }))} className={inputCls} />
                  </div>
                  <div className="space-y-2">
                     <label className={labelCls}>Длительность, мин</label>
                     <input type="number" min={1} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} className={inputCls} />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className={labelCls}>Дата и время</label>
                  <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
               </div>
               <button onClick={handleSubmit} className="w-full py-4 bg-[#0071e3] text-white rounded-2xl text-[15px] font-bold shadow-lg shadow-blue-500/20 hover:bg-[#0077ed] transition-all">СОХРАНИТЬ В ПЛАН</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
