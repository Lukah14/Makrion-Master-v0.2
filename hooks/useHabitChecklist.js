import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getChecklistItems,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
} from '@/services/habitChecklistService';

/**
 * @param {string} habitId
 */
export function useHabitChecklist(habitId) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user || !habitId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    try {
      const list = await getChecklistItems(user.uid, habitId);
      setItems(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, habitId]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (data) => {
    if (!user) throw new Error('Not authenticated');
    const id = await addChecklistItem(user.uid, { ...data, habitId });
    await load();
    return id;
  }, [user, habitId, load]);

  const edit = useCallback(async (itemId, changes) => {
    if (!user) return;
    await updateChecklistItem(user.uid, itemId, changes);
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, ...changes } : it)),
    );
  }, [user]);

  const remove = useCallback(async (itemId) => {
    if (!user) return;
    await deleteChecklistItem(user.uid, itemId);
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  }, [user]);

  return { items, loading, error, add, edit, remove, reload: load };
}
