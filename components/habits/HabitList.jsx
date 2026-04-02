import { View, StyleSheet } from 'react-native';
import HabitCard from './HabitCard';
import EmptyState from './EmptyState';

export default function HabitList({
  habits,
  onToggle,
  onIncrement,
  onDecrement,
  onToggleChecklistItem,
  onTimerStart,
  onTimerStop,
  onTimerReset,
  onLongPress,
  onAddHabit,
  runningTimers,
}) {
  if (!habits || habits.length === 0) {
    return <EmptyState onAddHabit={onAddHabit} />;
  }

  return (
    <View style={styles.container}>
      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          onToggle={onToggle}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          onToggleChecklistItem={onToggleChecklistItem}
          onTimerStart={onTimerStart}
          onTimerStop={onTimerStop}
          onTimerReset={onTimerReset}
          onLongPress={onLongPress}
          timerRunning={runningTimers?.[habit.id] || false}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
});
