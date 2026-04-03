import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  createRecipe,
  updateRecipe,
  deleteRecipe,
  subscribeRecipes,
  listRecipes,
} from '@/services/recipeService';

export function useRecipes() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setRecipes([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    const unsub = subscribeRecipes(
      user.uid,
      (list) => {
        setRecipes(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err?.message || 'Recipes failed to load');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  const addRecipe = useCallback(
    async (data) => {
      if (!user) return;
      const id = await createRecipe(user.uid, data);
      return id;
    },
    [user]
  );

  const editRecipe = useCallback(
    async (recipeId, changes) => {
      if (!user) return;
      await updateRecipe(user.uid, recipeId, changes);
    },
    [user]
  );

  const removeRecipe = useCallback(
    async (recipeId) => {
      if (!user) return;
      await deleteRecipe(user.uid, recipeId);
    },
    [user]
  );

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      const data = await listRecipes(user.uid);
      setRecipes(data);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Refresh failed');
    }
  }, [user]);

  return { recipes, loading, error, addRecipe, editRecipe, removeRecipe, reload };
}
