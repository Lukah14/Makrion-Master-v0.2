import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getFoodEntriesByDate,
  addFoodEntry,
  updateFoodEntry,
  deleteFoodEntry,
} from '@/services/foodEntryService';

/**
 * Hook for managing food entries on a specific date.
 * Replaces the old useFoodLog hook for the new profiles/ root.
 * @param {string} dateKey  "YYYY-MM-DD"
 */
export function useFoodEntries(dateKey) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user || !dateKey) { setEntries([]); setLoading(false); return; }
    setLoading(true);
    try {
      const list = await getFoodEntriesByDate(user.uid, dateKey);
      setEntries(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, dateKey]);

  useEffect(() => { load(); }, [load]);

  const addEntry = useCallback(async (data) => {
    if (!user) throw new Error('Not authenticated');
    const id = await addFoodEntry(user.uid, { ...data, dateKey });
    const newEntry = { id, ...data, dateKey };
    setEntries((prev) => [...prev, newEntry]);
    return id;
  }, [user, dateKey]);

  const editEntry = useCallback(async (entryId, changes) => {
    if (!user) return;
    await updateFoodEntry(user.uid, entryId, changes);
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, ...changes } : e)),
    );
  }, [user]);

  const removeEntry = useCallback(async (entryId) => {
    if (!user) return;
    await deleteFoodEntry(user.uid, entryId);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }, [user]);

  const summary = (() => {
    let kcal = 0, protein = 0, carbs = 0, fat = 0;
    for (const e of entries) {
      if (e.status && e.status !== 'logged') continue;
      const n = e.nutrientsSnapshot || {};
      kcal += n.kcal || 0;
      protein += n.protein || 0;
      carbs += n.carbs || 0;
      fat += n.fat || 0;
    }
    return {
      kcal: Math.round(kcal),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
    };
  })();

  return { entries, summary, loading, error, addEntry, editEntry, removeEntry, reload: load };
}
