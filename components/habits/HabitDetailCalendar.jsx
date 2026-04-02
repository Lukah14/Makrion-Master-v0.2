import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, Link2, MessageSquare } from 'lucide-react-native';

const DARK = '#1A1A1A';
const CARD = '#2A2A2A';
const ACCENT = '#E8526A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#9CA3AF';
const TEXT_MUTED = '#6B7280';
const COMPLETED_BG = '#2A2A2A';
const COMPLETED_DOT = '#22C55E';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < startDow; i++) {
    const d = new Date(year, month, -startDow + i + 1);
    cells.push({ date: d, currentMonth: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push({ date: new Date(year, month, d), currentMonth: true });
  }
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let i = 1; i <= 7 - remainder; i++) {
      cells.push({ date: new Date(year, month + 1, i), currentMonth: false });
    }
  }
  return cells;
}

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function HabitDetailCalendar({ habit }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const completedSet = new Set(habit.completionHistory || []);
  const notes = habit.notes || [];

  const cells = buildCalendar(viewYear, viewMonth);

  const monthNotes = notes.filter((n) => {
    const d = new Date(n.date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const streakText = habit.streak > 0
    ? `${habit.streak} ${habit.streak === 1 ? 'DAY' : 'DAYS'}`
    : '0 DAYS';

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.calendarCard}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} activeOpacity={0.7} style={styles.navBtn}>
            <ChevronLeft size={20} color={ACCENT} />
          </TouchableOpacity>
          <View style={styles.monthTitleBlock}>
            <Text style={styles.monthTitle}>{MONTH_NAMES[viewMonth]}</Text>
            <Text style={styles.yearText}>{viewYear}</Text>
          </View>
          <TouchableOpacity onPress={nextMonth} activeOpacity={0.7} style={styles.navBtn}>
            <ChevronRight size={20} color={ACCENT} />
          </TouchableOpacity>
        </View>

        <View style={styles.dayHeaders}>
          {DAY_LABELS.map((d) => (
            <Text key={d} style={styles.dayHeader}>{d}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((cell, idx) => {
            const dateStr = toDateStr(cell.date);
            const isToday = dateStr === todayStr;
            const isDone = completedSet.has(dateStr);
            const isCurrent = cell.currentMonth;

            return (
              <View key={idx} style={styles.cell}>
                <View style={[
                  styles.cellInner,
                  isDone && styles.cellDone,
                  isToday && !isDone && styles.cellToday,
                ]}>
                  <Text style={[
                    styles.cellText,
                    !isCurrent && styles.cellTextMuted,
                    isDone && styles.cellTextDone,
                    isToday && !isDone && styles.cellTextToday,
                  ]}>
                    {cell.date.getDate()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Link2 size={18} color={ACCENT} />
          <View style={styles.sectionLabelPill}>
            <Text style={styles.sectionLabelText}>Streak</Text>
          </View>
        </View>
        <Text style={styles.streakValue}>{streakText}</Text>
      </View>

      <View style={[styles.section, styles.sectionLast]}>
        <View style={styles.sectionHeader}>
          <MessageSquare size={18} color={ACCENT} />
          <View style={styles.sectionLabelPill}>
            <Text style={styles.sectionLabelText}>Notes</Text>
          </View>
        </View>
        {monthNotes.length === 0 ? (
          <Text style={styles.noNotes}>No notes for this month</Text>
        ) : (
          monthNotes.map((note, i) => (
            <View key={i} style={styles.noteItem}>
              <Text style={styles.noteDate}>{note.date}</Text>
              <Text style={styles.noteText}>{note.text}</Text>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: DARK,
  },
  calendarCard: {
    backgroundColor: CARD,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitleBlock: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_PRIMARY,
  },
  yearText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_MUTED,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  cellInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDone: {
    backgroundColor: COMPLETED_DOT,
  },
  cellToday: {
    borderWidth: 2,
    borderColor: ACCENT,
  },
  cellText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_PRIMARY,
  },
  cellTextMuted: {
    color: TEXT_MUTED,
  },
  cellTextDone: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  cellTextToday: {
    color: ACCENT,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 20,
  },
  sectionLast: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionLabelPill: {
    backgroundColor: '#3A3A3A',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sectionLabelText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_PRIMARY,
  },
  streakValue: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    color: ACCENT,
    textAlign: 'center',
    paddingBottom: 4,
  },
  noNotes: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    paddingVertical: 8,
  },
  noteItem: {
    marginBottom: 12,
    borderLeftWidth: 2,
    borderLeftColor: ACCENT,
    paddingLeft: 12,
  },
  noteDate: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginBottom: 2,
  },
  noteText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
});
