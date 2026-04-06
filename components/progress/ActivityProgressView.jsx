import React, { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import { TrendingUp } from 'lucide-react-native';
import ProgressPeriodSelector from '@/components/progress/ProgressPeriodSelector';
import {
  getProgressPeriodRange,
  countCalendarDaysInStatsRange,
} from '@/lib/progressPeriods';
import {
  computeCurrentStreakActiveDays,
  computeBestStreakFromSortedActiveDays,
} from '@/lib/progressStreaks';
import { todayDateKey, dateKeyRange, addDaysToDateKey } from '@/lib/dateKey';
import { listActivityEntriesInRange } from '@/services/activityService';
import { listStepEntriesInRange } from '@/services/stepEntryService';

const screenW = Dimensions.get('window').width - Layout.screenPadding * 2;

function aggregateByDate(rows) {
  /** @type {Map<string, { count: number, minutes: number, kcal: number }>} */
  const map = new Map();
  for (const r of rows || []) {
    const dk = r.date;
    if (!dk || typeof dk !== 'string') continue;
    const cur = map.get(dk) || { count: 0, minutes: 0, kcal: 0 };
    cur.count += 1;
    cur.minutes += Number(r.durationMinutes) || 0;
    cur.kcal += Number(r.caloriesBurned) || 0;
    map.set(dk, cur);
  }
  return map;
}

function MinutesBarChart({ points, divider, tertiary, barColor }) {
  const chartWidth = Math.min(screenW - 32, screenW);
  const chartHeight = 160;
  const padBottom = 22;
  const padLeft = 36;
  const padTop = 6;
  const innerW = chartWidth - padLeft - 6;
  const innerH = chartHeight - padBottom - padTop;
  if (!points.length) {
    return (
      <Svg width={chartWidth} height={chartHeight}>
        <SvgText
          x={chartWidth / 2}
          y={chartHeight / 2}
          fontSize={12}
          fill={tertiary}
          textAnchor="middle"
        >
          No data in this range
        </SvgText>
      </Svg>
    );
  }

  const maxM = Math.max(...points.map((p) => p.minutes), 30);
  const barW = Math.max(4, innerW / points.length - 4);
  const gridVals = [0, Math.round(maxM / 2), maxM];

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {gridVals.map((v, i) => {
        const y = padTop + innerH - (v / maxM) * innerH;
        return (
          <Line
            key={i}
            x1={padLeft}
            y1={y}
            x2={chartWidth - 4}
            y2={y}
            stroke={divider}
            strokeWidth={1}
            strokeDasharray="3,4"
          />
        );
      })}
      {gridVals.map((v, i) => {
        const y = padTop + innerH - (v / maxM) * innerH;
        return (
          <SvgText
            key={`t${i}`}
            x={padLeft - 4}
            y={y + 3}
            fontSize={8}
            fill={tertiary}
            textAnchor="end"
          >
            {v}
          </SvgText>
        );
      })}
      {points.map((p, i) => {
        const x = padLeft + i * (barW + 4) + 2;
        const h = (p.minutes / maxM) * innerH;
        const base = padTop + innerH;
        return (
          <G key={p.key}>
            {p.minutes > 0 ? (
              <Rect x={x} y={base - h} width={barW} height={h} rx={3} fill={barColor} />
            ) : null}
            <SvgText
              x={x + barW / 2}
              y={chartHeight - 4}
              fontSize={8}
              fill={tertiary}
              textAnchor="middle"
            >
              {p.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export default function ActivityProgressView({ uid }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [periodId, setPeriodId] = useState('this_week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [stepRows, setStepRows] = useState([]);

  useFocusEffect(
    useCallback(() => {
      if (!uid) {
        setRows([]);
        setStepRows([]);
        setLoading(false);
        return undefined;
      }
      let cancelled = false;
      (async () => {
        setLoading(true);
        setError(null);
        try {
          const today = todayDateKey();
          const start = addDaysToDateKey(today, -1095);
          const [list, steps] = await Promise.all([
            listActivityEntriesInRange(uid, start, today),
            listStepEntriesInRange(uid, start, today),
          ]);
          if (!cancelled) {
            setRows(list);
            setStepRows(steps);
          }
        } catch (e) {
          if (!cancelled) {
            setError(e?.message || 'Could not load activities');
            setRows([]);
            setStepRows([]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [uid]),
  );

  const today = todayDateKey();

  const derived = useMemo(() => {
    const byDate = aggregateByDate(rows);
    const stepByDate = new Map((stepRows || []).map((s) => [s.dateKey, s.steps]));

    const workoutActive = [...byDate.keys()].filter((k) => (byDate.get(k)?.count ?? 0) > 0);
    const stepActive = (stepRows || []).filter((s) => s.steps > 0).map((s) => s.dateKey);
    const mergedActiveSet = new Set([...workoutActive, ...stepActive]);
    const activeDays = [...mergedActiveSet].sort((a, b) => a.localeCompare(b));
    const currentStreak = computeCurrentStreakActiveDays(mergedActiveSet, today);
    const bestStreak = computeBestStreakFromSortedActiveDays(activeDays);

    const range = getProgressPeriodRange(periodId, today);
    const statsDays = countCalendarDaysInStatsRange(range.start, range.statsEnd);
    let totalEntries = 0;
    let sumMin = 0;
    let sumKcal = 0;
    let sumSteps = 0;
    for (const k of dateKeyRange(range.start, range.statsEnd)) {
      const a = byDate.get(k);
      if (a) {
        totalEntries += a.count;
        sumMin += a.minutes;
        sumKcal += a.kcal;
      }
      sumSteps += stepByDate.get(k) ?? 0;
    }
    const avgActivities = statsDays > 0 ? Math.round((totalEntries / statsDays) * 10) / 10 : 0;
    const avgMinutes = statsDays > 0 ? Math.round(sumMin / statsDays) : 0;
    const avgBurned = statsDays > 0 ? Math.round(sumKcal / statsDays) : 0;
    const avgSteps = statsDays > 0 ? Math.round(sumSteps / statsDays) : 0;

    const chartKeys = dateKeyRange(range.start, range.end);
    let chartPoints = chartKeys.map((k) => ({
      key: k,
      label: k.slice(8),
      minutes: byDate.get(k)?.minutes ?? 0,
    }));
    const MAX_BARS = 42;
    if (chartPoints.length > MAX_BARS) {
      const bucketSize = Math.ceil(chartPoints.length / MAX_BARS);
      const next = [];
      for (let i = 0; i < chartPoints.length; i += bucketSize) {
        const slice = chartPoints.slice(i, i + bucketSize);
        next.push({
          key: slice[0].key,
          label: slice[0].label,
          minutes: slice.reduce((s, x) => s + x.minutes, 0),
        });
      }
      chartPoints = next;
    }

    const hasWorkouts = rows.length > 0;
    const hasSteps = (stepRows || []).some((s) => s.steps > 0);

    return {
      currentStreak,
      bestStreak,
      avgActivities,
      avgMinutes,
      avgBurned,
      avgSteps,
      chartPoints,
      hasAny: hasWorkouts || hasSteps,
      periodLabel: range.label,
    };
  }, [rows, stepRows, periodId, today]);

  if (!uid) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Sign in to track activity"
        message="Activity progress uses your workout logs and step entries."
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.muted}>Loading activity…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error}</Text>
      </View>
    );
  }

  if (!derived.hasAny) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No activity yet"
        message="Log workouts or daily steps in Activity to see streaks and averages."
      />
    );
  }

  return (
    <View>
      <Text style={styles.periodHeading}>Period</Text>
      <ProgressPeriodSelector value={periodId} onChange={setPeriodId} />

      <View style={styles.statRow}>
        <Card style={styles.mini}>
          <Text style={styles.miniVal}>{derived.currentStreak}</Text>
          <Text style={styles.miniLbl}>Current streak</Text>
          <Text style={styles.miniHint}>days with logs</Text>
        </Card>
        <Card style={styles.mini}>
          <Text style={styles.miniVal}>{derived.bestStreak}</Text>
          <Text style={styles.miniLbl}>Best streak</Text>
          <Text style={styles.miniHint}>days with logs</Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Averages</Text>
        <Text style={styles.cardSub}>{derived.periodLabel} · per calendar day</Text>
        <View style={styles.avgRow}>
          <View style={styles.avgCell}>
            <Text style={styles.avgVal}>{derived.avgActivities}</Text>
            <Text style={styles.avgLbl}>Avg activities</Text>
          </View>
          <View style={styles.avgCell}>
            <Text style={styles.avgVal}>{derived.avgMinutes}</Text>
            <Text style={styles.avgLbl}>Avg minutes</Text>
          </View>
          <View style={styles.avgCell}>
            <Text style={styles.avgVal}>{derived.avgBurned}</Text>
            <Text style={styles.avgLbl}>Avg kcal burned</Text>
          </View>
        </View>
        <View style={styles.stepsAvgRow}>
          <View style={styles.avgCell}>
            <Text style={styles.avgVal}>{derived.avgSteps.toLocaleString()}</Text>
            <Text style={styles.avgLbl}>Avg steps / day</Text>
            <Text style={styles.avgHint}>manual entries in period</Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Workout minutes</Text>
        <Text style={styles.cardSub}>{derived.periodLabel}</Text>
        <MinutesBarChart
          points={derived.chartPoints}
          divider={Colors.border}
          tertiary={Colors.textTertiary}
          barColor={Colors.textPrimary}
        />
      </Card>
    </View>
  );
}

const createStyles = (Colors) =>
  StyleSheet.create({
    center: { paddingVertical: 32, alignItems: 'center', gap: 8 },
    muted: { fontSize: 13, color: Colors.textTertiary },
    err: { color: Colors.error, fontSize: 14, textAlign: 'center', paddingHorizontal: 16 },
    periodHeading: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textSecondary,
      marginBottom: 8,
    },
    statRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    mini: { flex: 1, padding: 12, minWidth: 0 },
    miniVal: {
      fontSize: 22,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    miniLbl: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
    miniHint: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
    cardTitle: {
      fontSize: 16,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
      marginBottom: 2,
    },
    cardSub: { fontSize: 12, color: Colors.textTertiary, marginBottom: 12 },
    avgRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    avgCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    avgVal: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
    avgLbl: { fontSize: 10, color: Colors.textTertiary, textAlign: 'center', marginTop: 4 },
    avgHint: { fontSize: 9, color: Colors.textTertiary, textAlign: 'center', marginTop: 2 },
    stepsAvgRow: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Colors.border,
    },
  });
