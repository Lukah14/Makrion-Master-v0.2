import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, Flag, Link2, CircleCheck, ChartPie as PieChart } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { computeBestStreak, computeCurrentStreak, isSuccessfulCompletionDay } from '@/lib/habitDayState';
import { isHabitActiveOnDate } from '@/lib/habitSchedule';
import {
  normalizeNumericConditionType,
  anyValueNumericDayCurrent,
  NUMERIC_CONDITION,
} from '@/lib/habitNumericCondition';
import { parseDateKey, toDateKey } from '@/lib/dateKey';

const ACCENT = '#E8526A';
const SUCCESS = '#22C55E';
const FAIL = '#EF4444';

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function habitRangeStartKey(habit) {
  if (habit?.schedule?.startDateKey) return habit.schedule.startDateKey;
  if (habit?.startDate) {
    const d = new Date(habit.startDate);
    if (!Number.isNaN(d.getTime())) return toDateKey(d);
  }
  return null;
}

function habitRangeEndKey(habit, todayKey) {
  if (habit?.schedule?.endDateKey && habit.schedule.endDateKey < todayKey) return habit.schedule.endDateKey;
  return todayKey;
}

/** Iterate each dateKey from start to end inclusive (string compare OK for YYYY-MM-DD). */
function forEachDateKeyInRange(startKey, endKey, fn) {
  if (!startKey || !endKey || startKey > endKey) return;
  const d = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  for (;;) {
    const k = toDateKey(d);
    fn(k);
    if (k >= endKey) break;
    d.setDate(d.getDate() + 1);
    if (d > end) break;
  }
}

function countScheduledSuccessAndFail(habit, rowByDate, todayKey) {
  let start = habitRangeStartKey(habit);
  if (!start) {
    for (const k of rowByDate.keys()) {
      if (!start || k < start) start = k;
    }
    if (!start) start = todayKey;
  }
  const end = habitRangeEndKey(habit, todayKey);
  let success = 0;
  let fail = 0;
  forEachDateKeyInRange(start, end, (key) => {
    if (key > todayKey) return;
    if (!isHabitActiveOnDate(habit, key)) return;
    const row = rowByDate.get(key);
    if (isSuccessfulCompletionDay(habit, row)) {
      success += 1;
      return;
    }
    if (key < todayKey) fail += 1;
  });
  return { success, fail };
}

function getCompletionsInRange(completionHistory, start, end) {
  const set = new Set(completionHistory || []);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (set.has(toDateStr(cur))) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function calcStatsFromHistory(history) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const h = history || [];
  return {
    thisWeek: getCompletionsInRange(h, startOfWeek, today),
    thisMonth: getCompletionsInRange(h, startOfMonth, today),
    thisYear: getCompletionsInRange(h, startOfYear, today),
    all: h.length,
  };
}

function numericBarValue(habit, row) {
  if (!row) return null;
  const cond = normalizeNumericConditionType(habit);
  if (cond === NUMERIC_CONDITION.ANY_VALUE) {
    return anyValueNumericDayCurrent(row);
  }
  const v = row.progressValue != null ? Number(row.progressValue) : null;
  if (v == null || !Number.isFinite(v)) return null;
  return Math.max(0, v);
}

function DonutSuccessFail({ success, fail, emptyTrackColor, valueColor }) {
  const r = 80;
  const sw = 28;
  const nr = r - sw / 2;
  const circ = nr * 2 * Math.PI;
  const total = success + fail;

  if (total === 0) {
    return (
      <View style={{ width: r * 2, height: r * 2, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 8 }}>
        <Svg width={r * 2} height={r * 2}>
          <Circle stroke={emptyTrackColor} fill="none" strokeWidth={sw} cx={r} cy={r} r={nr} />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: valueColor, textAlign: 'center', paddingHorizontal: 12 }}>No scheduled days in range yet</Text>
        </View>
      </View>
    );
  }

  const pct = success / total;

  return (
    <View style={{ width: r * 2, height: r * 2, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 8 }}>
      <Svg width={r * 2} height={r * 2}>
        <Circle
          stroke={SUCCESS}
          fill="none"
          strokeWidth={sw}
          cx={r}
          cy={r}
          r={nr}
          strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
          strokeDashoffset={circ * 0.25}
        />
        {pct < 1 && (
          <Circle
            stroke={FAIL}
            fill="none"
            strokeWidth={sw}
            cx={r}
            cy={r}
            r={nr}
            strokeDasharray={`${circ * (1 - pct)} ${circ * pct}`}
            strokeDashoffset={-(circ * pct - circ * 0.25)}
          />
        )}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontFamily: 'PlusJakartaSans-ExtraBold', color: valueColor }}>{success}</Text>
        <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold', color: valueColor, opacity: 0.75 }}>of {total} days</Text>
      </View>
    </View>
  );
}

