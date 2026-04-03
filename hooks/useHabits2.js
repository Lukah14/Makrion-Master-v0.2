import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getHabits,
  getHabitsForDate,
  createHabit,
  updateHabit,
  archiveHabit,
  deleteHabitPermanently,
} from '@/services/habitService2';

/**
 * Hook for habit templates under profiles/{uid}/habits.
 * @param {Object} [opts]
 * @param {boolean} [opts.includeArchived]
 */
export function useHabits2(opts = {}) {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) { setHabits([]); setLoading(false); return; }
    setLoading(true);
    try {
      const list = await getHabits(user.uid, opts.includeArchived);
      setHabits(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, opts.includeArchived]);

  useEffect(() => { load(); }, [load]);

  const forDate = useCallback(async (dateKey) => {
    if (!user) return [];
    return getHabitsForDate(user.uid, dateKey);
  }, [user]);

  const add = useCallback(async (data) => {
    if (!user) throw new Error('Not authenticated');
    const id = await createHabit(user.uid, data);
    await load();
    return id;
  }, [user, load]);

  const edit = useCallback(async (habitId, changes) => {
    if (!user) return;
    await updateHabit(user.uid, habitId, changes);
    setHabits((prev) =>
      prev.map((h) => (h.id === habitId ? { ...h, ...changes } : h)),
    );
  }, [user]);

  const archive = useCallback(async (habitId) => {
    if (!user) return;
    await archiveHabit(user.uid, habitId);
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
  }, [user]);

  const remove = useCallback(async (habitId) => {
    if (!user) return;
    await deleteHabitPermanently(user.uid, habitId);
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
  }, [user]);

  return { habits, loading, error, forDate, add, edit, archive, remove, reload: load };
}
