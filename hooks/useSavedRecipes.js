import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  subscribeSavedRecipes,
  addSavedRecipe,
  removeSavedRecipe,
  savedDocToRecipeCard,
} from '@/services/savedRecipeService';

export function useSavedRecipes() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setDocs([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    const unsub = subscribeSavedRecipes(
      user.uid,
      (list) => {
        setDocs(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err?.message || 'Saved recipes failed to load');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  const recipes = useMemo(() => docs.map(savedDocToRecipeCard), [docs]);

  const savedIds = useMemo(
    () => new Set(docs.map((d) => String(d.recipeId))),
    [docs]
  );

  const isRecipeSaved = useCallback(
    (recipeId) => savedIds.has(String(recipeId)),
    [savedIds]
  );

  const saveRecipe = useCallback(
    async (recipe) => {
      if (!user) throw new Error('Not authenticated');
      await addSavedRecipe(user.uid, recipe);
    },
    [user]
  );

  const unsaveRecipe = useCallback(
    async (recipeId) => {
      if (!user) return;
      await removeSavedRecipe(user.uid, recipeId);
    },
    [user]
  );

  const toggleSaveRecipe = useCallback(
    async (recipe) => {
      const id = String(recipe.id);
      if (savedIds.has(id)) {
        await unsaveRecipe(id);
        return false;
      }
      await saveRecipe(recipe);
      return true;
    },
    [savedIds, saveRecipe, unsaveRecipe]
  );

  return {
    recipes,
    docs,
    loading,
    error,
    savedIds,
    isRecipeSaved,
    saveRecipe,
    unsaveRecipe,
    toggleSaveRecipe,
  };
}
