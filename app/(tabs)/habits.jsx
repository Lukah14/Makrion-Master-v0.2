import { useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ClipboardList } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { useHabits } from '@/hooks/useHabits';
import { useMemorableMoments } from '@/hooks/useMemorableMoments';
import { useNutritionDate } from '@/context/NutritionDateContext';
import CalendarModal from '@/components/calendar/CalendarModal';
import SelectedDateBar from '@/components/calendar/SelectedDateBar';
import { todayDateKey } from '@/lib/dateKey';
import StrikeBadge from '@/components/common/StrikeBadge';
import HabitSubNav from '@/components/habits/HabitSubNav';
import TodayView from '@/components/habits/TodayView';
import HabitsManageView from '@/components/habits/HabitsManageView';
import AddHabitWizard from '@/components/habits/AddHabitWizard';
import HabitDetailScreen from '@/components/habits/HabitDetailScreen';
import EmptyState from '@/components/common/EmptyState';

export default function HabitsScreen() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const { dateKey, bumpCalendarRefresh } = useNutritionDate();
  const today = todayDateKey();
  const {
    habits,
    completions,
    loading: habitsLoading,
    addHabit,
    editHabit,
    removeHabit,
    toggleCompletion,
    reload: reloadHabits,
  } = useHabits(dateKey);

  const { moments: firebaseMoments, add: addMoment } = useMemorableMoments(dateKey);

  const [activeSubpage, setActiveSubpage] = useState('today');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const moments = firebaseMoments.map((m) => ({
    id: m.id,
    text: m.text || '',
    mood: m.emoji || '✨',
    moodRating: null,
    date: m.dateKey || dateKey,
  }));
  const [showWizard, setShowWizard] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [detailHabit, setDetailHabit] = useState(null);
  const [detailInitialTab, setDetailInitialTab] = useState('Calendar');
  const [runningTimers, setRunningTimers] = useState({});

  const activeHabits = habits.filter((h) => !h.archived && !h.isArchived);
  const todayComplete =
    activeHabits.length > 0 &&
    activeHabits.every((h) => completions[h.id]?.completed);

  const openDetail = useCallback((habit, tab = 'Calendar') => {
    setDetailHabit(habit);
    setDetailInitialTab(tab);
  }, []);

  const toggleHabit = useCallback(
    async (id) => {
      await toggleCompletion(id);
      bumpCalendarRefresh();
    },
    [toggleCompletion, bumpCalendarRefresh],
  );

  const incrementHabit = useCallback(
    async (id) => {
      const habit = habits.find((h) => h.id === id);
      if (!habit || habit.type !== 'numeric') return;
      const step = habit.target >= 100 ? 100 : 1;
      const next = Math.min((habit.current || 0) + step, habit.target);
      await editHabit(id, { current: next, completed: next >= habit.target });
      bumpCalendarRefresh();
    },
    [habits, editHabit, bumpCalendarRefresh],
  );

  const decrementHabit = useCallback(
    async (id) => {
      const habit = habits.find((h) => h.id === id);
      if (!habit || habit.type !== 'numeric') return;
      const step = habit.target >= 100 ? 100 : 1;
      const next = Math.max((habit.current || 0) - step, 0);
      await editHabit(id, { current: next, completed: next >= habit.target });
      bumpCalendarRefresh();
    },
    [habits, editHabit, bumpCalendarRefresh],
  );

  const toggleChecklistItem = useCallback(
    async (habitId, itemId) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit || habit.type !== 'checklist') return;
      const items = habit.checklistItems.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item,
      );
      const completedCount = items.filter((i) => i.completed).length;
      await editHabit(habitId, {
        checklistItems: items,
        current: completedCount,
        completed: completedCount >= items.length,
      });
      bumpCalendarRefresh();
    },
    [habits, editHabit, bumpCalendarRefresh],
  );

  const startTimer = useCallback(
    async (id) => {
      setRunningTimers((prev) => ({ ...prev, [id]: true }));
      const habit = habits.find((h) => h.id === id);
      if (!habit) return;
      const next = Math.min((habit.current || 0) + 1, habit.target);
      await editHabit(id, { current: next, completed: next >= habit.target });
      bumpCalendarRefresh();
    },
    [habits, editHabit, bumpCalendarRefresh],
  );

  const stopTimer = useCallback((id) => {
    setRunningTimers((prev) => ({ ...prev, [id]: false }));
  }, []);

  const resetTimer = useCallback(
    async (id) => {
      setRunningTimers((prev) => ({ ...prev, [id]: false }));
      await editHabit(id, { current: 0, completed: false });
      bumpCalendarRefresh();
    },
    [editHabit, bumpCalendarRefresh],
  );

  const handleSaveHabit = useCallback(
    async (habitData) => {
      if (editingHabit) {
        await editHabit(editingHabit.id, habitData);
      } else {
        await addHabit(habitData);
      }
      setShowWizard(false);
      setEditingHabit(null);
    },
    [editingHabit, editHabit, addHabit],
  );

  const handleEditHabit = useCallback((habit) => {
    setEditingHabit(habit);
    setShowWizard(true);
    setDetailHabit(null);
  }, []);

  const handleSaveEditFromDetail = useCallback(
    async (habitId, changes) => {
      await editHabit(habitId, changes);
      setDetailHabit(null);
    },
    [editHabit],
  );

  const handleDuplicateHabit = useCallback(
    async (habit) => {
      const { id, ...rest } = habit;
      await addHabit({ ...rest, name: `${rest.name} (copy)` });
    },
    [addHabit],
  );

  const handleArchiveHabit = useCallback(
    async (habit) => {
      const habitId = typeof habit === 'string' ? habit : habit.id;
      await editHabit(habitId, { archived: true });
      setDetailHabit(null);
    },
    [editHabit],
  );

  const handleDeleteHabit = useCallback(
    async (habit) => {
      const habitId = typeof habit === 'string' ? habit : habit.id;
      await removeHabit(habitId);
      setDetailHabit(null);
    },
    [removeHabit],
  );

  const handleRestartHabit = useCallback(
    async (habit) => {
      const habitId = typeof habit === 'string' ? habit : habit.id;
      await editHabit(habitId, { paused: false, archived: false });
    },
    [editHabit],
  );

  const handleTogglePause = useCallback(
    async (habit) => {
      const habitId = typeof habit === 'string' ? habit : habit.id;
      const found = habits.find((h) => h.id === habitId);
      if (found) await editHabit(habitId, { paused: !found.paused, isPaused: !found.isPaused });
    },
    [habits, editHabit],
  );

  const handleSaveMoment = useCallback(
    async (momentData) => {
      try {
        await addMoment({
          type: 'text',
          text: momentData.text || (momentData.moodRating ? `Mood: ${momentData.moodRating}/10` : ''),
          emoji: getMoodEmoji(momentData.moodRating),
          photoUrl: momentData.photoUrl ?? null,
        });
        bumpCalendarRefresh();
      } catch {
        // optional toast
      }
    },
    [addMoment, bumpCalendarRefresh],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>
            {activeSubpage === 'today' ? 'Today' : 'Habits'}
          </Text>
          <View style={styles.headerActions}>
            <StrikeBadge count={todayComplete ? 1 : 0} color="#AF52DE" />
          </View>
        </View>

        <SelectedDateBar
          dateKey={dateKey}
          onOpenCalendar={() => setCalendarOpen(true)}
          subtitle={dateKey === today ? 'Habits for today' : 'Habits for selected day'}
        />

        <HabitSubNav
          activeSubpage={activeSubpage}
          onChangeSubpage={setActiveSubpage}
        />

        {activeSubpage === 'today' ? (
          activeHabits.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No habits yet"
              message="Create your first habit to start tracking"
              actionLabel="Create Habit"
              onAction={() => setShowWizard(true)}
            />
          ) : (
            <TodayView
              habits={activeHabits}
              moments={moments}
              onToggle={toggleHabit}
              onIncrement={incrementHabit}
              onDecrement={decrementHabit}
              onToggleChecklistItem={toggleChecklistItem}
              onTimerStart={startTimer}
              onTimerStop={stopTimer}
              onTimerReset={resetTimer}
              onHabitLongPress={(habit) => openDetail(habit, 'Calendar')}
              onAddHabit={() => setShowWizard(true)}
              onSaveMoment={handleSaveMoment}
              runningTimers={runningTimers}
            />
          )
        ) : (
          <HabitsManageView
            habits={habits}
            onEdit={handleEditHabit}
            onDuplicate={handleDuplicateHabit}
            onArchive={handleArchiveHabit}
            onDelete={handleDeleteHabit}
            onTogglePause={handleTogglePause}
            onAddHabit={() => setShowWizard(true)}
            onOpenDetail={openDetail}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => { setEditingHabit(null); setShowWizard(true); }}
        activeOpacity={0.8}
      >
        <Plus size={24} color={Colors.onPrimary} />
      </TouchableOpacity>

      <AddHabitWizard
        visible={showWizard}
        onClose={() => { setShowWizard(false); setEditingHabit(null); }}
        onSave={handleSaveHabit}
        editingHabit={editingHabit}
      />

      {detailHabit && (
        <HabitDetailScreen
          habit={detailHabit}
          initialTab={detailInitialTab}
          onBack={() => setDetailHabit(null)}
          onSaveEdit={handleSaveEditFromDetail}
          onArchive={handleArchiveHabit}
          onDelete={handleDeleteHabit}
          onRestart={handleRestartHabit}
        />
      )}

      <CalendarModal visible={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </SafeAreaView>
  );
}

function getMoodEmoji(rating) {
  if (!rating) return '\uD83D\uDE10';
  if (rating <= 2) return '\uD83D\uDE1E';
  if (rating <= 4) return '\uD83D\uDE15';
  if (rating <= 6) return '\uD83D\uDE10';
  if (rating <= 8) return '\uD83D\uDE0A';
  return '\uD83E\uDD29';
}

const createStyles = (Colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Layout.screenPadding,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
});
