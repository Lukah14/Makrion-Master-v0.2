import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, Trophy, Flag, Link2, CircleCheck, ChartPie as PieChart } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { computeBestStreak, computeCurrentStreak } from '@/lib/habitDayState';

const ACCENT = '#E8526A';
const SUCCESS = '#22C55E';

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getCompletionsInRange(completionHistory, start, end) {
  const set = new Set(completionHistory || []);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (set.has(toDateStr(cur))) count++;
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

function calcHabitScoreFromHistory(habit, history) {
  const h = history || [];
  if (h.length === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = habit.startDate ? new Date(habit.startDate) : new Date(today.getTime() - 30 * 86400000);
  const diff = Math.max(1, Math.ceil((today - startDate) / 86400000));
  const rate = Math.min(h.length / diff, 1);
  return Math.round(rate * 100);
}

function ScoreRing({ score, trackColor, valueColor }) {
  const r = 68;
  const sw = 12;
  const nr = r - sw / 2;
  const circ = nr * 2 * Math.PI;
  const offset = circ * (1 - score / 100);
  return (
    <View style={{ width: r * 2, height: r * 2, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 12 }}>
      <Svg width={r * 2} height={r * 2}>
        <Circle stroke={trackColor} fill="none" strokeWidth={sw} cx={r} cy={r} r={nr} />
        <Circle
          stroke={ACCENT}
          fill="none"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          cx={r}
          cy={r}
          r={nr}
          transform={`rotate(-90, ${r}, ${r})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 32, fontFamily: 'PlusJakartaSans-ExtraBold', color: valueColor }}>{score}</Text>
      </View>
    </View>
  );
}

function DonutChart({ done, total, emptyTrackColor, valueColor }) {
  const r = 80;
  const sw = 28;
  const nr = r - sw / 2;
  const circ = nr * 2 * Math.PI;
  const pct = total > 0 ? done / total : 1;
  return (
    <View style={{ width: r * 2, height: r * 2, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 8 }}>
      <Svg width={r * 2} height={r * 2}>
        <Circle stroke={SUCCESS} fill="none" strokeWidth={sw} cx={r} cy={r} r={nr} strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`} strokeDashoffset={circ * 0.25} />
        {total > 0 && pct < 1 && (
          <Circle stroke={emptyTrackColor} fill="none" strokeWidth={sw} cx={r} cy={r} r={nr} strokeDasharray={`${circ * (1 - pct)} ${circ * pct}`} strokeDashoffset={-(circ * pct - circ * 0.25)} />
        )}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 24, fontFamily: 'PlusJakartaSans-ExtraBold', color: valueColor }}>{done}</Text>
      </View>
    </View>
  );
}

export default function HabitDetailStatistics({ habit, completionHistory: historyProp = [] }) {
  const { colors: Colors } = useTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [chartPeriod, setChartPeriod] = useState('Month');
  const [chartMonth, setChartMonth] = useState(today.getMonth());
  const [chartYear, setChartYear] = useState(today.getFullYear());
  const [timelineMonth, setTimelineMonth] = useState(today.getMonth());
  const [timelineYear, setTimelineYear] = useState(today.getFullYear());

  const history =
    historyProp.length > 0 ? historyProp : (habit.completionHistory || []);

  const score = calcHabitScoreFromHistory(habit, history);
  const stats = calcStatsFromHistory(history);
  const completedSet = new Set(history);
  const todayStr = toDateStr(today);
  const streakCurrent = computeCurrentStreak(history, todayStr);
  const streakBest = computeBestStreak(history);

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

  const timelineDays = [];
  const tlLast = new Date(timelineYear, timelineMonth + 1, 0);
  for (let d = 1; d <= Math.min(14, tlLast.getDate()); d++) {
    const dt = new Date(timelineYear, timelineMonth, d);
    const ds = toDateStr(dt);
    timelineDays.push({ day: d, ds, done: completedSet.has(ds) });
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

  const getBarData = () => {
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
    const daysInMonth = new Date(chartYear, chartMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(chartYear, chartMonth, i + 1);
      return { label: String(i + 1), count: completedSet.has(toDateStr(d)) ? 1 : 0 };
    });
  };

  const barData = getBarData();
  const maxBar = Math.max(...barData.map((b) => b.count), 1);

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

  const trackColor = Colors.innerBorder;
  const chartText = Colors.textPrimary;

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Trophy size={18} color={ACCENT} />
          <View style={styles.pill}><Text style={styles.pillText}>Habit score</Text></View>
        </View>
        <ScoreRing score={score} trackColor={trackColor} valueColor={chartText} />
      </View>

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
          <View key={i} style={[styles.statRow, i < 3 && styles.statRowBorder]}>
            <Text style={styles.statLabel}>{row.label}</Text>
            <Text style={styles.statValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.timelineNav}>
          <TouchableOpacity onPress={prevTimeline} style={styles.navBtn}><ChevronLeft size={18} color={ACCENT} /></TouchableOpacity>
          <Text style={styles.chartTitle}>{MONTH_NAMES[timelineMonth]}{'\n'}{timelineYear}</Text>
          <TouchableOpacity onPress={nextTimeline} style={styles.navBtn}><ChevronRight size={18} color={ACCENT} /></TouchableOpacity>
        </View>
        <View style={styles.timeline}>
          <View style={styles.timelineLine} />
          {timelineDays.map((td) => (
            <View key={td.day} style={styles.timelineItem}>
              {td.done && (
                <View style={styles.timelineCheckBadge}>
                  <Text style={{ fontSize: 12 }}>✅</Text>
                </View>
              )}
              {!td.done && <View style={{ height: 24 }} />}
              <View style={[styles.timelineDot, td.done && styles.timelineDotDone]} />
              <Text style={[styles.timelineDayNum, td.done && styles.timelineDayNumDone]}>{td.day}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.timelineNav}>
          <TouchableOpacity onPress={prevChart} style={styles.navBtn}><ChevronLeft size={18} color={ACCENT} /></TouchableOpacity>
          <Text style={styles.chartTitle}>{chartTitle}{'\n'}Times completed</Text>
          <TouchableOpacity onPress={nextChart} style={styles.navBtn}><ChevronRight size={18} color={ACCENT} /></TouchableOpacity>
        </View>
        <View style={styles.barChart}>
          {barData.map((b, i) => (
            <View key={i} style={styles.barCol}>
              {b.count > 0 && <Text style={styles.barCount}>{b.count}</Text>}
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

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <PieChart size={18} color={ACCENT} />
          <View style={styles.pill}><Text style={styles.pillText}>Success / Fail</Text></View>
        </View>
        <DonutChart done={stats.all} total={Math.max(stats.all, 1)} emptyTrackColor={trackColor} valueColor={chartText} />
        <View style={styles.legendRow}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>Done</Text>
        </View>
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
      marginBottom: 16,
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
    timeline: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
      paddingBottom: 8,
      position: 'relative',
    },
    timelineLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 22,
      height: 1,
      backgroundColor: Colors.innerBorder,
    },
    timelineItem: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    timelineCheckBadge: {
      marginBottom: 2,
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
      fontSize: 10,
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
      gap: 6,
      marginTop: 4,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: SUCCESS,
    },
    legendText: {
      fontSize: 13,
      color: Colors.textSecondary,
    },
  });
}
