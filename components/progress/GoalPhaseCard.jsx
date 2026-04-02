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

  const total = Math.abs(goal.targetWeight - goal.startWeight);
  const done = Math.abs(goal.currentWeight - goal.startWeight);
  const progress = total > 0 ? Math.min(done / total, 1) : 0;

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
        <Text style={styles.weightVal}>{goal.startWeight} kg</Text>
        <View style={[styles.targetBadge]}>
          <Target size={11} color={Colors.success} />
          <Text style={styles.targetText}>{goal.targetWeight} kg</Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: cfg.color }]} />
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.timeLabel}>⏱ Time to goal</Text>
        <Text style={styles.timeVal}>{goal.weeksToGoal} weeks</Text>
      </View>

      <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.8}>
        <Text style={styles.editBtnText}>Update Progress</Text>
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
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  timeVal: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-SemiBold',
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
