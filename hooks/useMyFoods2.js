import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  listMyFoods,
  searchMyFoods,
  createMyFood,
  updateMyFood,
  deleteMyFood,
} from '@/services/myFoodService';

/**
 * Hook for user-created foods under profiles/{uid}/my_foods.
 */
export function useMyFoods2() {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) { setFoods([]); setLoading(false); return; }
    setLoading(true);
    try {
      const list = await listMyFoods(user.uid);
      setFoods(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const search = useCallback(async (q) => {
    if (!user) return [];
    return searchMyFoods(user.uid, q);
  }, [user]);

  const add = useCallback(async (data) => {
    if (!user) throw new Error('Not authenticated');
    const id = await createMyFood(user.uid, data);
    await load();
    return id;
  }, [user, load]);

  const edit = useCallback(async (foodId, changes) => {
    if (!user) return;
    await updateMyFood(user.uid, foodId, changes);
    setFoods((prev) =>
      prev.map((f) => (f.id === foodId ? { ...f, ...changes } : f)),
    );
  }, [user]);

  const remove = useCallback(async (foodId) => {
    if (!user) return;
    await deleteMyFood(user.uid, foodId);
    setFoods((prev) => prev.filter((f) => f.id !== foodId));
  }, [user]);

  return { foods, loading, error, search, add, edit, remove, reload: load };
}
