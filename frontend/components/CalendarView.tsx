import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

type EventType = 'irrigation' | 'fertilization' | 'survey' | 'treatment' | 'sensor' | 'tillage';
type EventStatus = 'done' | 'planned' | 'today';

interface CalendarEvent {
  id: string;
  date: string;
  type: EventType;
  titleKey: string;
  fieldName: string;
  details: string;
  status: EventStatus;
  volume?: string;
}

const EVENT_COLORS: Record<EventType, string> = {
  irrigation: '#3B82F6',
  fertilization: '#10B981',
  survey: '#8B5CF6',
  treatment: '#F59E0B',
  sensor: '#64748B',
  tillage: '#92400E',
};

const EVENT_LABELS: Record<EventType, string> = {
  irrigation: 'IRR',
  fertilization: 'FRT',
  survey: 'DRN',
  treatment: 'PH',
  sensor: 'SEN',
  tillage: 'TLL',
};

const ALL_EVENTS: CalendarEvent[] = [
  { id: 'e1',  date: '2026-05-02', type: 'irrigation',   titleKey: 'calEvtIrrigation',  fieldName: 'Field 1',   details: '4h · 12.5 m³', status: 'done' },
  { id: 'e2',  date: '2026-05-05', type: 'sensor',       titleKey: 'calEvtSensorCheck', fieldName: 'Field 2',   details: 'Moisture & pH calibration', status: 'done' },
  { id: 'e3',  date: '2026-05-07', type: 'fertilization',titleKey: 'calEvtFertilizer',  fieldName: 'Field 1',   details: 'NPK 16-16-16 · 85 kg/ha', status: 'done' },
  { id: 'e4',  date: '2026-05-10', type: 'irrigation',   titleKey: 'calEvtIrrigation',  fieldName: 'Field 3',   details: '3h · 8.2 m³', status: 'done' },
  { id: 'e5',  date: '2026-05-12', type: 'survey',       titleKey: 'calEvtDroneSurvey', fieldName: 'Field 2',   details: 'NDVI + moisture mapping', status: 'done' },
  { id: 'e6',  date: '2026-05-14', type: 'treatment',    titleKey: 'calEvtPhTreatment', fieldName: 'Field 1',   details: 'Lime · 200 kg/ha', status: 'done' },
  { id: 'e7',  date: '2026-05-17', type: 'irrigation',   titleKey: 'calEvtIrrigation',  fieldName: 'Field 2',   details: '5h · 15.8 m³', status: 'done' },
  { id: 'e8',  date: '2026-05-19', type: 'sensor',       titleKey: 'calEvtSensorCheck', fieldName: 'All Fields',details: 'Full network calibration', status: 'done' },
  { id: 'e9',  date: '2026-05-21', type: 'tillage',      titleKey: 'calEvtTillage',     fieldName: 'Field 3',   details: 'Anti-compaction · 25 cm', status: 'done' },
  { id: 'e10', date: '2026-05-23', type: 'irrigation',   titleKey: 'calEvtIrrigation',  fieldName: 'Field 1',   details: '4h · 13.1 m³', status: 'done' },
  { id: 'e11', date: '2026-05-26', type: 'sensor',       titleKey: 'calEvtWaterAnalysis',fieldName: 'All Fields',details: 'Monthly water usage report', status: 'today' },
  { id: 'e12', date: '2026-05-28', type: 'irrigation',   titleKey: 'calEvtIrrigation',  fieldName: 'Field 2',   details: '4h cycle · planned', status: 'planned' },
  { id: 'e13', date: '2026-05-30', type: 'survey',       titleKey: 'calEvtDroneSurvey', fieldName: 'Field 1',   details: 'Pre-harvest NDVI scan', status: 'planned' },
  { id: 'e14', date: '2026-06-02', type: 'fertilization',titleKey: 'calEvtFertilizer',  fieldName: 'Field 3',   details: 'Nitrogen boost · 45 kg/ha', status: 'planned' },
  { id: 'e15', date: '2026-06-05', type: 'irrigation',   titleKey: 'calEvtIrrigation',  fieldName: 'Field 1',   details: '4h cycle · planned', status: 'planned' },
  { id: 'e16', date: '2026-06-09', type: 'treatment',    titleKey: 'calEvtPhTreatment', fieldName: 'Field 2',   details: 'pH correction treatment', status: 'planned' },
];

