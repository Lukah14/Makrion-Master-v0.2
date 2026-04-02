import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Pause, Play, Pencil, Copy, Archive, Trash2, Link2, CalendarDays, ChartBar as BarChart2, CircleCheckBig } from 'lucide-react-native';

const ICON_MORE = require('@/src/Icons/More.png');
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { useState } from 'react';
import HabitWeekStrip from './HabitWeekStrip';
import { habitIconMap, getIconForCategory } from './habitIconMap';

const REPEAT_LABELS = {
  daily: 'Every day',
  specific_days_week: 'Specific days',
  specific_days_month: 'Monthly',
  specific_days_year: 'Yearly',
  some_days_period: 'Periodic',
  repeat: 'Repeat',
};

function getCompletionRate(completionHistory = []) {
  if (!completionHistory || completionHistory.length === 0) return 0;
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  let scheduled = 0;
  let completed = 0;
  const set = new Set(completionHistory);

  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    scheduled++;
    if (set.has(dateStr)) completed++;
  }
  return scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
}

export default function HabitManageCard({
  habit,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onTogglePause,
  onOpenDetail,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [showMenu, setShowMenu] = useState(false);
  const completionRate = getCompletionRate(habit.completionHistory);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.name} numberOfLines={1}>{habit.name}</Text>
          <Text style={styles.repeatLabel}>{REPEAT_LABELS[habit.repeatRule] || 'Every day'}</Text>
        </View>
        <View style={[styles.iconCircle, { backgroundColor: habit.iconBg || '#E8F4FD' }]}>
          {(() => {
            const IconComp = (habit.iconName && habitIconMap[habit.iconName]) || getIconForCategory(habit.category);
            return <IconComp size={20} color={habit.iconColor || Colors.textPrimary} />;
          })()}
        </View>
      </View>

      <HabitWeekStrip completionHistory={habit.completionHistory || []} />

      <View style={styles.bottomRow}>
        <View style={styles.statGroup}>
          <View style={styles.statItem}>
            <Link2 size={13} color={Colors.success} />
            <Text style={styles.statText}>{habit.streak}</Text>
          </View>
          <View style={styles.statItem}>
            <CircleCheckBig size={13} color={Colors.success} />
            <Text style={styles.statText}>{completionRate}%</Text>
          </View>
        </View>

        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onOpenDetail?.(habit, 'calendar')}
            activeOpacity={0.7}
          >
            <CalendarDays size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onOpenDetail?.(habit, 'statistics')}
            activeOpacity={0.7}
          >
            <BarChart2 size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowMenu(!showMenu)}
            activeOpacity={0.7}
          >
            <Image source={ICON_MORE} style={styles.moreIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>

      {showMenu && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); onEdit?.(habit); }}>
            <Pencil size={16} color={Colors.textSecondary} />
            <Text style={styles.menuItemText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); onDuplicate?.(habit); }}>
            <Copy size={16} color={Colors.textSecondary} />
            <Text style={styles.menuItemText}>Duplicate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); onTogglePause?.(habit); }}>
            {habit.isPaused ? <Play size={16} color={Colors.textSecondary} /> : <Pause size={16} color={Colors.textSecondary} />}
            <Text style={styles.menuItemText}>{habit.isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); onArchive?.(habit); }}>
            <Archive size={16} color={Colors.textSecondary} />
            <Text style={styles.menuItemText}>Archive</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); onDelete?.(habit); }}>
            <Trash2 size={16} color={Colors.error} />
            <Text style={[styles.menuItemText, { color: Colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
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
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  statGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.success,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIcon: {
    width: 16,
    height: 16,
    tintColor: Colors.textTertiary,
  },
  menuDropdown: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  menuItemText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans-Medium',
  },
});
