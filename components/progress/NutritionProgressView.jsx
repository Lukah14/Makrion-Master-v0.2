import React, { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import { TrendingUp } from 'lucide-react-native';
import { countCalendarDaysInStatsRange, getProgressPeriodRange } from '@/lib/progressPeriods';
import {
  computeCurrentStreakActiveDays,
  computeBestStreakFromSortedActiveDays,
} from '@/lib/progressStreaks';
import { todayDateKey, dateKeyRange, parseDateKey } from '@/lib/dateKey';
import {
  fetchNutritionProgressBundle,
  isNutritionLoggedDay,
} from '@/services/nutritionProgressService';

const screenW = Dimensions.get('window').width - Layout.screenPadding * 2;

function CaloriesBarChart({ points, divider, tertiary, barColor }) {
  const chartWidth = Math.min(screenW - 32, screenW);
  const chartHeight = 160;
  const padBottom = 22;
  const padLeft = 40;
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
          No data this week
        </SvgText>
      </Svg>
    );
  }

  const maxK = Math.max(...points.map((p) => p.kcal), 400);
  const barW = Math.max(6, innerW / points.length - 4);
  const gridVals = [0, Math.round(maxK / 2), maxK];

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {gridVals.map((v, i) => {
        const y = padTop + innerH - (v / maxK) * innerH;
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
        const y = padTop + innerH - (v / maxK) * innerH;
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
        const h = maxK > 0 ? (p.kcal / maxK) * innerH : 0;
        const base = padTop + innerH;
        return (
          <G key={p.key}>
            {p.kcal > 0 ? (
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

export default function NutritionProgressView({ uid }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  /** @type {Map<string, { kcal: number, protein: number, carbs: number, fat: number, hasMeaningfulLog?: boolean }>} */
  const [historyMap, setHistoryMap] = useState(() => new Map());
  /** @type {{ start: string, end: string, statsEnd: string, label: string } | null} */
  const [weekMeta, setWeekMeta] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (!uid) {
        setHistoryMap(new Map());
        setWeekMeta(null);
        setLoading(false);
        return undefined;
      }
      let cancelled = false;
      (async () => {
        setLoading(true);
        setError(null);
        try {
          const today = todayDateKey();
          const { map, week } = await fetchNutritionProgressBundle(uid, today);
          if (!cancelled) {
            setHistoryMap(map);
            setWeekMeta(week);
          }
        } catch (e) {
          if (!cancelled) {
            setError(e?.message || 'Could not load nutrition history');
            setHistoryMap(new Map());
            setWeekMeta(null);
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
    const week = weekMeta || getProgressPeriodRange('this_week', today);

    const activeDays = [];
    for (const [k, t] of historyMap.entries()) {
      if (isNutritionLoggedDay(t)) activeDays.push(k);
    }
    activeDays.sort((a, b) => a.localeCompare(b));
    const activeSet = new Set(activeDays);
    const currentStreak = computeCurrentStreakActiveDays(activeSet, today);
    const bestStreak = computeBestStreakFromSortedActiveDays(activeDays);

    const statsDays = countCalendarDaysInStatsRange(week.start, week.statsEnd);
    let sumKcal = 0;
    let sumP = 0;
    let sumC = 0;
    let sumF = 0;
    for (const k of dateKeyRange(week.start, week.statsEnd)) {
      const t = historyMap.get(k);
      sumKcal += t?.kcal ?? 0;
      sumP += t?.protein ?? 0;
      sumC += t?.carbs ?? 0;
      sumF += t?.fat ?? 0;
    }
    const avgCalories = statsDays > 0 ? Math.round(sumKcal / statsDays) : 0;
    const avgProtein = statsDays > 0 ? Math.round((sumP / statsDays) * 10) / 10 : 0;
    const avgCarbs = statsDays > 0 ? Math.round((sumC / statsDays) * 10) / 10 : 0;
    const avgFat = statsDays > 0 ? Math.round((sumF / statsDays) * 10) / 10 : 0;

    const chartKeys = dateKeyRange(week.start, week.end);
    const dow = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const chartPoints = chartKeys.map((k) => {
      const t = historyMap.get(k) || { kcal: 0 };
      const dayIx = (parseDateKey(k).getDay() + 6) % 7;
      return {
        key: k,
        label: dow[dayIx],
        kcal: t.kcal ?? 0,
      };
    });

    const hasAnyLog = activeDays.length > 0;
    return {
      currentStreak,
      bestStreak,
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFat,
      chartPoints,
      hasAnyLog,
      weekLabel: week.label,
      statsDays,
    };
  }, [historyMap, weekMeta, today]);

  if (!uid) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Sign in to track nutrition"
        message="Nutrition progress uses your logged meals."
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.muted}>Loading nutrition…</Text>
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

  if (!derived.hasAnyLog) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No nutrition logs yet"
        message="Log meals in Nutrition to build streaks, averages, and charts."
      />
    );
  }

  return (
    <View>
      <Text style={styles.sectionKicker}>This week</Text>

      <View style={styles.statRow}>
        <Card style={styles.mini}>
          <Text style={styles.miniVal}>{derived.currentStreak}</Text>
          <Text style={styles.miniLbl}>Current streak</Text>
          <Text style={styles.miniHint}>days with logs</Text>
        </Card>
        <Card style={styles.mini}>
          <Text style={styles.miniVal}>{derived.bestStreak}</Text>
          <Text style={styles.miniLbl}>Best streak</Text>
          <Text style={styles.miniHint}>in the last year</Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Averages</Text>
        <Text style={styles.cardSub}>
          {derived.weekLabel} · per day ({derived.statsDays} {derived.statsDays === 1 ? 'day' : 'days'})
        </Text>
        <View style={styles.avgRow}>
          <View style={styles.avgCell}>
            <Text style={styles.avgVal}>{derived.avgCalories.toLocaleString()}</Text>
            <Text style={styles.avgLbl}>Avg calories</Text>
          </View>
          <View style={styles.avgCell}>
            <Text style={styles.avgVal}>{derived.avgProtein} g</Text>
            <Text style={styles.avgLbl}>Avg protein</Text>
          </View>
        </View>
        <View style={[styles.avgRow, styles.avgRowSecond]}>
          <View style={styles.avgCell}>
            <Text style={styles.avgVal}>{derived.avgCarbs} g</Text>
            <Text style={styles.avgLbl}>Avg carbs</Text>
          </View>
          <View style={styles.avgCell}>
            <Text style={styles.avgVal}>{derived.avgFat} g</Text>
            <Text style={styles.avgLbl}>Avg fat</Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Daily calories</Text>
        <Text style={styles.cardSub}>{derived.weekLabel}</Text>
        <CaloriesBarChart
          points={derived.chartPoints}
          divider={Colors.border}
          tertiary={Colors.textTertiary}
          barColor={Colors.primary}
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
    sectionKicker: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textSecondary,
      marginBottom: 10,
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
    avgRowSecond: { marginTop: 12 },
    avgCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    avgVal: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
    avgLbl: { fontSize: 10, color: Colors.textTertiary, textAlign: 'center', marginTop: 4 },
  });
