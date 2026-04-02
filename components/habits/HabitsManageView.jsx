import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import HabitFilterTabs from './HabitFilterTabs';
import HabitManageCard from './HabitManageCard';
import Svg, { Circle } from 'react-native-svg';

function TodayProgressCard({ habits }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const today = new Date().toISOString().split('T')[0];
  const activeHabits = habits.filter((h) => !h.isArchived && !h.isPaused);
  const completedToday = activeHabits.filter((h) => {
    if (h.type === 'yesno') return h.completed;
    if (h.type === 'checklist') return h.checklistItems?.every((i) => i.completed);
    return h.current >= h.target;
  }).length;
  const total = activeHabits.length;
  const pct = total > 0 ? Math.round((completedToday / total) * 100) : 0;

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressLeft}>
        <Text style={styles.progressLabel}>Today's progress</Text>
        <View style={styles.fractionRow}>
          <Text style={styles.fractionMain}>{completedToday}</Text>
          <Text style={styles.fractionDivider}>/{total}</Text>
        </View>
        <Text style={styles.progressSub}>habits completed</Text>
      </View>
      <View style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }}>
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
        <View style={{ position: 'absolute' }}>
          <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary }}>{pct}%</Text>
        </View>
      </View>
      <View style={styles.progressBarOuter}>
        <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

export default function HabitsManageView({
  habits,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onTogglePause,
  onAddHabit,
  onOpenDetail,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHabits = useMemo(() => {
    let result = habits;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (h) => h.name.toLowerCase().includes(q) || h.category.toLowerCase().includes(q)
      );
    }

    switch (activeFilter) {
      case 'Active':
        result = result.filter((h) => !h.isPaused && !h.isArchived);
        break;
      case 'Completed':
        result = result.filter((h) => h.completed || (h.current >= h.target && h.type !== 'yesno'));
        break;
      case 'Missed':
        result = result.filter(
          (h) => !h.completed && !h.isPaused && !h.isArchived && (h.type === 'yesno' ? !h.completed : h.current < h.target)
        );
        break;
      case 'Archived':
        result = result.filter((h) => h.isArchived);
        break;
      default:
        result = result.filter((h) => !h.isArchived);
        break;
    }

    return result;
  }, [habits, activeFilter, searchQuery]);

  return (
    <View style={styles.container}>
      <TodayProgressCard habits={habits} />

      <HabitFilterTabs
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {filteredHabits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No habits found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Try a different search term' : 'Create your first habit to get started'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity style={styles.createBtn} onPress={onAddHabit} activeOpacity={0.7}>
              <Plus size={18} color={Colors.onPrimary} />
              <Text style={styles.createBtnText}>Create Habit</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.list}>
          <Text style={styles.resultCount}>
            {filteredHabits.length} habit{filteredHabits.length !== 1 ? 's' : ''}
          </Text>
          {filteredHabits.map((habit) => (
            <HabitManageCard
              key={habit.id}
              habit={habit}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onArchive={onArchive}
              onDelete={onDelete}
              onTogglePause={onTogglePause}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  progressCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    padding: 18,
    marginBottom: 16,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginBottom: 20,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.textPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createBtnText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.onPrimary,
  },
  list: {
    gap: 0,
  },
  resultCount: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 10,
  },
});
