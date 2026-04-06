import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { habitCountsTowardDailyCompletion } from '@/lib/habitNumericCondition';

/**
 * Progress for the selected calendar day (merged habit rows with .completed).
 * @param {{ id: string, type: string, completed?: boolean, current?: number, target?: number, checklistItems?: { completed?: boolean }[], paused?: boolean, isPaused?: boolean }[]} habits
 * @param {string} dateKey
 * @param {string} [todayKey]  When dateKey === todayKey, label says "Today"
 */
export default function TodayProgressCard({ habits, dateKey, todayKey }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const active = (habits || []).filter((h) => !h.paused && !h.isPaused);
  const tally = active.filter(habitCountsTowardDailyCompletion);
  const completedCount = tally.filter((h) => {
    if (h.type === 'yesno') return h.completed;
    if (h.type === 'checklist') return h.checklistItems?.every((i) => i.completed);
    return h.completed || (Number(h.current) >= Number(h.target) && Number(h.target) > 0);
  }).length;
  const total = tally.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const isToday = todayKey && dateKey === todayKey;
  const title = isToday ? "Today's progress" : 'Day progress';
  const sub = isToday ? 'habits completed' : `for ${dateKey}`;

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressLeft}>
        <Text style={styles.progressLabel}>{title}</Text>
        <View style={styles.fractionRow}>
          <Text style={styles.fractionMain}>{completedCount}</Text>
          <Text style={styles.fractionDivider}>/{total}</Text>
        </View>
        <Text style={styles.progressSub}>{sub}</Text>
      </View>
      <View style={styles.ringWrap}>
        <Svg width={72} height={72}>
          <Circle stroke={Colors.border} fill="none" strokeWidth={6} cx={36} cy={36} r={33} />
          <Circle
            stroke={Colors.textPrimary}
            fill="none"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 33} ${2 * Math.PI * 33}`}
            strokeDashoffset={(2 * Math.PI * 33) * (1 - pct / 100)}
            cx={36}
            cy={36}
            r={33}
            transform="rotate(-90, 36, 36)"
          />
        </Svg>
        <View style={styles.ringLabel}>
          <Text style={styles.ringPct}>{pct}%</Text>
        </View>
      </View>
      <View style={styles.progressBarOuter}>
        <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const createStyles = (Colors) =>
  StyleSheet.create({
    progressCard: {
      backgroundColor: Colors.cardBackground,
      borderRadius: Layout.borderRadius.xl,
      padding: 18,
      marginBottom: 14,
      shadowColor: Colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    progressLeft: {
      flex: 1,
      marginRight: 16,
    },
    progressLabel: {
      fontSize: 12,
      color: Colors.textSecondary,
      marginBottom: 4,
    },
    fractionRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 2,
    },
    fractionMain: {
      fontSize: 36,
      fontFamily: 'PlusJakartaSans-ExtraBold',
      color: Colors.textPrimary,
      lineHeight: 40,
    },
    fractionDivider: {
      fontSize: 20,
      fontFamily: 'PlusJakartaSans-Medium',
      color: Colors.textSecondary,
      marginLeft: 2,
    },
    progressSub: {
      fontSize: 13,
      color: Colors.textSecondary,
    },
    ringWrap: {
      width: 72,
      height: 72,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringLabel: {
      position: 'absolute',
      alignItems: 'center',
    },
    ringPct: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    progressBarOuter: {
      width: '100%',
      height: 5,
      backgroundColor: Colors.border,
      borderRadius: 3,
      marginTop: 14,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: Colors.textPrimary,
      borderRadius: 3,
    },
  });
