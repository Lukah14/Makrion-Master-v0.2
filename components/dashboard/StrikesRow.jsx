import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Apple, Dumbbell, ListChecks } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

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
 * Three pills showing independent per-domain current streaks.
 *
 * Each pill shows the streak for its own module:
 *   🍎 Nutrition  → currentNutritionStreak
 *   💪 Activity   → currentActivityStreak
 *   ✅ H.Tracker  → currentHabitTrackerStreak
 *
 * @param {{
 *   currentNutritionStreak: number,
 *   currentActivityStreak: number,
 *   currentHabitTrackerStreak: number,
 *   loading?: boolean,
 *   error?: string|null,
 *   onPressNutrition?: () => void,
 *   onPressActivity?: () => void,
 *   onPressHabitTracker?: () => void,
 * }} props
 */
export default function StrikesRow({
  currentNutritionStreak = 0,
  currentActivityStreak = 0,
  currentHabitTrackerStreak = 0,
  loading,
  error,
  onPressNutrition,
  onPressActivity,
  onPressHabitTracker,
}) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);

  // Never block with a full spinner — streak data is non-critical.
  // While loading, render the pills at reduced opacity so the layout is stable.
  // An error is also non-fatal: show a brief hint and the (zero) pills below it.
  return (
    <View style={[s.wrap, loading && s.wrapLoading]}>
      {error ? (
        <Text style={s.errorText} numberOfLines={1}>{error}</Text>
      ) : null}
      <View style={s.row}>
        <StrikePill
          icon={Apple}
          value={currentNutritionStreak}
          onPress={onPressNutrition}
        />
        <StrikePill
          icon={Dumbbell}
          value={currentActivityStreak}
          onPress={onPressActivity}
        />
        <StrikePill
          icon={ListChecks}
          value={currentHabitTrackerStreak}
          onPress={onPressHabitTracker}
        />
      </View>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  wrapLoading: {
    opacity: 0.45,
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
  errorText: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: 4,
  },
});
