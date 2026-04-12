import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { CalendarDays, ChartBar as BarChartIcon, Pencil } from 'lucide-react-native';

const ICON_MORE = require('@/src/Icons/More.png');
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import HabitWeekStrip from './HabitWeekStrip';
import { habitIconMap, getIconForCategory } from './habitIconMap';
import { formatHabitFrequencyLabel } from '@/lib/habitEditForm';

function getCompletionRate(completionHistory = []) {
  if (!completionHistory || completionHistory.length === 0) return 0;
  const today = new Date();
  const set = new Set(completionHistory);
  let scheduled = 0;
  let completed = 0;
  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    scheduled++;
    if (set.has(dateStr)) completed++;
  }
  return scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
}

function showSecondaryActions(habit, onDuplicate, onTogglePause, onDelete) {
  const pauseLabel = habit.isPaused ? 'Resume habit' : 'Pause habit';
  if (Platform.OS === 'ios') {
    const opts = [pauseLabel, 'Duplicate habit', 'Delete habit', 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: opts,
        cancelButtonIndex: 3,
        destructiveButtonIndex: 2,
      },
      (idx) => {
        if (idx === 0) onTogglePause?.(habit);
        if (idx === 1) onDuplicate?.(habit);
        if (idx === 2) onDelete?.(habit);
      },
    );
  } else {
    Alert.alert('More options', habit.name, [
      { text: pauseLabel, onPress: () => onTogglePause?.(habit) },
      { text: 'Duplicate habit', onPress: () => onDuplicate?.(habit) },
      { text: 'Delete habit', style: 'destructive', onPress: () => onDelete?.(habit) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
}

/** (...) opens menu with Edit habit as the primary action (opens Habit Details Edit tab). */
function openHabitOverflowMenu(habit, onOpenDetail, onDuplicate, onTogglePause, onDelete) {
  const pauseLabel = habit.isPaused ? 'Resume habit' : 'Pause habit';
  if (Platform.OS === 'ios') {
    const opts = ['Edit habit', pauseLabel, 'Duplicate habit', 'Delete habit', 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: opts,
        cancelButtonIndex: 4,
        destructiveButtonIndex: 3,
      },
      (idx) => {
        if (idx === 0) onOpenDetail?.(habit, 'Edit');
        if (idx === 1) onTogglePause?.(habit);
        if (idx === 2) onDuplicate?.(habit);
        if (idx === 3) onDelete?.(habit);
      },
    );
  } else {
    Alert.alert('Habit', habit.name, [
      { text: 'Edit habit', onPress: () => onOpenDetail?.(habit, 'Edit') },
      {
        text: 'More options',
        onPress: () => showSecondaryActions(habit, onDuplicate, onTogglePause, onDelete),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
}

export default function HabitManageCard({
  habit,
  onDuplicate,
  onDelete,
  onTogglePause,
  onOpenDetail,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const completionRate = getCompletionRate(habit.completionHistory);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.name} numberOfLines={1}>{habit.name}</Text>
          <Text style={styles.repeatLabel}>{formatHabitFrequencyLabel(habit)}</Text>
        </View>
        <TouchableOpacity
          style={styles.moreHeaderBtn}
          onPress={() => openHabitOverflowMenu(habit, onOpenDetail, onDuplicate, onTogglePause, onDelete)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Habit menu"
        >
          <Image source={ICON_MORE} style={styles.moreHeaderIcon} resizeMode="contain" />
        </TouchableOpacity>
        <View style={[styles.iconCircle, { backgroundColor: habit.iconBg || '#E8F4FD' }]}>
          {(() => {
            const IconComp = (habit.iconName && habitIconMap[habit.iconName]) || getIconForCategory(habit.category);
            return <IconComp size={20} color={habit.iconColor || Colors.textPrimary} />;
          })()}
        </View>
      </View>

      <HabitWeekStrip completionHistory={habit.completionHistory || []} />

      <View style={styles.actionRail}>
        <TouchableOpacity
          style={styles.railBtn}
          onPress={() => onOpenDetail?.(habit, 'Calendar')}
          activeOpacity={0.7}
        >
          <View style={styles.railIconWrap}>
            <CalendarDays size={18} color={Colors.textPrimary} />
          </View>
          <Text style={styles.railLabel}>Calendar</Text>
        </TouchableOpacity>
        <View style={styles.railDivider} />
        <TouchableOpacity
          style={styles.railBtn}
          onPress={() => onOpenDetail?.(habit, 'Statistics')}
          activeOpacity={0.7}
        >
          <View style={styles.railIconWrap}>
            <BarChartIcon size={18} color={Colors.textPrimary} />
          </View>
          <Text style={styles.railLabel}>Statistics</Text>
        </TouchableOpacity>
        <View style={styles.railDivider} />
        <TouchableOpacity
          style={styles.railBtn}
          onPress={() => onOpenDetail?.(habit, 'Edit')}
          activeOpacity={0.7}
          accessibilityLabel="Edit habit"
        >
          <View style={styles.railIconWrap}>
            <Pencil size={18} color={Colors.textPrimary} />
          </View>
          <Text style={styles.railLabel}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomMeta}>
        <View style={styles.statGroup}>
          <Text style={styles.statText}>Streak {habit.streak ?? 0}</Text>
          <Text style={styles.statDot}>·</Text>
          <Text style={styles.statText}>{completionRate}% 30d</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  repeatLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.success,
  },
  moreHeaderBtn: {
    padding: 8,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreHeaderIcon: {
    width: 22,
    height: 22,
    tintColor: Colors.textSecondary,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRail: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 16,
    backgroundColor: Colors.innerCard,
    borderRadius: Layout.borderRadius.xl,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.innerBorder,
  },
  railBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderRadius: Layout.borderRadius.md,
  },
  railIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.innerBorder,
  },
  railDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.innerBorder,
    marginVertical: 10,
  },
  railLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
  bottomMeta: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
  },
  statGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.success,
  },
  statDot: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});
