import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Check } from 'lucide-react-native';
import Card from '@/components/common/Card';
import { useTheme } from '@/context/ThemeContext';
import { habitIconMap, getIconForCategory } from '@/components/habits/habitIconMap';
import { normalizeNumericConditionType, NUMERIC_CONDITION, habitCountsTowardDailyCompletion } from '@/lib/habitNumericCondition';

function habitProgressLine(h) {
  if (h.type === 'numeric') {
    const cur = h.current;
    const tgt = h.target;
    const cond = normalizeNumericConditionType(h);
    if (cond === NUMERIC_CONDITION.ANY_VALUE) {
      return h.numericDayHasEntry && cur != null ? `${cur}` : '—';
    }
    if (tgt != null) return `${cur ?? 0} / ${tgt}`;
    return `${cur ?? 0}`;
  }
  if (h.type === 'timer') {
    const u = h.unit || 'min';
    return `${Math.round(h.current || 0)} / ${Math.round(h.target || 0)} ${u}`;
  }
  if (h.type === 'checklist') {
    return `${h.current ?? 0} / ${h.target ?? 0} tasks`;
  }
  return null;
}

function HabitRow({ habit, onPress }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const line = habitProgressLine(habit);
  const isAnyValue =
    habit.type === 'numeric' && normalizeNumericConditionType(habit) === NUMERIC_CONDITION.ANY_VALUE;

  return (
    <TouchableOpacity
      style={styles.habitRow}
      onPress={() => onPress(habit)}
      activeOpacity={0.7}
    >
      <View style={[styles.habitIconWrap, { backgroundColor: habit.iconBg || '#8B5CF6' }]}>
        {(() => {
          const IconComp = (habit.iconName && habitIconMap[habit.iconName]) || getIconForCategory(habit.category);
          return <IconComp size={17} color={habit.iconColor || '#FFFFFF'} />;
        })()}
      </View>

      <View style={styles.habitTextCol}>
        <Text style={[styles.habitName, !isAnyValue && habit.completed && styles.habitNameDone]} numberOfLines={1}>
          {habit.name}
        </Text>
        {!isAnyValue && line ? <Text style={styles.habitMeta}>{line}</Text> : null}
      </View>

      {isAnyValue ? (
        <Text style={styles.valueOnly}>{line || '—'}</Text>
      ) : (
        <View style={[styles.checkCircle, habit.completed && { backgroundColor: habit.iconBg || '#8B5CF6', borderColor: habit.iconBg || '#8B5CF6' }]}>
          {habit.completed && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * @param {{
 *   habits: any[],
 *   loading?: boolean,
 *   error?: string|null,
 *   dateLabel?: string,
 *   onHabitPress: (habit: any) => void,
 * }} props
 */
export default function HabitsSummary({ habits, loading, error, dateLabel, onHabitPress }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const router = useRouter();

  if (loading) {
    return (
      <Card>
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.centerText}>Loading habits…</Text>
        </View>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Text style={styles.errorTitle}>Could not load habits</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </Card>
    );
  }

  if (!habits.length) {
    return (
      <Card>
        <Text style={styles.title}>Habits</Text>
        {dateLabel ? <Text style={styles.subtitle}>{dateLabel}</Text> : null}
        <Text style={styles.emptyText}>No habits scheduled for this day.</Text>
        <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/(tabs)/habits')} activeOpacity={0.7}>
          <Text style={styles.linkBtnText}>Open Habit Tracker</Text>
          <ChevronRight size={16} color={Colors.primary} />
        </TouchableOpacity>
      </Card>
    );
  }

  const tallyHabits = habits.filter(habitCountsTowardDailyCompletion);
  const completed = tallyHabits.filter((h) => h.completed).length;
  const total = tallyHabits.length;
  const progress = total ? completed / total : 0;
  const allDone = total > 0 && completed === total;

  return (
    <Card>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Habits</Text>
          <Text style={styles.subtitle}>
            {dateLabel ? `${dateLabel} · ` : ''}
            {total === 0
              ? `${habits.length} habit${habits.length === 1 ? '' : 's'} (value tracking only)`
              : allDone
                ? 'All done!'
                : `${completed} of ${total} completed`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.seeAllBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/habits')}
        >
          <Text style={styles.seeAllText}>See all</Text>
          <ChevronRight size={14} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%` },
              allDone && { backgroundColor: Colors.success },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, allDone && { color: Colors.success }]}>
          {Math.round(progress * 100)}%
        </Text>
      </View>

      <View style={styles.habitList}>
        {habits.map((habit, i) => (
          <View key={habit.id}>
            <HabitRow habit={habit} onPress={onHabitPress} />
            {i < habits.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      {allDone && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>You completed every habit for this day.</Text>
        </View>
      )}
    </Card>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  centerBox: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 10,
  },
  centerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  errorTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  errorSub: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 12,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkBtnText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.primary,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.primary,
    width: 34,
    textAlign: 'right',
  },
  habitList: {
    gap: 0,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  habitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitTextCol: {
    flex: 1,
    minWidth: 0,
  },
  habitName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
  },
  habitNameDone: {
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  habitMeta: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  valueOnly: {
    minWidth: 36,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 48,
  },
  successBanner: {
    marginTop: 12,
    backgroundColor: Colors.successLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  successText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.success,
  },
});
