import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight, Check } from 'lucide-react-native';
import Card from '@/components/common/Card';
import { useTheme } from '@/context/ThemeContext';
import { habitIconMap, getIconForCategory } from '@/components/habits/habitIconMap';

const INITIAL_HABITS = [
  { id: '1', name: 'Drink 2.5L Water', iconName: 'plus', completed: true, color: '#FFFFFF', bg: '#84CC16', category: 'Health' },
  { id: '2', name: '10,000 Steps', iconName: 'footprints', completed: false, color: '#FFFFFF', bg: '#8B5CF6', category: 'Movement' },
  { id: '3', name: 'Healthy Breakfast', iconName: 'utensils', completed: true, color: '#FFFFFF', bg: '#F59E0B', category: 'Nutrition' },
  { id: '4', name: 'Workout 45 min', iconName: 'footprints', completed: false, color: '#FFFFFF', bg: '#8B5CF6', category: 'Movement' },
  { id: '5', name: 'Meditate 10 min', iconName: 'brain', completed: false, color: '#FFFFFF', bg: '#EC4899', category: 'Mind' },
];

function HabitRow({ habit, onToggle }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <TouchableOpacity
      style={styles.habitRow}
      onPress={() => onToggle(habit.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.habitIconWrap, { backgroundColor: habit.bg }]}>
        {(() => {
          const IconComp = (habit.iconName && habitIconMap[habit.iconName]) || getIconForCategory(habit.category);
          return <IconComp size={17} color={habit.color || '#FFFFFF'} />;
        })()}
      </View>

      <Text style={[styles.habitName, habit.completed && styles.habitNameDone]} numberOfLines={1}>
        {habit.name}
      </Text>

      <View style={[styles.checkCircle, habit.completed && { backgroundColor: habit.bg, borderColor: habit.bg }]}>
        {habit.completed && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
      </View>
    </TouchableOpacity>
  );
}

export default function HabitsSummary({ habits: propHabits }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [habits, setHabits] = useState(INITIAL_HABITS);

  const toggle = (id) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, completed: !h.completed } : h))
    );
  };

  const completed = habits.filter((h) => h.completed).length;
  const total = habits.length;
  const progress = completed / total;
  const allDone = completed === total;

  return (
    <Card>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Today's Habits</Text>
          <Text style={styles.subtitle}>
            {allDone ? 'All done for today!' : `${completed} of ${total} completed`}
          </Text>
        </View>
        <TouchableOpacity style={styles.seeAllBtn} activeOpacity={0.7}>
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
            <HabitRow habit={habit} onToggle={toggle} />
            {i < habits.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      {allDone && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>You crushed all your habits today!</Text>
        </View>
      )}
    </Card>
  );
}

const createStyles = (Colors) => StyleSheet.create({
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
  habitEmoji: {
    fontSize: 17,
  },
  habitName: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
  },
  habitNameDone: {
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
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
