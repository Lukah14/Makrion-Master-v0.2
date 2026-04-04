import { View, StyleSheet } from 'react-native';
import TodayProgressCard from './TodayProgressCard';
import HabitList from './HabitList';
import MemorableMomentsSection from './MemorableMomentsSection';

export default function TodayView({
  dateKey,
  todayKey,
  habits,
  moments,
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
  onHabitLongPress,
  onAddHabit,
  onSaveMoment,
  onUpdateMoment,
  onDeleteMoment,
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
        onLongPress={onHabitLongPress}
        onAddHabit={onAddHabit}
        runningTimers={runningTimers}
      />

      <MemorableMomentsSection
        moments={moments}
        onSaveMoment={onSaveMoment}
        onUpdateMoment={onUpdateMoment}
        onDeleteMoment={onDeleteMoment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
