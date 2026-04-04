import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import HabitManageCard from './HabitManageCard';

export default function HabitsManageView({
  habits,
  onDuplicate,
  onDelete,
  onTogglePause,
  onAddHabit,
  onOpenDetail,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.container}>
      {habits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No habits yet</Text>
          <Text style={styles.emptySubtitle}>Create your first habit to get started</Text>
          <TouchableOpacity style={styles.createBtn} onPress={onAddHabit} activeOpacity={0.7}>
            <Plus size={18} color={Colors.onPrimary} />
            <Text style={styles.createBtnText}>Create Habit</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.list}>
          <Text style={styles.resultCount}>
            {habits.length} habit{habits.length !== 1 ? 's' : ''}
          </Text>
          {habits.map((habit) => (
            <HabitManageCard
              key={habit.id}
              habit={habit}
              onDuplicate={onDuplicate}
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
