import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
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

  const load = useCallback(async () => {
    if (!user || !date) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setError(null);
      const data = await listActivityEntries(user.uid, date);
      setEntries(data);
    } catch (err) {
      setEntries([]);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  useEffect(() => {
    load();
  }, [load]);

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
    await load();
    await syncDashboardDailyLog();
    return id;
  }

  async function editEntry(entryId, changes) {
    if (!user?.uid) {
      throw new Error('You must be signed in to update activities.');
    }
    await updateActivityEntry(user.uid, date, entryId, changes);
    await load();
    await syncDashboardDailyLog();
  }

  async function removeEntry(entryId) {
    if (!user?.uid) {
      throw new Error('You must be signed in to delete activities.');
    }
    await deleteActivityEntry(user.uid, date, entryId);
    await load();
    await syncDashboardDailyLog();
  }

  const totalCaloriesBurned = calcTotalCaloriesBurned(entries);

  return {
    entries,
    loading,
    error,
    totalCaloriesBurned,
    addEntry,
    editEntry,
    removeEntry,
    reload: load,
  };
}
