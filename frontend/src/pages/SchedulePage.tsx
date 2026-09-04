import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, startOfToday, addDays, startOfWeek, eachDayOfInterval, 
  isSameDay, isToday as isDateToday 
} from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { 
  Droplet, FlaskConical, Clock, CheckCircle2, Calendar as CalendarIcon, 
  Plus, X, ChevronLeft, ChevronRight, LayoutGrid, List as ListIcon,
  Search, Filter, MapPin
} from 'lucide-react';
import type { WateringEvent } from '@/types';
import { generateWateringEvents, fields } from '@/data/mockData';

export function SchedulePage() {
  const [activeFieldId, setActiveFieldId] = useState(fields[0].id);
  const [events, setEvents] = useState<WateringEvent[]>(() => generateWateringEvents(fields[0].id));
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [showAddModal, setShowAddModal] = useState(false);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { locale: ru });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [selectedDate]);

  const dailyEvents = useMemo(() => 
    events.filter(e => isSameDay(e.date, selectedDate)),
  [events, selectedDate]);

  const toggleComplete = (id: string) => setEvents(prev =>
    prev.map(e => e.id === id ? { ...e, status: e.status === 'completed' ? 'scheduled' as const : 'completed' as const } : e)
  );

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7]">
      {/* Header */}
      <div className="px-4 sm:px-8 py-5 sm:py-8 bg-white border-b border-black/5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1d1d1f]">Календарь задач</h1>
          <p className="text-[12px] sm:text-[13px] text-[#6e6e73] font-medium flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Сегодня: {format(new Date(), 'd MMMM yyyy', { locale: ru })}
          </p>
        </div>

        <div className="flex items-center gap-3">
           <button onClick={() => setShowAddModal(true)}
             className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0071e3] text-white rounded-xl text-[13px] font-bold shadow-sm hover:bg-[#0077ed] transition-all w-full sm:w-auto"
           >
             <Plus className="w-4 h-4" /> СОЗДАТЬ ЗАДАЧУ
           </button>
        </div>
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
               {fields.map(f => (
                 <button key={f.id} onClick={() => setActiveFieldId(f.id)}
                   className={`flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border ${activeFieldId === f.id ? 'bg-[#1d1d1f] text-white border-black' : 'bg-[#f5f5f7] text-[#6e6e73] border-black/5'}`}
                 >
                   {f.name.split(' — ')[0]}
                 </button>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
            {calendarDays.map((day, i) => {
              const isSel = isSameDay(day, selectedDate);
              const isTod = isDateToday(day);
              const hasEvents = events.some(e => isSameDay(e.date, day));
              return (
                 <button key={i} onClick={() => setSelectedDate(day)}
                   className={`flex flex-col items-center p-1.5 sm:p-3 rounded-lg sm:rounded-xl border transition-all ${isSel ? 'bg-[#0071e3] text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white text-[#6e6e73] border-black/5 hover:border-black/20'}`}
                 >
                    <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mb-1 ${isSel ? 'opacity-80' : 'opacity-60'}`}>
                       {format(day, 'EEEEEE', { locale: ru })}
                    </span>
                    <span className="text-sm sm:text-lg font-bold font-data">{format(day, 'd')}</span>
                    {isTod && !isSel && <div className="mt-1 w-1 h-1 rounded-full bg-blue-500" />}
                    {hasEvents && !isTod && !isSel && (
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
               <span className="text-[11px] font-bold text-[#86868b]">{dailyEvents.length} СОБЫТИЙ</span>
            </div>

            <AnimatePresence mode="wait">
               {dailyEvents.length === 0 ? (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="py-20 text-center bg-white/50 border-2 border-dashed border-black/5 rounded-3xl"
                 >
                    <div className="w-16 h-16 bg-[#f5f5f7] rounded-full flex items-center justify-center mx-auto mb-4">
                       <Clock className="w-6 h-6 text-[#d2d2d7]" />
                    </div>
                    <p className="text-[14px] font-medium text-[#6e6e73]">Задач на этот день не запланировано.</p>
                 </motion.div>
               ) : (
                 <div className="space-y-3">
                    {dailyEvents.map((ev, i) => (
                       <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                          className={`flex items-center gap-3 sm:gap-6 p-3 sm:p-5 bg-white border border-black/5 rounded-2xl shadow-sm transition-all hover:shadow-md ${ev.status === 'completed' ? 'opacity-60' : ''}`}
                       >
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${ev.type === 'fertilizer' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                             {ev.type === 'fertilizer' ? <FlaskConical className="w-5 h-5 sm:w-6 sm:h-6" /> : <Droplet className="w-5 h-5 sm:w-6 sm:h-6" />}
                          </div>

                          <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                                <span className={`text-[13px] sm:text-[15px] font-bold truncate ${ev.status === 'completed' ? 'line-through text-[#6e6e73]' : ''}`}>{ev.sector}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#f5f5f7] text-[#6e6e73] uppercase tracking-wider">{ev.crop}</span>
                             </div>
                             <div className="flex items-center gap-2 sm:gap-4 text-[11px] sm:text-[12px] font-medium text-[#6e6e73] flex-wrap">
                                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(ev.date, 'HH:mm')} • {ev.duration} мин</span>
                                <span className="hidden sm:flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {ev.volume}</span>
                             </div>
                          </div>

                          <button onClick={() => toggleComplete(ev.id)}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 transition-all flex items-center justify-center flex-shrink-0 ${ev.status === 'completed' ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20' : 'border-black/10 hover:border-blue-500 text-transparent hover:text-blue-500'}`}
                          >
                             <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                       </motion.div>
                    ))}
                 </div>
               )}
            </AnimatePresence>
         </div>
      </div>

      <AddEventModal isOpen={showAddModal} fieldId={activeFieldId} onClose={() => setShowAddModal(false)}
        onAdd={ev => { setEvents(prev => [...prev, ev]); setShowAddModal(false); }}
      />
    </div>
  );
}

