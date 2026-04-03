import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getMemorableMomentsByDate,
  addMemorableMoment,
  updateMemorableMoment,
  deleteMemorableMoment,
} from '@/services/memorableMomentService';

/**
 * @param {string} dateKey
 */
export function useMemorableMoments(dateKey) {
  const { user } = useAuth();
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user || !dateKey) { setMoments([]); setLoading(false); return; }
    setLoading(true);
    try {
      const list = await getMemorableMomentsByDate(user.uid, dateKey);
      setMoments(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, dateKey]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (data) => {
    if (!user) throw new Error('Not authenticated');
    const id = await addMemorableMoment(user.uid, { ...data, dateKey });
    await load();
    return id;
  }, [user, dateKey, load]);

  const edit = useCallback(async (momentId, changes) => {
    if (!user) return;
    await updateMemorableMoment(user.uid, momentId, changes);
    setMoments((prev) =>
      prev.map((m) => (m.id === momentId ? { ...m, ...changes } : m)),
    );
  }, [user]);

  const remove = useCallback(async (momentId) => {
    if (!user) return;
    await deleteMemorableMoment(user.uid, momentId);
    setMoments((prev) => prev.filter((m) => m.id !== momentId));
  }, [user]);

  return { moments, loading, error, add, edit, remove, reload: load };
}
