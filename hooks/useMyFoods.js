import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  listMyFoods,
  searchMyFoods,
  createMyFood,
  updateMyFood,
  deleteMyFood,
  myFoodToSearchModel,
} from '@/services/foodService';

export function useMyFoods() {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) {
      setFoods([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listMyFoods(user.uid);
      setFoods(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const search = useCallback(
    async (term) => {
      if (!user) return [];
      try {
        return await searchMyFoods(user.uid, term);
      } catch {
        return foods.filter((f) => {
          const lower = term.toLowerCase();
          return f.name?.toLowerCase().includes(lower) ||
                 f.brand?.toLowerCase().includes(lower);
        });
      }
    },
    [user, foods]
  );

  const create = useCallback(
    async (foodData) => {
      if (!user) throw new Error('Not authenticated');
      const id = await createMyFood(user.uid, foodData);
      await load();
      return id;
    },
    [user, load]
  );

  const update = useCallback(
    async (foodId, changes) => {
      if (!user) throw new Error('Not authenticated');
      await updateMyFood(user.uid, foodId, changes);
      await load();
    },
    [user, load]
  );

  const remove = useCallback(
    async (foodId) => {
      if (!user) throw new Error('Not authenticated');
      await deleteMyFood(user.uid, foodId);
      await load();
    },
    [user, load]
  );

  const searchModels = foods.map(myFoodToSearchModel);

  return {
    foods,
    searchModels,
    loading,
    error,
    search,
    create,
    update,
    remove,
    reload: load,
  };
}
