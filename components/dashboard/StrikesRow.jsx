import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Apple, Dumbbell, ListChecks } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const ACCENT = '#E8526A';

function StrikePill({ icon: Icon, value, onPress }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);

  const inner = (
    <View style={s.pill}>
      <Icon size={13} color={Colors.textPrimary} strokeWidth={2.25} />
      <Text style={s.value}>{value}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={s.pillOuter} onPress={onPress} activeOpacity={0.65}>
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={s.pillOuter}>{inner}</View>;
}

/**
 * @param {{
 *   nutritionStreak: number,
 *   activityStreak: number,
 *   habitTrackerStreak: number,
 *   loading?: boolean,
 *   error?: string|null,
 *   onPressNutrition?: () => void,
 *   onPressActivity?: () => void,
 *   onPressHabitTracker?: () => void,
 * }} props
 */
export default function StrikesRow({
  nutritionStreak,
  activityStreak,
  habitTrackerStreak,
  loading,
  error,
  onPressNutrition,
  onPressActivity,
  onPressHabitTracker,
}) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);

  if (loading) {
    return (
      <View style={s.wrap}>
        <View style={s.loadingRow}>
          <ActivityIndicator size="small" color={ACCENT} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.wrap}>
        <Text style={s.errorText} numberOfLines={2}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <StrikePill icon={Apple} value={nutritionStreak} onPress={onPressNutrition} />
        <StrikePill icon={Dumbbell} value={activityStreak} onPress={onPressActivity} />
        <StrikePill icon={ListChecks} value={habitTrackerStreak} onPress={onPressHabitTracker} />
      </View>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  pillOuter: {
    flex: 1,
    minWidth: 0,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 999,
    backgroundColor: Colors.cardBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingVertical: 5,
    paddingLeft: 7,
    paddingRight: 8,
    minHeight: 34,
  },
  value: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    color: Colors.textPrimary,
    lineHeight: 16,
    minWidth: 18,
    textAlign: 'right',
  },
  loadingRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  errorText: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
