import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getHabitLogsByDate,
  addHabitLog,
  getHabitRatingByDate,
  upsertHabitRating,
} from '@/services/habitLogService';

/**
 * @param {string} dateKey
 */
export function useHabitLogs(dateKey) {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user || !dateKey) { setLogs([]); setLoading(false); return; }
    setLoading(true);
    try {
      const list = await getHabitLogsByDate(user.uid, dateKey);
      setLogs(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, dateKey]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (data) => {
    if (!user) throw new Error('Not authenticated');
    const id = await addHabitLog(user.uid, { ...data, dateKey });
    await load();
    return id;
  }, [user, dateKey, load]);

  const getRating = useCallback(async (habitId) => {
    if (!user || !dateKey) return null;
    return getHabitRatingByDate(user.uid, habitId, dateKey);
  }, [user, dateKey]);

  const setRating = useCallback(async (habitId, value, opts) => {
    if (!user || !dateKey) return;
    await upsertHabitRating(user.uid, habitId, dateKey, value, opts);
    await load();
  }, [user, dateKey, load]);

  return { logs, loading, error, add, getRating, setRating, reload: load };
}
