/**
 * Saved (bookmarked) recipes — users/{uid}/savedRecipes/{safeId}
 * Stores a snapshot for offline display; full detail can be re-fetched by id.
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

function savedRef(uid) {
  return collection(db, 'users', uid, 'savedRecipes');
}

function safeDocId(recipeId) {
  return String(recipeId).replace(/[/\s]/g, '_');
}

function buildSnapshot(recipe) {
  return {
    name: recipe.name,
    description: recipe.description || '',
    image: recipe.image || '',
    calories: recipe.calories ?? recipe.nutritionPerServing?.kcal ?? 0,
    protein: recipe.protein ?? recipe.nutritionPerServing?.protein ?? 0,
    carbs: recipe.carbs ?? recipe.nutritionPerServing?.carbs ?? 0,
    fat: recipe.fat ?? recipe.nutritionPerServing?.fat ?? 0,
    cookTime: recipe.cookTime ?? recipe.cookTimeMinutes ?? 0,
    prepTime: recipe.prepTime ?? recipe.prepTimeMinutes ?? 0,
    servings: recipe.servings ?? 1,
    category: recipe.category || '',
    nutritionPerServing: recipe.nutritionPerServing || null,
  };
}

export async function addSavedRecipe(uid, recipe) {
  const recipeId = recipe.id;
  const id = safeDocId(recipeId);
  await setDoc(doc(db, 'users', uid, 'savedRecipes', id), {
    recipeId,
    source: recipe.source || 'fatsecret',
    snapshot: buildSnapshot(recipe),
    addedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function removeSavedRecipe(uid, recipeId) {
  await deleteDoc(doc(db, 'users', uid, 'savedRecipes', safeDocId(recipeId)));
}

export async function listSavedRecipes(uid) {
  const q = query(savedRef(uid), orderBy('addedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function subscribeSavedRecipes(uid, onNext, onError) {
  const q = query(savedRef(uid), orderBy('addedAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (err) => onError?.(err)
  );
}

export function savedDocToRecipeCard(docRow) {
  const s = docRow.snapshot || {};
  return {
    id: docRow.recipeId,
    name: s.name || docRow.recipeId,
    description: s.description || '',
    image: s.image || '',
    calories: s.calories ?? 0,
    protein: s.protein ?? 0,
    carbs: s.carbs ?? 0,
    fat: s.fat ?? 0,
    cookTime: s.cookTime ?? 0,
    prepTime: s.prepTime ?? 0,
    servings: s.servings ?? 1,
    category: s.category || 'Recipe',
    nutritionPerServing: s.nutritionPerServing || null,
    source: docRow.source || 'fatsecret',
    saved: true,
    ingredients: [],
    instructions: [],
  };
}
