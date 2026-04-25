import { useEffect, useState, useCallback, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  addFavorite,
  removeFavorite,
  favoriteDocToSearchModel,
  getFoodCanonicalKey,
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

  const deduplicatedItems = useMemo(() => {
    const seen = new Map();
    for (const item of items) {
      const key = item.canonicalKey || item.foodId || item.id;
      if (!seen.has(key)) {
        seen.set(key, item);
      } else {
        const existing = seen.get(key);
        const existingTime = existing.addedAt?.toMillis?.() ?? 0;
        const itemTime = item.addedAt?.toMillis?.() ?? 0;
        if (itemTime > existingTime) seen.set(key, item);
      }
    }
    return Array.from(seen.values());
  }, [items]);

  const savedKeys = useMemo(() => {
    const set = new Set();
    for (const i of deduplicatedItems) {
      if (i.canonicalKey) set.add(i.canonicalKey);
      if (i.foodId) set.add(String(i.foodId));
      if (i.id) set.add(String(i.id));
    }
    return set;
  }, [deduplicatedItems]);

  const savedIds = savedKeys;

  const isFoodSaved = useCallback(
    (foodOrId) => {
      if (foodOrId && typeof foodOrId === 'object') {
        const key = getFoodCanonicalKey(foodOrId);
        if (savedKeys.has(key)) return true;
        const rawId = String(foodOrId.id || '');
        return savedKeys.has(rawId) || savedKeys.has(`fatsecret:${rawId}`);
      }
      const id = String(foodOrId || '');
      return savedKeys.has(id) || savedKeys.has(`fatsecret:${id}`);
    },
    [savedKeys]
  );

  const searchModels = useMemo(
    () => deduplicatedItems.map(favoriteDocToSearchModel),
    [deduplicatedItems]
  );

  const saveFood = useCallback(
    async (foodModel) => {
      if (!user) throw new Error('Not authenticated');
      await addFavorite(user.uid, foodModel);
    },
    [user]
  );

  const unsaveFood = useCallback(
    async (foodOrId) => {
      if (!user) return;
      if (foodOrId && typeof foodOrId === 'object') {
        const key = getFoodCanonicalKey(foodOrId);
        await removeFavorite(user.uid, key);
      } else {
        await removeFavorite(user.uid, String(foodOrId));
      }
    },
    [user]
  );

  const toggleSaveFood = useCallback(
    async (foodModel) => {
      if (isFoodSaved(foodModel)) {
        await unsaveFood(foodModel);
      } else {
        await saveFood(foodModel);
      }
    },
    [isFoodSaved, saveFood, unsaveFood]
  );

  return {
    items: deduplicatedItems,
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
