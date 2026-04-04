import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ClipboardList } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { useHabits } from '@/hooks/useHabits';
import { useMemorableMoments } from '@/hooks/useMemorableMoments';
import { useNutritionDate } from '@/context/NutritionDateContext';
import CalendarModal from '@/components/calendar/CalendarModal';
import SelectedDateBar from '@/components/calendar/SelectedDateBar';
import { todayDateKey, addDaysToDateKey } from '@/lib/dateKey';
import { moodRatingToEmoji } from '@/lib/moodEmoji';
import StrikeBadge from '@/components/common/StrikeBadge';
import HabitSubNav from '@/components/habits/HabitSubNav';
import TodayView from '@/components/habits/TodayView';
import HabitsManageView from '@/components/habits/HabitsManageView';
import AddHabitWizard from '@/components/habits/AddHabitWizard';
import HabitDetailScreen from '@/components/habits/HabitDetailScreen';
import EmptyState from '@/components/common/EmptyState';
import { getActiveHabitsForDate } from '@/lib/habitSchedule';
import {
  timerTargetToSeconds,
  elapsedSecondsToDisplay,
  dateKeysSuccessfulFromCompletions,
} from '@/lib/habitDayState';
import { listHabitCompletionsForHabit, listHabitCompletionsSince } from '@/services/habitService';

