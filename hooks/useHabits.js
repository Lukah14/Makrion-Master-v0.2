import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { todayDateKey } from '@/lib/dateKey';
import {
  mergeHabitWithDayCompletion,
  deriveDayTrackingStatus,
} from '@/lib/habitDayState';
import {
  listHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  logHabitCompletion,
  listHabitCompletions,
  removeHabitCompletion,
  saveHabitDayCompletion,
} from '@/services/habitService';

/**
 * @param {string} dateKey  Selected calendar day
 * @param {Record<string, boolean>} [runningTimers]  habitId -> timer running (for status + merge display)
 */
export function useHabits(dateKey, runningTimers = {}) {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) {
      setHabits([]);
      setCompletions({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setError(null);
      const [habitList, completionList] = await Promise.all([
        listHabits(user.uid),
        dateKey ? listHabitCompletions(user.uid, dateKey) : Promise.resolve([]),
      ]);
      setHabits(habitList);
      const map = {};
      for (const c of completionList) {
        map[c.habitId] = c;
      }
      setCompletions(map);
    } catch (err) {
      setHabits([]);
      setCompletions({});
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [user, dateKey]);

  useEffect(() => {
    load();
  }, [load]);

  const todayKey = todayDateKey();

  const habitsForUI = useMemo(() => {
    return habits.map((h) => {
      const c = completions[h.id];
      const merged = mergeHabitWithDayCompletion(h, c, {
        selectedDateKey: dateKey || todayKey,
        todayDateKey: todayKey,
      });
      const timerRunning = !!runningTimers[h.id];
      const dayTrackingStatus = deriveDayTrackingStatus(h, c, merged, {
        selectedDateKey: dateKey || todayKey,
        todayDateKey: todayKey,
        timerRunning,
      });
      return { ...merged, dayTrackingStatus };
    });
  }, [habits, completions, dateKey, todayKey, runningTimers]);

  async function addHabit(data) {
    if (!user?.uid) throw new Error('You must be signed in to create habits.');
    const id = await createHabit(user.uid, data);
    await load();
    return id;
  }

  async function editHabit(habitId, changes) {
    if (!user?.uid) throw new Error('You must be signed in to update habits.');
    await updateHabit(user.uid, habitId, changes);
    await load();
  }

  async function removeHabit(habitId) {
    if (!user?.uid) throw new Error('You must be signed in to delete habits.');
    await deleteHabit(user.uid, habitId);
    await load();
  }

  async function toggleCompletion(habitId) {
    if (!user?.uid || !dateKey) throw new Error('Sign in and pick a date to log habits.');
    const existing = completions[habitId];
    const done = existing?.completed === true || existing?.isCompleted === true;
    if (done) {
      await removeHabitCompletion(user.uid, dateKey, habitId);
    } else {
      await logHabitCompletion(user.uid, dateKey, habitId, { completed: true });
    }
    await load();
  }

  async function saveDayCompletion(habitId, patch) {
    if (!user?.uid || !dateKey) throw new Error('Sign in and pick a date to log habits.');
    await saveHabitDayCompletion(user.uid, habitId, dateKey, patch);
    await load();
  }

  async function setDayMissed(habitId, missed) {
    await saveDayCompletion(habitId, {
      isCompleted: false,
      trackingStatus: missed ? 'missed' : null,
    });
  }

  return {
    habits: habitsForUI,
    /** Unmerged Firestore templates (use for stats / completion interpretation). */
    habitTemplates: habits,
    completions,
    loading,
    error,
    addHabit,
    editHabit,
    removeHabit,
    toggleCompletion,
    saveDayCompletion,
    setDayMissed,
    reload: load,
  };
}
