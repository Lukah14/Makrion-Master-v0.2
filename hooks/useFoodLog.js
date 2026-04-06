import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  addFoodLogEntry,
  updateFoodLogEntry,
  deleteFoodLogEntry,
  duplicateFoodLogEntry,
  moveFoodLogEntry,
  updateEntryStatus,
  buildLogEntry,
  buildManualLogEntry,
  calcDailySummary,
  subscribeFoodLogEntries,
  listFoodLogEntries,
} from '@/services/foodLogService';

/**
 * Live food log for users/{uid}/foodLogs/{dateKey}/entries (Firestore real-time).
 */
export function useFoodLog(dateKey) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !dateKey) {
      setEntries([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setEntries([]);
    const unsub = subscribeFoodLogEntries(
      user.uid,
      dateKey,
      (list) => {
        setEntries(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err?.message || 'Failed to load food log');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid, dateKey]);

  const addEntry = useCallback(
    async (food, mealType, grams, options = {}) => {
      if (!user) throw new Error('User not authenticated');
      if (!dateKey) throw new Error('Date is required');
      if (!mealType) throw new Error('Meal type is required');
      if (!grams || grams <= 0) throw new Error('Grams must be > 0');

      const entry = buildLogEntry({ food, mealType, grams, ...options });
      return addFoodLogEntry(user.uid, dateKey, entry);
    },
    [user, dateKey]
  );

  const addManualEntry = useCallback(
    async ({ name, mealType, nutrientsSnapshot, status, note }) => {
      if (!user) throw new Error('User not authenticated');
      if (!dateKey) throw new Error('Date is required');
      if (!mealType) throw new Error('Meal type is required');
      const trimmed = String(name || '').trim();
      if (!trimmed) throw new Error('Food name is required');

      const entry = buildManualLogEntry({
        dateKey,
        name: trimmed,
        mealType,
        nutrientsSnapshot,
        status,
        note,
      });
      return addFoodLogEntry(user.uid, dateKey, entry);
    },
    [user, dateKey]
  );

  const editEntry = useCallback(
    async (entryId, changes) => {
      if (!user || !dateKey) return;
      await updateFoodLogEntry(user.uid, dateKey, entryId, changes);
    },
    [user, dateKey]
  );

  const removeEntry = useCallback(
    async (entryId) => {
      if (!user || !dateKey) return;
      await deleteFoodLogEntry(user.uid, dateKey, entryId);
    },
    [user, dateKey]
  );

  const duplicateEntry = useCallback(
    async (entryId) => {
      if (!user || !dateKey) return;
      await duplicateFoodLogEntry(user.uid, dateKey, entryId);
    },
    [user, dateKey]
  );

  const moveEntry = useCallback(
    async (entryId, toDate, newMealType) => {
      if (!user || !dateKey) return;
      await moveFoodLogEntry(user.uid, dateKey, toDate, entryId, newMealType);
    },
    [user, dateKey]
  );

  const toggleStatus = useCallback(
    async (entryId, currentStatus) => {
      if (!user || !dateKey) return;
      const next = currentStatus === 'logged' ? 'planned' : 'logged';
      await updateEntryStatus(user.uid, dateKey, entryId, next);
    },
    [user, dateKey]
  );

  const reload = useCallback(async () => {
    if (!user || !dateKey) return;
    try {
      const data = await listFoodLogEntries(user.uid, dateKey);
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Refresh failed');
    }
  }, [user, dateKey]);

  const summary = calcDailySummary(entries);

  return {
    entries,
    loading,
    error,
    summary,
    addEntry,
    addManualEntry,
    editEntry,
    removeEntry,
    duplicateEntry,
    moveEntry,
    toggleStatus,
    reload,
  };
}
