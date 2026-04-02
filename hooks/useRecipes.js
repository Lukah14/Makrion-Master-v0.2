import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  listRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from '@/services/recipeService';

export function useRecipes() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listRecipes(user.uid);
      setRecipes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function addRecipe(data) {
    if (!user) return;
    const id = await createRecipe(user.uid, data);
    await load();
    return id;
  }

  async function editRecipe(recipeId, changes) {
    if (!user) return;
    await updateRecipe(user.uid, recipeId, changes);
    await load();
  }

  async function removeRecipe(recipeId) {
    if (!user) return;
    await deleteRecipe(user.uid, recipeId);
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
  }

  return { recipes, loading, error, addRecipe, editRecipe, removeRecipe, reload: load };
}
