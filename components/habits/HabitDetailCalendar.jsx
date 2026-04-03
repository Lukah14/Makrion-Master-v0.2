import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Link2, MessageSquare } from 'lucide-react-native';
import MonthlyCalendar from '@/components/calendar/MonthlyCalendar';
import { getMonthDateKeyRange } from '@/lib/calendarUtils';
import { toDateKey } from '@/lib/dateKey';

const DARK = '#1A1A1A';
const CARD = '#2A2A2A';
const ACCENT = '#E8526A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = '#6B7280';

function noteDateKey(n) {
  if (!n?.date) return null;
  if (typeof n.date === 'string') {
    const s = n.date.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }
  const d = new Date(n.date);
  if (Number.isNaN(d.getTime())) return null;
  return toDateKey(d);
}

export default function HabitDetailCalendar({ habit }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateKey(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const completionHistory = habit.completionHistory || [];
  const notes = habit.notes || [];

  const monthMeta = useMemo(() => {
    const completed = new Set(completionHistory);
    const { keys } = getMonthDateKeyRange(viewYear, viewMonth);
    const meta = {};
    keys.forEach((k) => {
      meta[k] = {
        hasTrackedData: completed.has(k),
        hasMoment: notes.some((n) => noteDateKey(n) === k),
      };
    });
    return meta;
  }, [viewYear, viewMonth, completionHistory, notes]);

  const monthNotes = notes.filter((n) => {
    const k = noteDateKey(n);
    if (!k) return false;
    const [y, m] = k.split('-').map(Number);
    return y === viewYear && m - 1 === viewMonth;
  });

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const streakText =
    habit.streak > 0 ? `${habit.streak} ${habit.streak === 1 ? 'DAY' : 'DAYS'}` : '0 DAYS';

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.calendarCard}>
        <MonthlyCalendar
          year={viewYear}
          monthIndex={viewMonth}
          selectedDateKey={todayStr}
          monthMeta={monthMeta}
          loading={false}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          onTitlePress={undefined}
          variant="dark"
        />
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
    paddingVertical: 12,
    paddingHorizontal: 8,
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