export default function HabitsScreen() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const { user } = useAuth();

  const { dateKey, bumpCalendarRefresh } = useNutritionDate();
  const today = todayDateKey();
  const [runningTimers, setRunningTimers] = useState({});
  const timerSegmentsRef = useRef({});
  const [, setTimerTick] = useState(0);

  const {
    habits,
    habitTemplates,
    addHabit,
    editHabit,
    removeHabit,
    toggleCompletion,
    saveDayCompletion,
    loading: habitsLoading,
    error: habitsError,
  } = useHabits(dateKey, runningTimers);

  const {
    moments: firebaseMoments,
    add: addMoment,
    edit: editMoment,
    remove: removeMoment,
  } = useMemorableMoments(dateKey);

  const [activeSubpage, setActiveSubpage] = useState('today');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const moments = firebaseMoments.map((m) => mapFirebaseMomentForUi(m, dateKey));
  const [showWizard, setShowWizard] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [detailHabit, setDetailHabit] = useState(null);
  const [detailInitialTab, setDetailInitialTab] = useState('Calendar');
  const [detailCompletionRows, setDetailCompletionRows] = useState([]);
  const [manageBulkRows, setManageBulkRows] = useState([]);
  const [manageBulkLoading, setManageBulkLoading] = useState(false);

  const manageSinceKey = useMemo(() => addDaysToDateKey(today, -120), [today]);

  useEffect(() => {
    if (!user?.uid || activeSubpage !== 'manage') {
      setManageBulkRows([]);
      setManageBulkLoading(false);
      return;
    }
    let cancelled = false;
    setManageBulkLoading(true);
    (async () => {
      try {
        const rows = await listHabitCompletionsSince(user.uid, manageSinceKey);
        if (!cancelled) setManageBulkRows(rows);
      } catch (e) {
        console.warn('[Habits] manage completions load failed', e?.message);
        if (!cancelled) setManageBulkRows([]);
      } finally {
        if (!cancelled) setManageBulkLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, activeSubpage, manageSinceKey]);

  useEffect(() => {
    if (!user?.uid || !detailHabit?.id) {
      setDetailCompletionRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await listHabitCompletionsForHabit(user.uid, detailHabit.id);
        if (!cancelled) setDetailCompletionRows(rows);
      } catch {
        if (!cancelled) setDetailCompletionRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, detailHabit?.id]);

  const detailHabitTemplate = useMemo(() => {
    if (!detailHabit) return null;
    return habitTemplates.find((h) => h.id === detailHabit.id) || detailHabit;
  }, [habitTemplates, detailHabit]);

  const detailCompletionHistory = useMemo(() => {
    if (!detailHabitTemplate) return [];
    return dateKeysSuccessfulFromCompletions(detailHabitTemplate, detailCompletionRows);
  }, [detailHabitTemplate, detailCompletionRows]);

  const activeHabits = habits.filter((h) => !h.archived && !h.isArchived);
  const habitsForSelectedDay = useMemo(
    () => getActiveHabitsForDate(activeHabits, dateKey || today),
    [activeHabits, dateKey, today],
  );

  const getTimerElapsedSeconds = useCallback((habitId, habitRow) => {
    const seg = timerSegmentsRef.current[habitId];
    const fromDoc = Number(habitRow?._timerElapsedSec) || 0;
    if (!seg) return fromDoc;
    if (seg.segmentStart == null) return seg.baseSec;
    return seg.baseSec + Math.floor((Date.now() - seg.segmentStart) / 1000);
  }, []);

  const habitsForManage = useMemo(() => {
    const byHabit = new Map();
    for (const row of manageBulkRows) {
      const id = row.habitId;
      if (!id) continue;
      if (!byHabit.has(id)) byHabit.set(id, []);
      byHabit.get(id).push(row);
    }
    return activeHabits.map((h) => {
      const template = habitTemplates.find((t) => t.id === h.id) || h;
      const rows = byHabit.get(h.id) || [];
      const completionHistory = dateKeysSuccessfulFromCompletions(template, rows);
      return { ...h, completionHistory };
    });
  }, [activeHabits, habitTemplates, manageBulkRows]);

  const habitsForTodayView = useMemo(() => {
    return habitsForSelectedDay.map((h) => {
      if (h.type !== 'timer' || !runningTimers[h.id]) return h;
      const elapsed = getTimerElapsedSeconds(h.id, h);
      const display = elapsedSecondsToDisplay(elapsed, h);
      const targetSec = timerTargetToSeconds(h);
      const done = elapsed >= targetSec || h.completed;
      return {
        ...h,
        current: Math.round(display * 100) / 100,
        completed: done,
        _timerElapsedSec: elapsed,
      };
    });
  }, [habitsForSelectedDay, runningTimers, getTimerElapsedSeconds]);

  useEffect(() => {
    const any = Object.values(runningTimers).some(Boolean);
    if (!any) return undefined;
    const id = setInterval(() => setTimerTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [runningTimers]);

  const todayComplete =
    habitsForSelectedDay.length > 0 && habitsForSelectedDay.every((h) => h.completed);

  const openDetail = useCallback(
    (habit, tab = 'Calendar') => {
      const template = habitTemplates.find((h) => h.id === habit.id);
      setDetailHabit(template ? { ...template, ...habit } : habit);
      setDetailInitialTab(tab);
    },
    [habitTemplates],
  );

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
      const target = Math.max(Number(habit.target) || 1, 1);
      const step = target >= 100 ? 100 : 1;
      const cur = Number(habit.current) || 0;
      const next = Math.min(cur + step, target);
      await saveDayCompletion(id, {
        progressValue: next,
        isCompleted: next >= target,
        trackingStatus: null,
      });
      bumpCalendarRefresh();
    },
    [habits, saveDayCompletion, bumpCalendarRefresh],
  );

  const decrementHabit = useCallback(
    async (id) => {
      const habit = habits.find((h) => h.id === id);
      if (!habit || habit.type !== 'numeric') return;
      const target = Math.max(Number(habit.target) || 1, 1);
      const step = target >= 100 ? 100 : 1;
      const cur = Number(habit.current) || 0;
      const next = Math.max(cur - step, 0);
      await saveDayCompletion(id, {
        progressValue: next,
        isCompleted: next >= target,
        trackingStatus: null,
      });
      bumpCalendarRefresh();
    },
    [habits, saveDayCompletion, bumpCalendarRefresh],
  );

  const numericQuickComplete = useCallback(
    async (id) => {
      const habit = habits.find((h) => h.id === id);
      if (!habit || habit.type !== 'numeric') return;
      const target = Number(habit.target) || 1;
      const cur = Number(habit.current) || 0;
      if (cur >= target) {
        await saveDayCompletion(id, {
          progressValue: 0,
          isCompleted: false,
          trackingStatus: null,
        });
      } else {
        await saveDayCompletion(id, {
          progressValue: target,
          isCompleted: true,
          trackingStatus: null,
        });
      }
      bumpCalendarRefresh();
    },
    [habits, saveDayCompletion, bumpCalendarRefresh],
  );

  const setNumericCurrent = useCallback(
    async (id, value) => {
      const habit = habits.find((h) => h.id === id);
      if (!habit || habit.type !== 'numeric') return;
      const target = Number(habit.target) || 1;
      const v = Math.max(0, Math.min(Math.floor(Number(value)) || 0, 9_999_999));
      await saveDayCompletion(id, {
        progressValue: v,
        isCompleted: v >= target,
        trackingStatus: null,
      });
      bumpCalendarRefresh();
    },
    [habits, saveDayCompletion, bumpCalendarRefresh],
  );

  const toggleChecklistItem = useCallback(
    async (habitId, itemId) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit || habit.type !== 'checklist') return;
      const items = (habit.checklistItems || []).map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item,
      );
      const completedCount = items.filter((i) => i.completed).length;
      const total = items.length;
      const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
      const checklistState = items.map((i) => ({ id: String(i.id), completed: !!i.completed }));
      await saveDayCompletion(habitId, {
        checklistState,
        completionPercent: pct,
        isCompleted: total > 0 && completedCount >= total,
        trackingStatus: null,
      });
      bumpCalendarRefresh();
    },
    [habits, saveDayCompletion, bumpCalendarRefresh],
  );

  const persistTimerSeconds = useCallback(
    async (id, habitRow, elapsedSec) => {
      const targetSec = timerTargetToSeconds(habitRow);
      const sec = Math.max(0, Math.floor(elapsedSec));
      await saveDayCompletion(id, {
        progressValue: sec,
        isCompleted: sec >= targetSec,
        trackingStatus: null,
      });
      bumpCalendarRefresh();
    },
    [saveDayCompletion, bumpCalendarRefresh],
  );

  const startOrResumeTimer = useCallback(
    (id) => {
      const habit = habits.find((h) => h.id === id && h.type === 'timer');
      if (!habit) return;
      const cur = getTimerElapsedSeconds(id, habit);
      timerSegmentsRef.current[id] = { baseSec: cur, segmentStart: Date.now() };
      setRunningTimers((prev) => ({ ...prev, [id]: true }));
    },
    [habits, getTimerElapsedSeconds],
  );

  const pauseTimer = useCallback(
    async (id) => {
      const habit = habits.find((h) => h.id === id);
      if (!habit || habit.type !== 'timer') return;
      const elapsed = getTimerElapsedSeconds(id, habit);
      timerSegmentsRef.current[id] = { baseSec: elapsed, segmentStart: null };
      setRunningTimers((prev) => ({ ...prev, [id]: false }));
      await persistTimerSeconds(id, habit, elapsed);
    },
    [habits, getTimerElapsedSeconds, persistTimerSeconds],
  );

  const stopTimer = useCallback(
    async (id) => {
      const habit = habits.find((h) => h.id === id);
      if (!habit || habit.type !== 'timer') return;
      const elapsed = getTimerElapsedSeconds(id, habit);
      timerSegmentsRef.current[id] = { baseSec: elapsed, segmentStart: null };
      setRunningTimers((prev) => ({ ...prev, [id]: false }));
      await persistTimerSeconds(id, habit, elapsed);
    },
    [habits, getTimerElapsedSeconds, persistTimerSeconds],
  );

  const resetTimer = useCallback(
    async (id) => {
      timerSegmentsRef.current[id] = { baseSec: 0, segmentStart: null };
      setRunningTimers((prev) => ({ ...prev, [id]: false }));
      await saveDayCompletion(id, {
        progressValue: 0,
        isCompleted: false,
        trackingStatus: null,
      });
      bumpCalendarRefresh();
    },
    [saveDayCompletion, bumpCalendarRefresh],
  );

  const handleSaveHabit = useCallback(
    async (habitData) => {
      try {
        if (editingHabit) {
          await editHabit(editingHabit.id, habitData);
        } else {
          await addHabit(habitData);
        }
        setShowWizard(false);
        setEditingHabit(null);
        bumpCalendarRefresh();
      } catch (e) {
        const msg = e?.message || 'Could not save habit.';
        console.warn('[Habits] save failed', msg);
        Alert.alert('Could not save', msg);
      }
    },
    [editingHabit, editHabit, addHabit, bumpCalendarRefresh],
  );

  const handleOpenFullEditorFromDetail = useCallback((habit) => {
    const t = habitTemplates.find((h) => h.id === habit.id) || habit;
    setDetailHabit(null);
    setEditingHabit(t);
    setShowWizard(true);
  }, [habitTemplates]);

  const handleSaveEditFromDetail = useCallback(
    async (updated) => {
      if (!updated?.id) return;
      await editHabit(updated.id, {
        name: updated.name,
        description: updated.description,
      });
      setDetailHabit(null);
    },
    [editHabit],
  );

  const handleDuplicateHabit = useCallback(
    async (habit) => {
      const { id, dayTrackingStatus, _timerElapsedSec, _timerTargetSec, completed, ...rest } = habit;
      await addHabit({
        ...rest,
        name: `${rest.name} (copy)`,
        current: 0,
        completed: false,
      });
    },
    [addHabit],
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
      await editHabit(habitId, { paused: false, isPaused: false });
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
        const text = momentData.text?.trim() ? momentData.text.trim() : null;
        await addMoment({
          type: 'text',
          text,
          emoji: moodRatingToEmoji(momentData.moodRating),
          moodRating: momentData.moodRating ?? null,
          photoUrl: momentData.photoUrl || null,
        });
        bumpCalendarRefresh();
      } catch (e) {
        Alert.alert('Could not save', e?.message || 'Try again.');
        throw e;
      }
    },
    [addMoment, bumpCalendarRefresh],
  );

  const handleUpdateMoment = useCallback(
    async (momentId, updates) => {
      try {
        const text = updates.text?.trim() ? updates.text.trim() : null;
        await editMoment(momentId, {
          text,
          emoji: moodRatingToEmoji(updates.moodRating),
          moodRating: updates.moodRating ?? null,
          photoUrl: updates.photoUrl !== undefined ? updates.photoUrl : undefined,
        });
        bumpCalendarRefresh();
      } catch (e) {
        Alert.alert('Could not update', e?.message || 'Try again.');
        throw e;
      }
    },
    [editMoment, bumpCalendarRefresh],
  );

  const handleDeleteMoment = useCallback(
    async (momentId) => {
      try {
        await removeMoment(momentId);
        bumpCalendarRefresh();
      } catch (e) {
        Alert.alert('Could not delete', e?.message || 'Try again.');
        throw e;
      }
    },
    [removeMoment, bumpCalendarRefresh],
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

        {habitsError ? (
          <Text style={styles.errorText}>{habitsError}</Text>
        ) : null}

        {activeSubpage === 'today' ? (
          habitsLoading ? (
            <ActivityIndicator style={styles.loader} color={Colors.primary} />
          ) : activeHabits.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No habits yet"
              message="Create your first habit to start tracking"
              actionLabel="Create Habit"
              onAction={() => setShowWizard(true)}
            />
          ) : habitsForSelectedDay.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nothing scheduled this day"
              message="No habits are due on the selected date. Pick another day or adjust habit schedules."
            />
          ) : (
            <TodayView
              dateKey={dateKey}
              todayKey={today}
              habits={habitsForTodayView}
              moments={moments}
              onToggle={toggleHabit}
              onIncrement={incrementHabit}
              onDecrement={decrementHabit}
              onNumericQuickComplete={numericQuickComplete}
              onSetNumericCurrent={setNumericCurrent}
              onToggleChecklistItem={toggleChecklistItem}
              onTimerStart={startOrResumeTimer}
              onTimerPause={pauseTimer}
              onTimerStop={stopTimer}
              onTimerReset={resetTimer}
              onHabitLongPress={(habit) => openDetail(habit, 'Calendar')}
              onAddHabit={() => setShowWizard(true)}
              onSaveMoment={handleSaveMoment}
              onUpdateMoment={handleUpdateMoment}
              onDeleteMoment={handleDeleteMoment}
              runningTimers={runningTimers}
            />
          )
        ) : habitsLoading || manageBulkLoading ? (
          <ActivityIndicator style={styles.loader} color={Colors.primary} />
        ) : (
          <HabitsManageView
            habits={habitsForManage}
            onDuplicate={handleDuplicateHabit}
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
          onDelete={handleDeleteHabit}
          onRestart={handleRestartHabit}
          onOpenFullEditor={handleOpenFullEditorFromDetail}
          completionHistory={detailCompletionHistory}
          completionRows={detailCompletionRows}
        />
      )}

      <CalendarModal visible={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </SafeAreaView>
  );
}

function mapFirebaseMomentForUi(m, dateKey) {
  let text = (m.text && String(m.text)) || '';
  let moodRating =
    typeof m.moodRating === 'number' && m.moodRating >= 1 && m.moodRating <= 10
      ? m.moodRating
      : null;
  if (moodRating == null && text) {
    const legacy = text.trim().match(/^Mood:\s*(\d{1,2})\/10$/i);
    if (legacy) {
      const n = parseInt(legacy[1], 10);
      if (n >= 1 && n <= 10) {
        moodRating = n;
        text = '';
      }
    }
  }
  return {
    id: m.id,
    text,
    mood: m.emoji || '✨',
    moodRating,
    date: m.dateKey || dateKey,
    photoUrl: m.photoUrl || null,
  };
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
  loader: {
    marginVertical: 24,
  },
  errorText: {
    color: Colors.error || '#b91c1c',
    marginBottom: 12,
    fontFamily: 'PlusJakartaSans-Medium',
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
