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
import StrikeBadge from '@/components/common/StrikeBadge';
import { useDomainStreaksContext } from '@/context/DomainStreaksContext';
import HabitSubNav from '@/components/habits/HabitSubNav';
import TodayView from '@/components/habits/TodayView';
import MemorableMomentsSection from '@/components/habits/MemorableMomentsSection';
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
import {
  normalizeNumericConditionType,
  getNumericTargetValue,
  isNumericHabitSatisfied,
  numericQuickCompleteValue,
  habitCountsTowardDailyCompletion,
  NUMERIC_CONDITION,
} from '@/lib/habitNumericCondition';
import {
  listHabitCompletionsForHabit,
  listHabitCompletionsSince,
  removeHabitCompletion,
  clearHabitCompletionsForHabit,
} from '@/services/habitService';

export default function HabitsScreen() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const { user } = useAuth();

  const { dateKey, bumpCalendarRefresh } = useNutritionDate();
  const { currentStreak } = useDomainStreaksContext();
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
    reload: reloadHabits,
    loading: habitsLoading,
    error: habitsError,
  } = useHabits(dateKey, runningTimers);

  const {
    dailyMoment,
    loading: momentsLoading,
    error: momentsError,
    upsertDaily,
    clearDaily,
  } = useMemorableMoments(dateKey);

  const [activeSubpage, setActiveSubpage] = useState('today');
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  /** Fresh Firestore template for the open detail (stable ref until habits reload). */
  const detailHabitForScreen = useMemo(() => {
    if (!detailHabit?.id) return null;
    return habitTemplates.find((h) => h.id === detailHabit.id) || detailHabit;
  }, [detailHabit, habitTemplates]);

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

  const habitsForCompletionTally = habitsForSelectedDay.filter(habitCountsTowardDailyCompletion);
  const todayComplete =
    habitsForCompletionTally.length > 0 &&
    habitsForCompletionTally.every((h) => h.completed);

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
      const cond = normalizeNumericConditionType(habit);
      const tgt = getNumericTargetValue(habit);
      const stepBase = tgt != null && Number(tgt) >= 100 ? 100 : 1;
      const base =
        cond === NUMERIC_CONDITION.ANY_VALUE
          ? habit.numericDayHasEntry && habit.current != null
            ? Number(habit.current)
            : 0
          : Number(habit.current) || 0;
      const next = base + stepBase;
      const completed = isNumericHabitSatisfied(next, cond, tgt);
      await saveDayCompletion(id, {
        progressValue: next,
        isCompleted: cond === NUMERIC_CONDITION.ANY_VALUE ? false : completed,
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
      const cond = normalizeNumericConditionType(habit);
      const tgt = getNumericTargetValue(habit);
      const stepBase = tgt != null && Number(tgt) >= 100 ? 100 : 1;
      const base =
        cond === NUMERIC_CONDITION.ANY_VALUE
          ? habit.numericDayHasEntry && habit.current != null
            ? Number(habit.current)
            : 0
          : Number(habit.current) || 0;
      const next = Math.max(base - stepBase, 0);
      const completed = isNumericHabitSatisfied(next, cond, tgt);
      await saveDayCompletion(id, {
        progressValue: next,
        isCompleted: cond === NUMERIC_CONDITION.ANY_VALUE ? false : completed,
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
      const cond = normalizeNumericConditionType(habit);
      const tgt = getNumericTargetValue(habit);
      if (cond === NUMERIC_CONDITION.ANY_VALUE) {
        if (!user?.uid || !dateKey) return;
        if (habit.numericDayHasEntry) {
          await removeHabitCompletion(user.uid, dateKey, id);
          await reloadHabits();
        } else {
          await saveDayCompletion(id, {
            progressValue: 0,
            isCompleted: false,
            trackingStatus: null,
          });
        }
        bumpCalendarRefresh();
        return;
      }
      const cur = Number(habit.current) || 0;
      const done = isNumericHabitSatisfied(cur, cond, tgt);
      if (done) {
        await saveDayCompletion(id, {
          progressValue: 0,
          isCompleted: false,
          trackingStatus: null,
        });
      } else {
        const v = numericQuickCompleteValue(cond, tgt, cur);
        const completed = isNumericHabitSatisfied(v, cond, tgt);
        await saveDayCompletion(id, {
          progressValue: v,
          isCompleted: completed,
          trackingStatus: null,
        });
      }
      bumpCalendarRefresh();
    },
    [habits, saveDayCompletion, bumpCalendarRefresh, user?.uid, dateKey, reloadHabits],
  );

  const setNumericCurrent = useCallback(
    async (id, value) => {
      const habit = habits.find((h) => h.id === id);
      if (!habit || habit.type !== 'numeric') return;
      const cond = normalizeNumericConditionType(habit);
      const tgt = getNumericTargetValue(habit);
      const raw = Number(value);
      const v = Number.isFinite(raw)
        ? Math.max(0, Math.min(Math.floor(raw), 9_999_999))
        : 0;
      const completed = isNumericHabitSatisfied(v, cond, tgt);
      await saveDayCompletion(id, {
        progressValue: v,
        isCompleted: cond === NUMERIC_CONDITION.ANY_VALUE ? false : completed,
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
    async (patch) => {
      if (!patch?.id) return;
      const { id, ...changes } = patch;
      try {
        await editHabit(id, changes);
        Alert.alert('Saved', 'Your habit was updated.');
      } catch (e) {
        const msg = e?.message || 'Could not save habit.';
        Alert.alert('Could not save', msg);
      }
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
      try {
        await removeHabit(habitId);
        setDetailHabit((prev) => (prev?.id === habitId ? null : prev));
        return true;
      } catch (e) {
        Alert.alert('Could not delete', e?.message || 'Try again.');
        return false;
      }
    },
    [removeHabit],
  );

  const handleRestartHabit = useCallback(
    async (habit) => {
      const habitId = typeof habit === 'string' ? habit : habit.id;
      if (!user?.uid) {
        Alert.alert('Sign in required', 'You must be signed in to reset progress.');
        return;
      }
      try {
        await clearHabitCompletionsForHabit(user.uid, habitId);
        await editHabit(habitId, {
          streak: 0,
          current: 0,
          completed: false,
          paused: false,
          isPaused: false,
        });
        const rows = await listHabitCompletionsForHabit(user.uid, habitId);
        setDetailCompletionRows(rows);
        bumpCalendarRefresh();
        Alert.alert('Progress reset', 'Completion history for this habit was cleared.');
      } catch (e) {
        Alert.alert('Could not reset', e?.message || 'Try again.');
      }
    },
    [user?.uid, editHabit, bumpCalendarRefresh],
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
        await upsertDaily({
          text: momentData.text?.trim() ? momentData.text.trim() : '',
          moodRating: momentData.moodRating ?? null,
          photoUrl: momentData.photoUrl ?? null,
        });
        bumpCalendarRefresh();
      } catch (e) {
        Alert.alert('Could not save', e?.message || 'Try again.');
        throw e;
      }
    },
    [upsertDaily, bumpCalendarRefresh],
  );

  const handleClearMoment = useCallback(async () => {
    try {
      await clearDaily();
      bumpCalendarRefresh();
    } catch (e) {
      Alert.alert('Could not clear', e?.message || 'Try again.');
    }
  }, [clearDaily, bumpCalendarRefresh]);

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
            <StrikeBadge count={currentStreak} color="#AF52DE" />
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
          <View>
            {habitsLoading ? (
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
              <View style={styles.habitsEmptyDay}>
                <Text style={styles.habitsEmptyDayTitle}>
                  {dateKey === today ? 'No habits scheduled today' : 'No habits scheduled this day'}
                </Text>
                <Text style={styles.habitsEmptyDayMessage}>
                  Pick another date or adjust your habit schedules. You can still log a memorable moment below.
                </Text>
              </View>
            ) : (
              <TodayView
                dateKey={dateKey}
                todayKey={today}
                habits={habitsForTodayView}
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
                runningTimers={runningTimers}
              />
            )}
            <MemorableMomentsSection
              dateKey={dateKey}
              todayKey={today}
              dailyMoment={dailyMoment}
              loading={momentsLoading}
              error={momentsError}
              onSave={handleSaveMoment}
              onClear={handleClearMoment}
            />
          </View>
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

      {detailHabitForScreen && (
        <HabitDetailScreen
          habit={detailHabitForScreen}
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
  habitsEmptyDay: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    paddingVertical: 22,
    paddingHorizontal: 20,
    marginBottom: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  habitsEmptyDayTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  habitsEmptyDayMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
