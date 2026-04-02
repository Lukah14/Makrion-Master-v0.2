import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  listFoodLogEntries,
  addFoodLogEntry,
  updateFoodLogEntry,
  deleteFoodLogEntry,
  duplicateFoodLogEntry,
  moveFoodLogEntry,
  updateEntryStatus,
  buildLogEntry,
  calcDailySummary,
} from '@/services/foodLogService';

export function useFoodLog(date) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user || !date) return;
    setLoading(true);
    try {
      const data = await listFoodLogEntries(user.uid, date);
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

  async function addEntry(food, mealType, grams, options = {}) {
    if (!user) return;
    const entry = buildLogEntry({ food, mealType, grams, ...options });
    const id = await addFoodLogEntry(user.uid, date, entry);
    setEntries((prev) => [...prev, { id, ...entry }]);
    return id;
  }

  async function editEntry(entryId, changes) {
    if (!user) return;
    await updateFoodLogEntry(user.uid, date, entryId, changes);
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, ...changes } : e))
    );
  }

  async function removeEntry(entryId) {
    if (!user) return;
    await deleteFoodLogEntry(user.uid, date, entryId);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }

  async function duplicateEntry(entryId) {
    if (!user) return;
    await duplicateFoodLogEntry(user.uid, date, entryId);
    await load();
  }

  async function moveEntry(entryId, toDate, newMealType) {
    if (!user) return;
    await moveFoodLogEntry(user.uid, date, toDate, entryId, newMealType);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }

  async function toggleStatus(entryId, currentStatus) {
    const next = currentStatus === 'logged' ? 'planned' : 'logged';
    await updateEntryStatus(user.uid, date, entryId, next);
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, status: next } : e))
    );
  }

  const summary = calcDailySummary(entries);

  return {
    entries,
    loading,
    error,
    summary,
    addEntry,
    editEntry,
    removeEntry,
    duplicateEntry,
    moveEntry,
    toggleStatus,
    reload: load,
  };
}
