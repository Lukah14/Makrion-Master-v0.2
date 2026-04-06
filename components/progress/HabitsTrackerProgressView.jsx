import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeContext';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import ProgressRing from '@/components/common/ProgressRing';
import { TrendingUp } from 'lucide-react-native';
import { listHabits } from '@/services/habitService';
import { listHabitCompletionsSince } from '@/services/habitCompletionService';
import {
  indexCompletionsByDateAndHabit,
  buildWeekCompletionBreakdown,
  computeHabitCurrentStreakWithNeutral,
  computeHabitBestStreakWithNeutral,
} from '@/lib/progressHabits';
import { todayDateKey, addDaysToDateKey } from '@/lib/dateKey';

export default function HabitsTrackerProgressView({ uid, weekAnchorDateKey }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [habits, setHabits] = useState([]);
  const [completionRows, setCompletionRows] = useState([]);

  const anchor = weekAnchorDateKey || todayDateKey();
  const today = todayDateKey();

  useFocusEffect(
    useCallback(() => {
      if (!uid) {
        setHabits([]);
        setCompletionRows([]);
        setLoading(false);
        return undefined;
      }
      let cancelled = false;
      (async () => {
        setLoading(true);
        setError(null);
        try {
          const histStart = addDaysToDateKey(todayDateKey(), -1095);
          const [hList, rows] = await Promise.all([
            listHabits(uid),
            listHabitCompletionsSince(uid, histStart),
          ]);
          if (!cancelled) {
            setHabits(hList);
            setCompletionRows(rows);
          }
        } catch (e) {
          if (!cancelled) {
            setError(e?.message || 'Could not load habits');
            setHabits([]);
            setCompletionRows([]);
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

  const derived = useMemo(() => {
    const byDateHabit = indexCompletionsByDateAndHabit(completionRows);
    const histStart = addDaysToDateKey(today, -1095);

    const currentStreak = computeHabitCurrentStreakWithNeutral(habits, today, byDateHabit);
    const bestStreak = computeHabitBestStreakWithNeutral(habits, histStart, today, today, byDateHabit);

    const week = buildWeekCompletionBreakdown(habits, anchor, byDateHabit, today);

    const hasHabits = habits.length > 0;
    const hasAnyCompletion = completionRows.length > 0;

    return {
      currentStreak,
      bestStreak,
      week,
      hasHabits,
      hasAnyCompletion,
    };
  }, [habits, completionRows, anchor, today]);

  if (!uid) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Sign in to track habits"
        message="Habit progress uses your saved habits and completions."
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.muted}>Loading habits…</Text>
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

  if (!derived.hasHabits) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No habits yet"
        message="Add habits in Habit Tracker to see completion trends."
      />
    );
  }

  return (
    <View>
      <View style={styles.statRow}>
        <Card style={styles.mini}>
          <Text style={styles.miniVal}>{derived.currentStreak}</Text>
          <Text style={styles.miniLbl}>Current streak</Text>
          <Text style={styles.miniHint}>1+ habits completed</Text>
        </Card>
        <Card style={styles.mini}>
          <Text style={styles.miniVal}>{derived.bestStreak}</Text>
          <Text style={styles.miniLbl}>Best streak</Text>
          <Text style={styles.miniHint}>calendar days</Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Week completion</Text>
        <Text style={styles.cardSub}>
          {derived.week[0]?.dateKey && derived.week[6]?.dateKey
            ? `${derived.week[0].dateKey} → ${derived.week[6].dateKey}`
            : 'Mon–Sun'}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekScroll}
        >
          {derived.week.map((d) => {
            const { completed, total, pct } = d.fraction;
            const progress = total > 0 ? completed / total : 0;
            return (
              <View key={d.dateKey} style={styles.dayCol}>
                <ProgressRing
                  radius={22}
                  strokeWidth={4}
                  progress={progress}
                  color={progress >= 1 ? Colors.success : Colors.textPrimary}
                  bgColor={Colors.border}
                >
                  <Text style={styles.ringInner} numberOfLines={1}>
                    {total > 0 ? `${completed}/${total}` : '—'}
                  </Text>
                </ProgressRing>
                <Text style={styles.dayLbl}>{d.label}</Text>
                <Text style={styles.pctLbl}>{total > 0 ? `${pct}%` : ''}</Text>
              </View>
            );
          })}
        </ScrollView>
        {!derived.hasAnyCompletion ? (
          <Text style={styles.hint}>No completions logged yet this history window.</Text>
        ) : null}
      </Card>
    </View>
  );
}

const createStyles = (Colors) =>
  StyleSheet.create({
    center: { paddingVertical: 32, alignItems: 'center', gap: 8 },
    muted: { fontSize: 13, color: Colors.textTertiary },
    err: { color: Colors.error, fontSize: 14, textAlign: 'center', paddingHorizontal: 16 },
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
    cardSub: { fontSize: 11, color: Colors.textTertiary, marginBottom: 12 },
    weekScroll: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      paddingVertical: 8,
      paddingRight: 8,
    },
    dayCol: { alignItems: 'center', width: 52, minWidth: 52 },
    ringInner: {
      fontSize: 9,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    dayLbl: { fontSize: 10, color: Colors.textTertiary, marginTop: 6 },
    pctLbl: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
    hint: { fontSize: 12, color: Colors.textTertiary, marginTop: 8, textAlign: 'center' },
  });
