import { View, StyleSheet } from 'react-native';
import TodayProgressCard from './TodayProgressCard';
import HabitList from './HabitList';

/** Habits-only stack for the Today subpage. Memorable Moments is rendered separately in `habits.jsx`. */
export default function TodayView({
  dateKey,
  todayKey,
  habits,
  onToggle,
  onIncrement,
  onDecrement,
  onNumericQuickComplete,
  onSetNumericCurrent,
  onToggleChecklistItem,
  onTimerStart,
  onTimerPause,
  onTimerStop,
  onTimerReset,
  onTimerEditSave,
  onHabitLongPress,
  onAddHabit,
  runningTimers,
}) {
  return (
    <View style={styles.container}>
      <TodayProgressCard habits={habits} dateKey={dateKey} todayKey={todayKey} />
      <HabitList
        habits={habits}
        onToggle={onToggle}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onNumericQuickComplete={onNumericQuickComplete}
        onSetNumericCurrent={onSetNumericCurrent}
        onToggleChecklistItem={onToggleChecklistItem}
        onTimerStart={onTimerStart}
        onTimerPause={onTimerPause}
        onTimerStop={onTimerStop}
        onTimerReset={onTimerReset}
        onTimerEditSave={onTimerEditSave}
        onLongPress={onHabitLongPress}
        onAddHabit={onAddHabit}
        runningTimers={runningTimers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
