import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  listHabits,
  createHabit,
  updateHabit,
  archiveHabit,
  deleteHabit,
  logHabitCompletion,
  getHabitCompletion,
  listHabitCompletions,
  removeHabitCompletion,
} from '@/services/habitService';

export function useHabits(date) {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [habitList, completionList] = await Promise.all([
        listHabits(user.uid),
        date ? listHabitCompletions(user.uid, date) : Promise.resolve([]),
      ]);
      setHabits(habitList);
      const map = {};
      for (const c of completionList) {
        map[c.habitId] = c;
      }
      setCompletions(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  useEffect(() => {
    load();
  }, [load]);

  async function addHabit(data) {
    if (!user) return;
    const id = await createHabit(user.uid, data);
    await load();
    return id;
  }

  async function editHabit(habitId, changes) {
    if (!user) return;
    await updateHabit(user.uid, habitId, changes);
    setHabits((prev) =>
      prev.map((h) => (h.id === habitId ? { ...h, ...changes } : h))
    );
  }

  async function removeHabit(habitId) {
    if (!user) return;
    await deleteHabit(user.uid, habitId);
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
  }

  async function toggleCompletion(habitId) {
    if (!user || !date) return;
    const existing = completions[habitId];
    if (existing?.completed) {
      await removeHabitCompletion(user.uid, date, habitId);
      setCompletions((prev) => {
        const next = { ...prev };
        delete next[habitId];
        return next;
      });
    } else {
      await logHabitCompletion(user.uid, date, habitId);
      setCompletions((prev) => ({
        ...prev,
        [habitId]: { habitId, completed: true },
      }));
    }
  }

  return {
    habits,
    completions,
    loading,
    error,
    addHabit,
    editHabit,
    removeHabit,
    toggleCompletion,
    reload: load,
  };
}
