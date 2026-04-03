import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getHabitCompletionsByDate,
  upsertHabitCompletion,
  toggleHabitCompletion,
} from '@/services/habitCompletionService';

/**
 * @param {string} dateKey
 */
export function useHabitCompletions(dateKey) {
  const { user } = useAuth();
  const [completions, setCompletions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user || !dateKey) { setCompletions({}); setLoading(false); return; }
    setLoading(true);
    try {
      const list = await getHabitCompletionsByDate(user.uid, dateKey);
      const map = {};
      for (const c of list) map[c.habitId] = c;
      setCompletions(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, dateKey]);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (habitId) => {
    if (!user || !dateKey) return;
    const isNowCompleted = await toggleHabitCompletion(user.uid, habitId, dateKey);
    setCompletions((prev) => {
      const next = { ...prev };
      if (isNowCompleted) {
        next[habitId] = { habitId, dateKey, isCompleted: true };
      } else {
        delete next[habitId];
      }
      return next;
    });
    return isNowCompleted;
  }, [user, dateKey]);

  const upsert = useCallback(async (habitId, data) => {
    if (!user || !dateKey) return;
    await upsertHabitCompletion(user.uid, habitId, dateKey, data);
    setCompletions((prev) => ({
      ...prev,
      [habitId]: { habitId, dateKey, ...data },
    }));
  }, [user, dateKey]);

  return { completions, loading, error, toggle, upsert, reload: load };
}