// May 2026: starts on Friday (offset=4 in Mon-first grid), 31 days
// June 2026: starts on Monday (offset=0), 30 days
const MONTHS = [
  { year: 2026, month: 4, name: 'May 2026',  nameRu: 'Май 2026',  nameKk: 'Мамыр 2026', days: 31, startOffset: 4 },
  { year: 2026, month: 5, name: 'June 2026', nameRu: 'Июнь 2026', nameKk: 'Маусым 2026', days: 30, startOffset: 0 },
];

const TODAY = '2026-05-26';

function getMonthLabel(m: typeof MONTHS[0], locale: string) {
  if (locale === 'ru') return m.nameRu;
  if (locale === 'kk') return m.nameKk;
  return m.name;
}

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function CalendarView() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isDark = theme === 'dark';
  const locale = i18n.language;

  const [monthIdx, setMonthIdx] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(TODAY);

  const currentMonth = MONTHS[monthIdx];
  const monthKey = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}`;

  const eventsInMonth = ALL_EVENTS.filter(e => e.date.startsWith(monthKey));

  const eventsForDay = (day: number) => {
    const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return eventsInMonth.filter(e => e.date === dateStr);
  };

  const selectedEvents = selectedDate
    ? ALL_EVENTS.filter(e => e.date === selectedDate)
    : [];

  const colors = isDark
    ? { bg: '#111111', card: '#1a1a1a', text: '#FFFFFF', sub: '#94A3B8', border: '#222222', dayBg: '#0d0d0d', todayBg: 'rgba(5,150,105,0.2)', todayBorder: '#10B981' }
    : { bg: '#FFFFFF', card: '#F8FAFC', text: '#020617', sub: '#64748B', border: '#E2E8F0', dayBg: '#F1F5F9', todayBg: 'rgba(5,150,105,0.1)', todayBorder: '#059669' };

  // Build 5-6 week rows
  const totalCells = currentMonth.startOffset + currentMonth.days;
  const rows = Math.ceil(totalCells / 7);
  const cells: (number | null)[] = [];
  for (let i = 0; i < rows * 7; i++) {
    const day = i - currentMonth.startOffset + 1;
    cells.push(day >= 1 && day <= currentMonth.days ? day : null);
  }

  const statusBadgeColor: Record<EventStatus, string> = {
    done: isDark ? 'rgba(100,116,139,0.3)' : '#E2E8F0',
    planned: 'rgba(59,130,246,0.15)',
    today: 'rgba(5,150,105,0.2)',
  };
  const statusTextColor: Record<EventStatus, string> = {
    done: colors.sub,
    planned: '#3B82F6',
    today: '#059669',
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
      <Text style={[styles.sectionLabel, { color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(2,6,23,0.3)' }]}>{t('calendarTitle') || 'FIELD CALENDAR'}</Text>

      {/* Month navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity
          onPress={() => setMonthIdx(Math.max(0, monthIdx - 1))}
          style={[styles.navBtn, { backgroundColor: colors.dayBg, borderColor: colors.border, opacity: monthIdx === 0 ? 0.3 : 1 }]}
          disabled={monthIdx === 0}
        >
          <Text style={[styles.navBtnText, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.text }]}>{getMonthLabel(currentMonth, locale)}</Text>
        <TouchableOpacity
          onPress={() => setMonthIdx(Math.min(MONTHS.length - 1, monthIdx + 1))}
          style={[styles.navBtn, { backgroundColor: colors.dayBg, borderColor: colors.border, opacity: monthIdx === MONTHS.length - 1 ? 0.3 : 1 }]}
          disabled={monthIdx === MONTHS.length - 1}
        >
          <Text style={[styles.navBtnText, { color: colors.text }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={styles.dayHeaders}>
        {DAY_HEADERS.map(d => (
          <Text key={d} style={[styles.dayHeader, { color: colors.sub }]}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={idx} style={styles.emptyCell} />;
          const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents = eventsForDay(day);
          const isToday = dateStr === TODAY;
          const isSelected = dateStr === selectedDate;
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dayCell,
                { backgroundColor: isToday ? colors.todayBg : isSelected ? (isDark ? 'rgba(255,255,255,0.07)' : '#E0F2FE') : colors.dayBg },
                isToday && { borderColor: colors.todayBorder, borderWidth: 1.5 },
                isSelected && !isToday && { borderColor: isDark ? '#334155' : '#BAE6FD', borderWidth: 1.5 },
              ]}
              onPress={() => setSelectedDate(isSelected ? null : dateStr)}
            >
              <Text style={[styles.dayNum, { color: isToday ? '#059669' : colors.text }, isToday && { fontWeight: '900' }]}>{day}</Text>
              <View style={styles.dotRow}>
                {dayEvents.slice(0, 3).map(ev => (
                  <View key={ev.id} style={[styles.dot, { backgroundColor: EVENT_COLORS[ev.type] }]} />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={[styles.legendRow, { borderTopColor: colors.border }]}>
        {(Object.keys(EVENT_COLORS) as EventType[]).map(type => (
          <View key={type} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: EVENT_COLORS[type] }]} />
            <Text style={[styles.legendText, { color: colors.sub }]}>{EVENT_LABELS[type]}</Text>
          </View>
        ))}

      </View>

      {/* Event detail */}
      {selectedEvents.length > 0 && (
        <View style={{ marginTop: 12, gap: 8 }}>
          <Text style={[styles.eventsTitle, { color: colors.sub }]}>{selectedDate === TODAY ? (t('calToday') || 'TODAY') : selectedDate}</Text>
          {selectedEvents.map(ev => (
            <View key={ev.id} style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: EVENT_COLORS[ev.type] }]}>
              <View style={styles.eventTop}>
                <View style={[styles.eventTypeBadge, { backgroundColor: EVENT_COLORS[ev.type] }]}>
                  <Text style={styles.eventTypeLabel}>{EVENT_LABELS[ev.type]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eventTitle, { color: colors.text }]}>{t(ev.titleKey) || ev.titleKey}</Text>
                  <Text style={[styles.eventField, { color: colors.sub }]}>{ev.fieldName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor[ev.status] }]}>
                  <Text style={[styles.statusText, { color: statusTextColor[ev.status] }]}>
                    {ev.status === 'done' ? (t('done') || 'Done') : ev.status === 'today' ? (t('today') || 'Today') : (t('pending') || 'Planned')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.eventDetails, { color: colors.sub }]}>{ev.details}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Upcoming events (when no day selected) */}
      {!selectedDate && (
        <View style={{ marginTop: 12, gap: 8 }}>
          <Text style={[styles.eventsTitle, { color: colors.sub }]}>{t('calUpcoming') || 'UPCOMING'}</Text>
          {ALL_EVENTS.filter(e => e.status === 'planned').slice(0, 4).map(ev => (
            <TouchableOpacity key={ev.id} style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: EVENT_COLORS[ev.type] }]} onPress={() => setSelectedDate(ev.date)}>
              <View style={styles.eventTop}>
                <View style={[styles.eventTypeBadge, { backgroundColor: EVENT_COLORS[ev.type] }]}>
                  <Text style={styles.eventTypeLabel}>{EVENT_LABELS[ev.type]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eventTitle, { color: colors.text }]}>{t(ev.titleKey) || ev.titleKey}</Text>
                  <Text style={[styles.eventField, { color: colors.sub }]}>{ev.fieldName}</Text>
                </View>
                <Text style={[styles.eventDate, { color: colors.sub }]}>{ev.date.slice(5)}</Text>
              </View>
              <Text style={[styles.eventDetails, { color: colors.sub }]}>{ev.details}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 20, fontWeight: '300', lineHeight: 24 },
  monthLabel: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyCell: { width: '14.28%', aspectRatio: 1, padding: 2 },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    borderRadius: 8,
    padding: 4,
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayNum: { fontSize: 11, fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, flexWrap: 'wrap', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingTop: 12, marginTop: 8, borderTopWidth: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11 },
  eventsTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  eventCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 12,
    gap: 6,
  },
  eventTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventIcon: { fontSize: 18 },
  eventTitle: { fontSize: 13, fontWeight: '700' },
  eventField: { fontSize: 11, marginTop: 1 },
  eventDetails: { fontSize: 12 },
  eventDate: { fontSize: 11, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  eventTypeBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  eventTypeLabel: { fontSize: 9, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
});