function AddEventModal({ isOpen, fieldId, onClose, onAdd }: {
  isOpen: boolean; fieldId: string;
  onClose: () => void; onAdd: (ev: WateringEvent) => void;
}) {
  const [form, setForm] = useState({
    sector: 'Сектор А', crop: 'Озимая пшеница',
    type: 'water' as 'water' | 'fertilizer',
    volume: '15 л/м²', duration: 40,
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });

  const handleSubmit = () => {
    onAdd({
      id: `wev-${Date.now()}`, fieldId,
      date: new Date(form.date),
      sector: form.sector, crop: form.crop,
      managerName: 'Алексей Н.', managerAvatar: 'https://i.pravatar.cc/150?u=admin',
      type: form.type, volume: form.volume, duration: form.duration,
      status: 'scheduled', targetMoisture: 50,
    });
  };

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
                  <label className="block text-[11px] font-bold text-[#6e6e73] uppercase tracking-wider mb-2">Тип воздействия</label>
                  <div className="grid grid-cols-2 gap-3">
                     <button onClick={() => setForm(f => ({ ...f, type: 'water' }))} className={`py-3 rounded-xl text-[13px] font-bold border transition-all ${form.type === 'water' ? 'bg-[#0071e3] text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white border-black/10 text-[#6e6e73]'}`}>💧 Полив</button>
                     <button onClick={() => setForm(f => ({ ...f, type: 'fertilizer' }))} className={`py-3 rounded-xl text-[13px] font-bold border transition-all ${form.type === 'fertilizer' ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/20' : 'bg-white border-black/10 text-[#6e6e73]'}`}>🌿 Удобрение</button>
                  </div>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="block text-[11px] font-bold text-[#6e6e73] uppercase tracking-wider">Сектор</label>
                     <input value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} className="w-full h-11 px-4 rounded-xl bg-[#f5f5f7] border-transparent font-bold text-[14px]" />
                  </div>
                  <div className="space-y-2">
                     <label className="block text-[11px] font-bold text-[#6e6e73] uppercase tracking-wider">Культура</label>
                     <input value={form.crop} onChange={e => setForm(f => ({ ...f, crop: e.target.value }))} className="w-full h-11 px-4 rounded-xl bg-[#f5f5f7] border-transparent font-bold text-[14px]" />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-[#6e6e73] uppercase tracking-wider">Дата и время</label>
                  <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full h-11 px-4 rounded-xl bg-[#f5f5f7] border-transparent font-bold text-[14px]" />
               </div>
               <button onClick={handleSubmit} className="w-full py-4 bg-[#0071e3] text-white rounded-2xl text-[15px] font-bold shadow-lg shadow-blue-500/20 hover:bg-[#0077ed] transition-all">СОХРАНИТЬ В ПЛАН</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
