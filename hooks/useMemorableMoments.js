import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getMemorableMomentForDate,
  upsertMemorableMomentForDate,
  deleteMemorableMomentForDate,
} from '@/services/memorableMomentService';

/**
 * One persistent daily note per selected date (profiles/{uid}/memorable_moments/{dateKey}).
 * @param {string} dateKey YYYY-MM-DD
 */
export function useMemorableMoments(dateKey) {
  const { user } = useAuth();
  const [dailyMoment, setDailyMoment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user || !dateKey) {
      setDailyMoment(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setError(null);
      const row = await getMemorableMomentForDate(user.uid, dateKey);
      setDailyMoment(row);
    } catch (err) {
      setError(err.message || String(err));
      setDailyMoment(null);
    } finally {
      setLoading(false);
    }
  }, [user, dateKey]);

  useEffect(() => {
    load();
  }, [load]);

  const upsertDaily = useCallback(
    async (data) => {
      if (!user) throw new Error('Not authenticated');
      await upsertMemorableMomentForDate(user.uid, dateKey, data);
      await load();
    },
    [user, dateKey, load],
  );

  const clearDaily = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    await deleteMemorableMomentForDate(user.uid, dateKey);
    await load();
  }, [user, dateKey, load]);

  return {
    dailyMoment,
    loading,
    error,
    upsertDaily,
    clearDaily,
    reload: load,
  };
}
