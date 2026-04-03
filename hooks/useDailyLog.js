import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getDailyLog,
  upsertDailyLog,
  recalculateDailyLog,
} from '@/services/dailyLogService';

export function useDailyLog(dateKey) {
  const { user } = useAuth();
  const [dailyLog, setDailyLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user || !dateKey) { setDailyLog(null); setLoading(false); return; }
    setLoading(true);
    try {
      const log = await getDailyLog(user.uid, dateKey);
      setDailyLog(log);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, dateKey]);

  useEffect(() => { load(); }, [load]);

  const recalculate = useCallback(async () => {
    if (!user || !dateKey) return;
    const result = await recalculateDailyLog(user.uid, dateKey);
    setDailyLog(result);
    return result;
  }, [user, dateKey]);

  const update = useCallback(async (data) => {
    if (!user || !dateKey) return;
    await upsertDailyLog(user.uid, dateKey, data);
    setDailyLog((prev) => ({ ...prev, ...data }));
  }, [user, dateKey]);

  return { dailyLog, loading, error, recalculate, update, reload: load };
}
