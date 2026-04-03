import { useEffect, useState, useCallback, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  addFavorite,
  removeFavorite,
  favoriteDocToSearchModel,
} from '@/services/foodService';

function favoritesColl(uid) {
  return collection(db, 'users', uid, 'favorites');
}

/**
 * Real-time saved foods (users/{uid}/favorites) exposed as search-ready models.
 */
export function useSavedFoods() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    const q = query(favoritesColl(user.uid), orderBy('addedAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err?.message || 'Saved foods failed to load');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  const savedIds = useMemo(
    () => new Set(items.map((i) => String(i.foodId || i.id))),
    [items]
  );

  const isFoodSaved = useCallback(
    (foodId) => savedIds.has(String(foodId)),
    [savedIds]
  );

  const searchModels = useMemo(() => items.map(favoriteDocToSearchModel), [items]);

  const saveFood = useCallback(
    async (foodModel) => {
      if (!user) throw new Error('Not authenticated');
      await addFavorite(user.uid, foodModel);
    },
    [user]
  );

  const unsaveFood = useCallback(
    async (foodId) => {
      if (!user) return;
      await removeFavorite(user.uid, foodId);
    },
    [user]
  );

  const toggleSaveFood = useCallback(
    async (foodModel) => {
      const id = String(foodModel.id);
      if (savedIds.has(id)) {
        await unsaveFood(id);
      } else {
        await saveFood(foodModel);
      }
    },
    [savedIds, saveFood, unsaveFood]
  );

  return {
    items,
    searchModels,
    loading,
    error,
    savedIds,
    isFoodSaved,
    saveFood,
    unsaveFood,
    toggleSaveFood,
  };
}
