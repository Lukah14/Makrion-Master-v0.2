import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Link2 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import MonthlyCalendar from '@/components/calendar/MonthlyCalendar';
import { getMonthDateKeyRange } from '@/lib/calendarUtils';
import { toDateKey } from '@/lib/dateKey';
import { computeCurrentStreak, isSuccessfulCompletionDay } from '@/lib/habitDayState';
import {
  normalizeNumericConditionType,
  anyValueNumericDayHasEntry,
  anyValueNumericDayCurrent,
  NUMERIC_CONDITION,
} from '@/lib/habitNumericCondition';

const ACCENT = '#E8526A';
const GREEN = '#2F9D5C';
const AMBER = '#D97706';

function formatDayLogSummary(habit, row) {
  if (!row) return 'No log saved for this day.';
  if (habit.type === 'numeric' && normalizeNumericConditionType(habit) === NUMERIC_CONDITION.ANY_VALUE) {
    const u = habit.unit ? ` ${habit.unit}` : '';
    if (!anyValueNumericDayHasEntry(row)) {
      return 'No value logged for this day.';
    }
    const v = anyValueNumericDayCurrent(row);
    const legacy =
      (row.progressValue === undefined || row.progressValue === null) &&
      (row.isCompleted === true || row.completed === true);
    return legacy
      ? `Value: ${v}${u} (legacy estimate)`
      : `Value: ${v}${u}`;
  }
  const ok = isSuccessfulCompletionDay(habit, row);
  const parts = [];
  parts.push(ok ? 'Goal met' : 'Logged (goal not met)');
  if (
    row.progressValue !== undefined &&
    row.progressValue !== null &&
    habit.type === 'numeric'
  ) {
    const ct = normalizeNumericConditionType(habit);
    const tgt = habit.target ?? habit.targetValue ?? habit.evaluation?.targetValue;
    const u = habit.unit ? ` ${habit.unit}` : '';
    if (ct === NUMERIC_CONDITION.ANY_VALUE || tgt == null || !Number.isFinite(Number(tgt))) {
      parts.push(`Progress: ${row.progressValue}${u}`);
    } else {
      parts.push(`Progress: ${row.progressValue} / ${tgt}${u}`);
    }
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
    const isAnyNumeric =
      habit.type === 'numeric' && normalizeNumericConditionType(habit) === NUMERIC_CONDITION.ANY_VALUE;
    keys.forEach((k) => {
      const row = rowsByDate.get(k);
      let completionRing;
      if (row) {
        completionRing = isSuccessfulCompletionDay(habit, row) ? 'full' : 'partial';
      }
      let valueBadge;
      if (isAnyNumeric && row && anyValueNumericDayHasEntry(row)) {
        valueBadge = String(anyValueNumericDayCurrent(row));
      }
      meta[k] = {
        hasTrackedData: completed.has(k) || !!row,
        completionRing,
        valueBadge,
        hasMoment: false,
      };
    });
    return meta;
  }, [viewYear, viewMonth, completionHistory, rowsByDate, habit]);

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

      <View style={[styles.section, styles.sectionLast]}>
        <View style={styles.sectionHeader}>
          <Link2 size={18} color={ACCENT} />
          <View style={styles.sectionLabelPill}>
            <Text style={styles.sectionLabelText}>Streak</Text>
          </View>
        </View>
        <Text style={styles.streakValue}>{streakText}</Text>
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
      marginBottom: 16,
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
  });
}
