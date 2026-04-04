import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Link2, MessageSquare } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import MonthlyCalendar from '@/components/calendar/MonthlyCalendar';
import { getMonthDateKeyRange } from '@/lib/calendarUtils';
import { toDateKey } from '@/lib/dateKey';
import { computeCurrentStreak, isSuccessfulCompletionDay } from '@/lib/habitDayState';

const ACCENT = '#E8526A';
const GREEN = '#2F9D5C';
const AMBER = '#D97706';

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

function formatDayLogSummary(habit, row) {
  if (!row) return 'No log saved for this day.';
  const ok = isSuccessfulCompletionDay(habit, row);
  const parts = [];
  parts.push(ok ? 'Goal met' : 'Logged (goal not met)');
  if (row.progressValue != null && habit.type === 'numeric') {
    parts.push(`Progress: ${row.progressValue} / ${habit.target ?? '—'}`);
  }
  if (habit.type === 'timer' && row.progressValue != null) {
    const sec = Number(row.progressValue);
    parts.push(`Elapsed: ${Math.floor(sec / 60)}m ${sec % 60}s`);
  }
  if (Array.isArray(row.checklistState) && row.checklistState.length) {
    const done = row.checklistState.filter((x) => x.completed).length;
    parts.push(`Checklist: ${done}/${row.checklistState.length}`);
  }
  if (row.completionPercent != null) parts.push(`${row.completionPercent}%`);
  if (row.trackingStatus) parts.push(`Status: ${row.trackingStatus}`);
  return parts.join(' · ');
}

export default function HabitDetailCalendar({
  habit,
  completionHistory: historyProp = [],
  completionRows = [],
}) {
  const { colors: Colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateKey(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDayKey, setSelectedDayKey] = useState(null);

  const completionHistory = useMemo(
    () => (historyProp.length > 0 ? historyProp : (habit.completionHistory || [])),
    [historyProp, habit.completionHistory],
  );
  const notes = useMemo(() => habit.notes || [], [habit.notes]);

  const rowsByDate = useMemo(() => {
    const m = new Map();
    for (const row of completionRows || []) {
      if (row?.dateKey) m.set(row.dateKey, row);
    }
    return m;
  }, [completionRows]);

  const monthMeta = useMemo(() => {
    const completed = new Set(completionHistory);
    const { keys } = getMonthDateKeyRange(viewYear, viewMonth);
    const meta = {};
    keys.forEach((k) => {
      const row = rowsByDate.get(k);
      let completionRing;
      if (row) {
        completionRing = isSuccessfulCompletionDay(habit, row) ? 'full' : 'partial';
      }
      meta[k] = {
        hasTrackedData: completed.has(k) || !!row,
        completionRing,
        hasMoment: notes.some((n) => noteDateKey(n) === k),
      };
    });
    return meta;
  }, [viewYear, viewMonth, completionHistory, notes, rowsByDate, habit]);

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

  const streakVal = computeCurrentStreak(completionHistory, todayStr);
  const streakText = streakVal > 0 ? `${streakVal} ${streakVal === 1 ? 'DAY' : 'DAYS'}` : '0 DAYS';

  const focusKey = selectedDayKey ?? todayStr;
  const rowForSelected = rowsByDate.get(focusKey);

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.calendarCard}>
        <MonthlyCalendar
          year={viewYear}
          monthIndex={viewMonth}
          selectedDateKey={focusKey}
          monthMeta={monthMeta}
          loading={false}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          onTitlePress={undefined}
          onSelectDay={(dk) => setSelectedDayKey(dk)}
          variant={isDark ? 'dark' : 'light'}
        />
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { borderColor: GREEN }]} />
            <Text style={styles.legendText}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { borderColor: AMBER }]} />
            <Text style={styles.legendText}>Logged</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Link2 size={18} color={ACCENT} />
          <View style={styles.sectionLabelPill}>
            <Text style={styles.sectionLabelText}>Day log</Text>
          </View>
        </View>
        <Text style={styles.dayLogDate}>{focusKey}</Text>
        <Text style={styles.dayLogBody}>{formatDayLogSummary(habit, rowForSelected)}</Text>
        {selectedDayKey ? (
          <TouchableOpacity style={styles.clearPick} onPress={() => setSelectedDayKey(null)} hitSlop={8}>
            <Text style={styles.clearPickText}>Show today</Text>
          </TouchableOpacity>
        ) : null}
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

function createStyles(Colors) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    calendarCard: {
      backgroundColor: Colors.cardBackground,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Colors.border,
    },
    legendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 24,
      marginTop: 10,
      paddingBottom: 4,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      backgroundColor: 'transparent',
    },
    legendText: {
      fontSize: 12,
      fontFamily: 'PlusJakartaSans-Medium',
      color: Colors.textSecondary,
    },
    section: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: Colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Colors.border,
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
      backgroundColor: Colors.innerCard,
      paddingHorizontal: 14,
      paddingVertical: 4,
      borderRadius: 20,
    },
    sectionLabelText: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textPrimary,
    },
    dayLogDate: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-Bold',
      color: ACCENT,
      marginBottom: 8,
    },
    dayLogBody: {
      fontSize: 14,
      lineHeight: 20,
      color: Colors.textPrimary,
      fontFamily: 'PlusJakartaSans-Medium',
    },
    clearPick: {
      alignSelf: 'flex-start',
      marginTop: 12,
    },
    clearPickText: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: ACCENT,
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
      color: Colors.textSecondary,
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
      color: Colors.textTertiary,
      marginBottom: 2,
    },
    noteText: {
      fontSize: 14,
      color: Colors.textPrimary,
    },
  });
}
