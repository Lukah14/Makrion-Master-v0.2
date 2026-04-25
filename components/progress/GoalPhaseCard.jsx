import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Flame, Target, TrendingUp, Settings2 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const GOAL_CONFIG = {
  'Fat Loss': {
    icon: Flame,
    color: '#FF6B35',
    bg: '#FFF3EE',
    label: 'Fat Loss',
  },
  Maintain: {
    icon: Target,
    color: '#2DA89E',
    bg: '#E6F7F5',
    label: 'Maintain',
  },
  'Muscle Gain': {
    icon: TrendingUp,
    color: '#4A9BD9',
    bg: '#E8F4FD',
    label: 'Muscle Gain',
  },
  Custom: {
    icon: Settings2,
    color: '#9B59B6',
    bg: '#F3E8FD',
    label: 'Custom Goal',
  },
};

export default function GoalPhaseCard({ goal, onEdit }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const cfg = GOAL_CONFIG[goal.type] || GOAL_CONFIG['Custom'];
  const IconComp = cfg.icon;

  const sw = goal.startWeight != null && Number.isFinite(Number(goal.startWeight)) ? Number(goal.startWeight) : null;
  const tw = goal.targetWeight != null && Number.isFinite(Number(goal.targetWeight)) ? Number(goal.targetWeight) : null;
  const cw = goal.currentWeight != null && Number.isFinite(Number(goal.currentWeight)) ? Number(goal.currentWeight) : null;
  const total = sw != null && tw != null ? Math.abs(tw - sw) : 0;
  const done = sw != null && cw != null ? Math.abs(cw - sw) : 0;
  const progress = total > 0 ? Math.min(done / total, 1) : 0;

  const weeks =
    goal.goalTimelineWeeks != null && Number.isFinite(Number(goal.goalTimelineWeeks))
      ? Math.round(Number(goal.goalTimelineWeeks))
      : goal.weeksToGoal != null && Number.isFinite(Number(goal.weeksToGoal))
        ? Math.round(Number(goal.weeksToGoal))
        : null;

  const wk = goal.expectedWeeklyChangeKg;
  const paceLabel =
    wk == null || !Number.isFinite(Number(wk))
      ? null
      : Number(wk) < -0.005
        ? `Lose ${Math.abs(Number(wk)).toFixed(2)} kg/wk`
        : Number(wk) > 0.005
          ? `Gain ${Number(wk).toFixed(2)} kg/wk`
          : 'Maintain';

  let goalByLabel = '—';
  if (goal.estimatedGoalDate && typeof goal.estimatedGoalDate === 'string') {
    try {
      const d = new Date(goal.estimatedGoalDate.slice(0, 10) + 'T12:00:00');
      goalByLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      goalByLabel = goal.estimatedGoalDate.slice(0, 10);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
          <IconComp size={18} color={cfg.color} />
        </View>
        <Text style={styles.title}>Current Goal</Text>
      </View>

      <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.pillText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>

      <View style={styles.weightRow}>
        <Text style={styles.weightVal}>{sw != null ? `${sw} kg` : '—'}</Text>
        <View style={[styles.targetBadge]}>
          <Target size={11} color={Colors.success} />
          <Text style={styles.targetText}>{tw != null ? `${tw} kg` : '—'}</Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: cfg.color }]} />
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.timeLabel}>⏱ Time to goal</Text>
        <Text style={styles.timeVal}>{weeks != null ? `${weeks} wk` : '—'}</Text>
      </View>
      {paceLabel ? (
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Expected pace</Text>
          <Text style={styles.timeVal}>{paceLabel}</Text>
        </View>
      ) : null}
      {goal.estimatedGoalDate ? (
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Goal by (est.)</Text>
          <Text style={styles.timeVal}>{goalByLabel}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.8}>
        <Text style={styles.editBtnText}>Log weight</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 10,
  },
  pillText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weightVal: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  targetText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.success,
  },
  barTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  timeLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-Regular',
    flexShrink: 1,
    flexWrap: 'wrap',
    lineHeight: 16,
  },
  timeVal: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-SemiBold',
    flexShrink: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
    lineHeight: 16,
  },
  editBtn: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.onPrimary,
  },
});
