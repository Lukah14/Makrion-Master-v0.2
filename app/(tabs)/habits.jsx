import { useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { allHabitsData, memorableMoments as mockMoments } from '@/data/mockData';
import DateStrip from '@/components/habits/DateStrip';
import StrikeBadge from '@/components/common/StrikeBadge';
import HabitSubNav from '@/components/habits/HabitSubNav';
import { isHabitStrikeComplete, countStreak } from '@/lib/strikeHelpers';
import TodayView from '@/components/habits/TodayView';
import HabitsManageView from '@/components/habits/HabitsManageView';
import AddHabitWizard from '@/components/habits/AddHabitWizard';
import HabitDetailScreen from '@/components/habits/HabitDetailScreen';

export default function HabitsScreen() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [activeSubpage, setActiveSubpage] = useState('today');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [habits, setHabits] = useState(allHabitsData);
  const [moments, setMoments] = useState(mockMoments);
  const [showWizard, setShowWizard] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [detailHabit, setDetailHabit] = useState(null);
  const [detailInitialTab, setDetailInitialTab] = useState('Calendar');
  const [runningTimers, setRunningTimers] = useState({});

  const activeHabits = habits.filter((h) => !h.isArchived && !h.isPaused);
  const todayComplete = isHabitStrikeComplete(habits);
  const totalStreak = countStreak([
    todayComplete,
    ...habits.map((h) => (h.streak || 0) > 0),
  ]);

  const openDetail = useCallback((habit, tab = 'Calendar') => {
    setDetailHabit(habit);
    setDetailInitialTab(tab);
  }, []);

  const toggleHabit = useCallback((id) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        if (h.type === 'yesno') return { ...h, completed: !h.completed };
        if (h.type === 'numeric') return { ...h, current: h.current >= h.target ? 0 : h.target, completed: h.current < h.target };
        if (h.type === 'timer') return { ...h, current: h.current >= h.target ? 0 : h.target, completed: h.current < h.target };
        return h;
      })
    );
  }, []);

  const incrementHabit = useCallback((id) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id || h.type !== 'numeric') return h;
        const step = h.target >= 100 ? 100 : 1;
        const next = Math.min(h.current + step, h.target);
        return { ...h, current: next, completed: next >= h.target };
      })
    );
  }, []);

  const decrementHabit = useCallback((id) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id || h.type !== 'numeric') return h;
        const step = h.target >= 100 ? 100 : 1;
        const next = Math.max(h.current - step, 0);
        return { ...h, current: next, completed: next >= h.target };
      })
    );
  }, []);

  const toggleChecklistItem = useCallback((habitId, itemId) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId || h.type !== 'checklist') return h;
        const items = h.checklistItems.map((item) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        const completedCount = items.filter((i) => i.completed).length;
        return {
          ...h,
          checklistItems: items,
          current: completedCount,
          completed: completedCount >= items.length,
        };
      })
    );
  }, []);

  const startTimer = useCallback((id) => {
    setRunningTimers((prev) => ({ ...prev, [id]: true }));
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        return { ...h, current: Math.min(h.current + 1, h.target), completed: h.current + 1 >= h.target };
      })
    );
  }, []);

  const stopTimer = useCallback((id) => {
    setRunningTimers((prev) => ({ ...prev, [id]: false }));
  }, []);

  const resetTimer = useCallback((id) => {
    setRunningTimers((prev) => ({ ...prev, [id]: false }));
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, current: 0, completed: false } : h))
    );
  }, []);

  const handleSaveHabit = useCallback((habitData) => {
    setHabits((prev) => {
      const existing = prev.find((h) => h.id === habitData.id);
      if (existing) {
        return prev.map((h) => (h.id === habitData.id ? { ...h, ...habitData } : h));
      }
      return [...prev, habitData];
    });
    setShowWizard(false);
    setEditingHabit(null);
  }, []);

  const handleEditHabit = useCallback((habit) => {
    setEditingHabit(habit);
    setShowWizard(true);
    setDetailHabit(null);
  }, []);

  const handleSaveEditFromDetail = useCallback((updatedHabit) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === updatedHabit.id ? { ...h, ...updatedHabit } : h))
    );
    setDetailHabit(null);
  }, []);

  const handleDuplicateHabit = useCallback((habit) => {
    const duplicate = {
      ...habit,
      id: `h-${Date.now()}`,
      name: `${habit.name} (copy)`,
      streak: 0,
      bestStreak: 0,
      current: 0,
      completed: false,
      completionHistory: [],
      notes: [],
    };
    setHabits((prev) => [...prev, duplicate]);
  }, []);

  const handleArchiveHabit = useCallback((habit) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === habit.id ? { ...h, isArchived: !h.isArchived } : h))
    );
    setDetailHabit(null);
  }, []);

  const handleDeleteHabit = useCallback((habit) => {
    setHabits((prev) => prev.filter((h) => h.id !== habit.id));
    setDetailHabit(null);
  }, []);

  const handleRestartHabit = useCallback((habit) => {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? { ...h, completionHistory: [], streak: 0, completed: false, current: 0 }
          : h
      )
    );
  }, []);

  const handleTogglePause = useCallback((habit) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === habit.id ? { ...h, isPaused: !h.isPaused } : h))
    );
  }, []);

  const handleSaveMoment = useCallback((momentData) => {
    const newMoment = {
      id: `m-${Date.now()}`,
      date: selectedDate.toISOString().split('T')[0],
      text: momentData.text,
      mood: getMoodEmoji(momentData.moodRating),
      type: 'note',
      moodRating: momentData.moodRating,
      photoUrl: momentData.photoUrl,
    };
    setMoments((prev) => [newMoment, ...prev]);
  }, [selectedDate]);

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
            <StrikeBadge count={totalStreak} color={Colors.streakFire} />
            <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
              <Search size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <DateStrip selectedDate={selectedDate} onDateChange={setSelectedDate} />

        <HabitSubNav
          activeSubpage={activeSubpage}
          onChangeSubpage={setActiveSubpage}
        />

        {activeSubpage === 'today' ? (
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
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
