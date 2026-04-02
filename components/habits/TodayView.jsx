import { View, StyleSheet } from 'react-native';
import HabitList from './HabitList';
import MemorableMomentsSection from './MemorableMomentsSection';

export default function TodayView({
  habits,
  moments,
  onToggle,
  onIncrement,
  onDecrement,
  onToggleChecklistItem,
  onTimerStart,
  onTimerStop,
  onTimerReset,
  onHabitLongPress,
  onAddHabit,
  onSaveMoment,
  runningTimers,
}) {
  return (
    <View style={styles.container}>
      <HabitList
        habits={habits}
        onToggle={onToggle}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onToggleChecklistItem={onToggleChecklistItem}
        onTimerStart={onTimerStart}
        onTimerStop={onTimerStop}
        onTimerReset={onTimerReset}
        onLongPress={onHabitLongPress}
        onAddHabit={onAddHabit}
        runningTimers={runningTimers}
      />

      <MemorableMomentsSection
        moments={moments}
        onSaveMoment={onSaveMoment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
