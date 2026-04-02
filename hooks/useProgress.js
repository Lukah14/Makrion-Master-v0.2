import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  listProgressEntries,
  addProgressEntry,
  updateProgressEntry,
  deleteProgressEntry,
  getLatestProgressEntry,
} from '@/services/progressService';

export function useProgress() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [all, lat] = await Promise.all([
        listProgressEntries(user.uid),
        getLatestProgressEntry(user.uid),
      ]);
      setEntries(all);
      setLatest(lat);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function addEntry(data) {
    if (!user) return;
    const id = await addProgressEntry(user.uid, data);
    await load();
    return id;
  }

  async function editEntry(entryId, changes) {
    if (!user) return;
    await updateProgressEntry(user.uid, entryId, changes);
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, ...changes } : e))
    );
  }

  async function removeEntry(entryId) {
    if (!user) return;
    await deleteProgressEntry(user.uid, entryId);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }

  return {
    entries,
    latest,
    loading,
    error,
    addEntry,
    editEntry,
    removeEntry,
    reload: load,
  };
}