export default function HabitDetailStatistics({
  habit,
  completionHistory: historyProp = [],
  completionRows = [],
}) {
  const { colors: Colors } = useTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [chartPeriod, setChartPeriod] = useState('Month');
  const [chartMonth, setChartMonth] = useState(today.getMonth());
  const [chartYear, setChartYear] = useState(today.getFullYear());
  const [timelineMonth, setTimelineMonth] = useState(today.getMonth());
  const [timelineYear, setTimelineYear] = useState(today.getFullYear());

  const rowByDate = useMemo(() => {
    const m = new Map();
    for (const row of completionRows || []) {
      if (row?.dateKey) m.set(row.dateKey, row);
    }
    return m;
  }, [completionRows]);

  const history =
    historyProp.length > 0 ? historyProp : (habit.completionHistory || []);

  const habitType = habit?.type || 'yesno';
  const isYesNo = habitType === 'yesno';
  const isNumeric = habitType === 'numeric';
  const numericCond = normalizeNumericConditionType(habit);
  const showNumericSuccessFail = isNumeric && numericCond !== NUMERIC_CONDITION.ANY_VALUE;
  const showSuccessFailCard = !isNumeric || showNumericSuccessFail;

  const showCheckmarkCard = isYesNo;
  const showValueChart = isNumeric;
  const showTimesCompletedBlock = habitType === 'timer' || habitType === 'checklist';

  const stats = calcStatsFromHistory(history);
  const completedSet = new Set(history);
  const todayStr = toDateStr(today);
  const streakCurrent = computeCurrentStreak(history, todayStr);
  const streakBest = computeBestStreak(history);

  const { success: donutSuccess, fail: donutFail } = useMemo(
    () => countScheduledSuccessAndFail(habit, rowByDate, todayStr),
    [habit, rowByDate, todayStr],
  );

  const startDate = habit.startDate || toDateStr(today);
  const endDate = habit.endDate || null;
  const startDateObj = new Date(startDate);
  const totalDays = endDate
    ? Math.ceil((new Date(endDate) - startDateObj) / 86400000)
    : null;
  const daysCompleted = history.length || 0;

  const habitProgressLabel = totalDays
    ? `${daysCompleted}/${totalDays} DAYS`
    : `${daysCompleted} DAYS`;

  const habitProgressPct = totalDays && totalDays > 0
    ? Math.min(daysCompleted / totalDays, 1)
    : 0;

  const daysInTimelineMonth = new Date(timelineYear, timelineMonth + 1, 0).getDate();
  const timelineDays = [];
  for (let d = 1; d <= daysInTimelineMonth; d += 1) {
    const dt = new Date(timelineYear, timelineMonth, d);
    const ds = toDateStr(dt);
    const row = rowByDate.get(ds);
    const done = isSuccessfulCompletionDay(habit, row);
    timelineDays.push({ day: d, ds, done });
  }

  const prevTimeline = () => {
    if (timelineMonth === 0) {
      setTimelineMonth(11);
      setTimelineYear(timelineYear - 1);
    } else setTimelineMonth(timelineMonth - 1);
  };
  const nextTimeline = () => {
    if (timelineMonth === 11) {
      setTimelineMonth(0);
      setTimelineYear(timelineYear + 1);
    } else setTimelineMonth(timelineMonth + 1);
  };

  const getCompletionBarData = () => {
    if (chartPeriod === 'Year') {
      return MONTH_NAMES_SHORT.map((label, mi) => {
        const start = new Date(chartYear, mi, 1);
        const end = new Date(chartYear, mi + 1, 0);
        return { label, count: getCompletionsInRange(history, start, end) };
      });
    }
    if (chartPeriod === 'Week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days.map((label, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return { label, count: completedSet.has(toDateStr(d)) ? 1 : 0 };
      });
    }
    const dim = new Date(chartYear, chartMonth + 1, 0).getDate();
    return Array.from({ length: dim }, (_, i) => {
      const d = new Date(chartYear, chartMonth, i + 1);
      return { label: String(i + 1), count: completedSet.has(toDateStr(d)) ? 1 : 0 };
    });
  };

  const getNumericBarData = () => {
    if (chartPeriod === 'Year') {
      return MONTH_NAMES_SHORT.map((label, mi) => {
        const dim = new Date(chartYear, mi + 1, 0).getDate();
        let sum = 0;
        for (let day = 1; day <= dim; day += 1) {
          const d = new Date(chartYear, mi, day);
          const ds = toDateStr(d);
          const v = numericBarValue(habit, rowByDate.get(ds));
          if (v != null) sum += v;
        }
        return { label, count: sum, isNumeric: true };
      });
    }
    if (chartPeriod === 'Week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days.map((label, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const ds = toDateStr(d);
        const v = numericBarValue(habit, rowByDate.get(ds));
        return { label, count: v != null ? v : 0, isNumeric: true };
      });
    }
    const dim = new Date(chartYear, chartMonth + 1, 0).getDate();
    return Array.from({ length: dim }, (_, i) => {
      const d = new Date(chartYear, chartMonth, i + 1);
      const ds = toDateStr(d);
      const v = numericBarValue(habit, rowByDate.get(ds));
      return { label: String(i + 1), count: v != null ? v : 0, isNumeric: true };
    });
  };

  const barData = showValueChart ? getNumericBarData() : getCompletionBarData();
  const maxBar = Math.max(...barData.map((b) => b.count), 1);

  const numericPeriodSummary = showValueChart
    ? {
        sum: barData.reduce((acc, b) => acc + b.count, 0),
        avg: barData.length ? barData.reduce((acc, b) => acc + b.count, 0) / barData.length : 0,
        unit: habit.unit ? String(habit.unit) : '',
      }
    : null;

  const prevChart = () => {
    if (chartPeriod === 'Year') setChartYear(chartYear - 1);
    else if (chartPeriod === 'Month') {
      if (chartMonth === 0) {
        setChartMonth(11);
        setChartYear(chartYear - 1);
      } else setChartMonth(chartMonth - 1);
    }
  };
  const nextChart = () => {
    if (chartPeriod === 'Year') setChartYear(chartYear + 1);
    else if (chartPeriod === 'Month') {
      if (chartMonth === 11) {
        setChartMonth(0);
        setChartYear(chartYear + 1);
      } else setChartMonth(chartMonth + 1);
    }
  };

  const chartTitle = chartPeriod === 'Year'
    ? String(chartYear)
    : chartPeriod === 'Week'
      ? 'This Week'
      : `${MONTH_NAMES[chartMonth]} ${chartYear}`;

  const chartSubtitle = showValueChart ? 'Logged values' : 'Times completed';

  const trackColor = Colors.innerBorder;
  const chartText = Colors.textPrimary;

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      {totalDays && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Flag size={18} color={ACCENT} />
            <View style={styles.pill}><Text style={styles.pillText}>Habit progress</Text></View>
          </View>
          <Text style={styles.progressFraction}>{habitProgressLabel}</Text>
          <View style={styles.progressBarOuter}>
            <View style={[styles.progressBarFill, { width: `${habitProgressPct * 100}%` }]} />
          </View>
          <View style={styles.progressDates}>
            <Text style={styles.progressDateText}>Start{'\n'}{startDate}</Text>
            <Text style={[styles.progressDateText, { textAlign: 'right' }]}>End{'\n'}{endDate}</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Link2 size={18} color={ACCENT} />
          <View style={styles.pill}><Text style={styles.pillText}>Streak</Text></View>
        </View>
        <View style={styles.streakRow}>
          <View style={styles.streakCol}>
            <Text style={styles.streakLabel}>Current</Text>
            <Text style={styles.streakValue}>{streakCurrent} {streakCurrent === 1 ? 'DAY' : 'DAYS'}</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakCol}>
            <Text style={styles.streakLabel}>Best</Text>
            <Text style={styles.streakValue}>{streakBest} {streakBest === 1 ? 'DAY' : 'DAYS'}</Text>
          </View>
        </View>
      </View>

      {showTimesCompletedBlock && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CircleCheck size={18} color={ACCENT} />
            <View style={styles.pill}><Text style={styles.pillText}>Times completed</Text></View>
          </View>
          {[
            { label: 'This week', value: stats.thisWeek },
            { label: 'This month', value: stats.thisMonth },
            { label: 'This year', value: stats.thisYear },
            { label: 'All', value: stats.all },
          ].map((row, i) => (
            <View key={row.label} style={[styles.statRow, i < 3 && styles.statRowBorder]}>
              <Text style={styles.statLabel}>{row.label}</Text>
              <Text style={styles.statValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      )}

      {showCheckmarkCard && (
        <View style={styles.section}>
          <View style={styles.timelineNav}>
            <TouchableOpacity onPress={prevTimeline} style={styles.navBtn}><ChevronLeft size={18} color={ACCENT} /></TouchableOpacity>
            <Text style={styles.chartTitle}>
              Completion
              {'\n'}
              <Text style={styles.timelineMonthSubtitle}>{MONTH_NAMES[timelineMonth]} {timelineYear}</Text>
            </Text>
            <TouchableOpacity onPress={nextTimeline} style={styles.navBtn}><ChevronRight size={18} color={ACCENT} /></TouchableOpacity>
          </View>
          <Text style={styles.checkmarkHint}>Checkmarks show days you marked done.</Text>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timelineScrollContent}
          >
            {timelineDays.map((td) => (
              <View key={td.ds} style={styles.timelineCell}>
                <View style={styles.timelineCheckSlot}>
                  {td.done ? (
                    <CircleCheck size={20} color={SUCCESS} strokeWidth={2.5} />
                  ) : (
                    <View style={styles.timelineCheckEmpty} />
                  )}
                </View>
                <View style={[styles.timelineDot, td.done && styles.timelineDotDone]} />
                <Text style={[styles.timelineDayNum, td.done && styles.timelineDayNumDone]}>{td.day}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {(showValueChart || showTimesCompletedBlock) && (
        <View style={styles.section}>
          <View style={styles.timelineNav}>
            <TouchableOpacity onPress={prevChart} style={styles.navBtn}><ChevronLeft size={18} color={ACCENT} /></TouchableOpacity>
            <Text style={styles.chartTitle}>{chartTitle}{'\n'}{chartSubtitle}</Text>
            <TouchableOpacity onPress={nextChart} style={styles.navBtn}><ChevronRight size={18} color={ACCENT} /></TouchableOpacity>
          </View>
          {showValueChart && numericPeriodSummary && (
            <View style={styles.valueSummaryRow}>
              <Text style={styles.valueSummaryText}>
                Total: <Text style={styles.valueSummaryStrong}>{numericPeriodSummary.sum}</Text>
                {numericPeriodSummary.unit ? ` ${numericPeriodSummary.unit}` : ''}
              </Text>
              <Text style={styles.valueSummaryText}>
                Avg / day: <Text style={styles.valueSummaryStrong}>{numericPeriodSummary.avg.toFixed(1)}</Text>
              </Text>
            </View>
          )}
          <View style={styles.barChart}>
            {barData.map((b, i) => (
              <View key={i} style={styles.barCol}>
                {showValueChart ? (
                  <Text style={styles.barCount} numberOfLines={1}>
                    {!Number.isInteger(b.count) ? b.count.toFixed(1) : String(b.count)}
                  </Text>
                ) : b.count > 0 ? (
                  <Text style={styles.barCount} numberOfLines={1}>{b.count}</Text>
                ) : null}
                <View style={styles.barOuter}>
                  <View style={[styles.barFill, { height: `${(b.count / maxBar) * 100}%` }]} />
                </View>
                {(barData.length <= 12) && (
                  <Text style={styles.barLabel} numberOfLines={1}>{b.label}</Text>
                )}
              </View>
            ))}
          </View>
          <View style={styles.periodToggle}>
            {['Week', 'Month', 'Year'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, chartPeriod === p && styles.periodBtnActive]}
                onPress={() => setChartPeriod(p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.periodBtnText, chartPeriod === p && styles.periodBtnTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {showSuccessFailCard && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PieChart size={18} color={ACCENT} />
            <View style={styles.pill}><Text style={styles.pillText}>Success / Fail</Text></View>
          </View>
          <DonutSuccessFail
            success={donutSuccess}
            fail={donutFail}
            emptyTrackColor={trackColor}
            valueColor={chartText}
          />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: SUCCESS }]} />
              <Text style={styles.legendText}>Done</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: FAIL }]} />
              <Text style={styles.legendText}>Missed / fail</Text>
            </View>
          </View>
        </View>
      )}

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
    section: {
      backgroundColor: Colors.cardBackground,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 16,
      padding: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Colors.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 4,
    },
    pill: {
      backgroundColor: Colors.innerCard,
      paddingHorizontal: 14,
      paddingVertical: 4,
      borderRadius: 20,
    },
    pillText: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textPrimary,
    },
    progressFraction: {
      fontSize: 20,
      fontFamily: 'PlusJakartaSans-ExtraBold',
      color: ACCENT,
      textAlign: 'center',
      marginVertical: 10,
    },
    progressBarOuter: {
      height: 6,
      backgroundColor: Colors.innerBorder,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: ACCENT,
      borderRadius: 3,
    },
    progressDates: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    progressDateText: {
      fontSize: 11,
      color: Colors.textTertiary,
      lineHeight: 16,
    },
    streakRow: {
      flexDirection: 'row',
      marginTop: 12,
    },
    streakCol: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    streakDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: Colors.innerBorder,
      marginVertical: 4,
    },
    streakLabel: {
      fontSize: 13,
      color: Colors.textSecondary,
    },
    streakValue: {
      fontSize: 18,
      fontFamily: 'PlusJakartaSans-ExtraBold',
      color: ACCENT,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    statRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors.border,
    },
    statLabel: {
      fontSize: 15,
      color: Colors.textPrimary,
    },
    statValue: {
      fontSize: 15,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    timelineNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    navBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chartTitle: {
      fontSize: 16,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
      textAlign: 'center',
    },
    timelineMonthSubtitle: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textSecondary,
    },
    checkmarkHint: {
      fontSize: 12,
      color: Colors.textTertiary,
      marginBottom: 12,
    },
    timelineScrollContent: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingBottom: 4,
      gap: 10,
      paddingRight: 8,
    },
    timelineCell: {
      width: 36,
      alignItems: 'center',
      gap: 6,
    },
    timelineCheckSlot: {
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timelineCheckEmpty: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: Colors.innerBorder,
    },
    timelineDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.innerBorder,
    },
    timelineDotDone: {
      backgroundColor: SUCCESS,
    },
    timelineDayNum: {
      fontSize: 11,
      color: Colors.textTertiary,
    },
    timelineDayNumDone: {
      color: Colors.textPrimary,
      fontFamily: 'PlusJakartaSans-SemiBold',
    },
    barChart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: 120,
      gap: 3,
      marginBottom: 12,
    },
    barCol: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 2,
    },
    barCount: {
      fontSize: 9,
      color: Colors.textSecondary,
    },
    barOuter: {
      width: '100%',
      height: 80,
      justifyContent: 'flex-end',
    },
    barFill: {
      width: '100%',
      backgroundColor: ACCENT,
      borderRadius: 3,
      minHeight: 2,
    },
    barLabel: {
      fontSize: 8,
      color: Colors.textTertiary,
      textAlign: 'center',
    },
    periodToggle: {
      flexDirection: 'row',
      backgroundColor: Colors.innerCard,
      borderRadius: 12,
      padding: 3,
      gap: 3,
    },
    periodBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: 'center',
    },
    periodBtnActive: {
      backgroundColor: Colors.primaryLight,
    },
    periodBtnText: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textSecondary,
    },
    periodBtnTextActive: {
      color: ACCENT,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      marginTop: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: 13,
      color: Colors.textSecondary,
    },
    valueSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
      gap: 12,
    },
    valueSummaryText: {
      fontSize: 13,
      color: Colors.textSecondary,
      flex: 1,
    },
    valueSummaryStrong: {
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
  });
}
