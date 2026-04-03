import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getWeightEntries,
  getWeightEntriesByRange,
  addWeightEntry,
  getLatestWeightEntry,
} from '@/services/weightEntryService';

export function useWeightEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) { setEntries([]); setLatest(null); setLoading(false); return; }
    setLoading(true);
    try {
      const [all, lat] = await Promise.all([
        getWeightEntries(user.uid),
        getLatestWeightEntry(user.uid),
      ]);
      setEntries(all);
      setLatest(lat);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (data) => {
    if (!user) throw new Error('Not authenticated');
    const id = await addWeightEntry(user.uid, data);
    await load();
    return id;
  }, [user, load]);

  const getByRange = useCallback(async (startKey, endKey) => {
    if (!user) return [];
    return getWeightEntriesByRange(user.uid, startKey, endKey);
  }, [user]);

  return { entries, latest, loading, error, add, getByRange, reload: load };
}
