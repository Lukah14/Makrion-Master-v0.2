import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  listActivityEntries,
  addActivityEntry,
  updateActivityEntry,
  deleteActivityEntry,
  calcTotalCaloriesBurned,
} from '@/services/activityService';

export function useActivityLog(date) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user || !date) return;
    setLoading(true);
    try {
      const data = await listActivityEntries(user.uid, date);
      setEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  useEffect(() => {
    load();
  }, [load]);

  async function addEntry(data) {
    if (!user) return;
    const id = await addActivityEntry(user.uid, date, data);
    await load();
    return id;
  }

  async function editEntry(entryId, changes) {
    if (!user) return;
    await updateActivityEntry(user.uid, date, entryId, changes);
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, ...changes } : e))
    );
  }

  async function removeEntry(entryId) {
    if (!user) return;
    await deleteActivityEntry(user.uid, date, entryId);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
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
