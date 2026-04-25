import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  searchMyFoods,
  createMyFood,
  updateMyFood,
  deleteMyFood,
  myFoodToSearchModel,
  subscribeMyFoods,
  listMyFoods,
  getFoodCanonicalKey,
} from '@/services/foodService';

export function useMyFoods() {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setFoods([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    const unsub = subscribeMyFoods(
      user.uid,
      (list) => {
        setFoods(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err?.message || 'My foods failed to load');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  const search = useCallback(
    async (term) => {
      if (!user) return [];
      try {
        return await searchMyFoods(user.uid, term);
      } catch {
        const lower = (term || '').toLowerCase();
        return foods.filter(
          (f) =>
            f.name?.toLowerCase().includes(lower) ||
            f.brand?.toLowerCase().includes(lower)
        );
      }
    },
    [user, foods]
  );

  const create = useCallback(
    async (foodData) => {
      if (!user) throw new Error('Not authenticated');
      return createMyFood(user.uid, foodData);
    },
    [user]
  );

  const update = useCallback(
    async (foodId, changes) => {
      if (!user) throw new Error('Not authenticated');
      await updateMyFood(user.uid, foodId, changes);
    },
    [user]
  );

  const remove = useCallback(
    async (foodId) => {
      if (!user) throw new Error('Not authenticated');
      await deleteMyFood(user.uid, foodId);
    },
    [user]
  );

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      const data = await listMyFoods(user.uid);
      setFoods(data);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Refresh failed');
    }
  }, [user]);

  const deduplicatedFoods = useMemo(() => {
    const seen = new Map();
    for (const food of foods) {
      const key = food.canonicalKey || getFoodCanonicalKey({ ...food, source: 'user' });
      if (!seen.has(key)) {
        seen.set(key, food);
      } else {
        const existing = seen.get(key);
        const existingTime = existing.updatedAt?.toMillis?.() ?? existing.createdAt?.toMillis?.() ?? 0;
        const foodTime = food.updatedAt?.toMillis?.() ?? food.createdAt?.toMillis?.() ?? 0;
        if (foodTime > existingTime) seen.set(key, food);
      }
    }
    return Array.from(seen.values());
  }, [foods]);

  const searchModels = useMemo(
    () => deduplicatedFoods.map(myFoodToSearchModel),
    [deduplicatedFoods]
  );

  return {
    foods: deduplicatedFoods,
    searchModels,
    loading,
    error,
    search,
    create,
    update,
    remove,
    reload,
  };
}
