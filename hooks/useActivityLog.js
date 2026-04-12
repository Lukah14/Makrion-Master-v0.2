import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  subscribeActivityEntries,
  listActivityEntries,
  addActivityEntry,
  updateActivityEntry,
  deleteActivityEntry,
  calcTotalCaloriesBurned,
} from '@/services/activityService';
import { recalculateDailyLog } from '@/services/dailyLogService';

export function useActivityLog(date) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !date) {
      setEntries([]);
      setLoading(false);
      setError(null);
      return undefined;
    }
    setLoading(true);
    setError(null);
    const unsub = subscribeActivityEntries(
      user.uid,
      date,
      (rows) => {
        setEntries(rows);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setEntries([]);
        setError(err?.message || String(err));
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user?.uid, date]);

  async function syncDashboardDailyLog() {
    if (!user?.uid || !date) return;
    try {
      await recalculateDailyLog(user.uid, date);
    } catch (e) {
      console.warn('[Activity] recalculateDailyLog failed', e?.message || e);
    }
  }

  async function addEntry(data) {
    if (!user?.uid) {
      throw new Error('You must be signed in to save activities.');
    }
    const id = await addActivityEntry(user.uid, date, data);
    await syncDashboardDailyLog();
    return id;
  }

  async function editEntry(entryId, changes) {
    if (!user?.uid) {
      throw new Error('You must be signed in to update activities.');
    }
    await updateActivityEntry(user.uid, date, entryId, changes);
    await syncDashboardDailyLog();
  }

  async function removeEntry(entryId) {
    if (!user?.uid) {
      throw new Error('You must be signed in to delete activities.');
    }
    await deleteActivityEntry(user.uid, date, entryId);
    await syncDashboardDailyLog();
  }

  const reload = useCallback(async () => {
    if (!user?.uid || !date) return;
    try {
      const data = await listActivityEntries(user.uid, date);
      setEntries(data);
      setError(null);
    } catch (e) {
      setError(e?.message || String(e));
    }
  }, [user?.uid, date]);

  const totalCaloriesBurned = calcTotalCaloriesBurned(entries);

  return {
    entries,
    loading,
    error,
    totalCaloriesBurned,
    addEntry,
    editEntry,
    removeEntry,
    reload,
  };
}
