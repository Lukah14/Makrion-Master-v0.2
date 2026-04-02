import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Recipes (users/{uid}/recipes/{recipeId}) ──────────────────────────────────

function recipesRef(uid) {
  return collection(db, 'users', uid, 'recipes');
}

function recipeRef(uid, recipeId) {
  return doc(db, 'users', uid, 'recipes', recipeId);
}

export function calcRecipeNutrition(ingredients) {
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const ing of ingredients) {
    const ratio = (ing.grams ?? 0) / 100;
    totals.kcal += (ing.per100g?.kcal ?? 0) * ratio;
    totals.protein += (ing.per100g?.protein ?? 0) * ratio;
    totals.carbs += (ing.per100g?.carbs ?? 0) * ratio;
    totals.fat += (ing.per100g?.fat ?? 0) * ratio;
  }
  return {
    kcal: Math.round(totals.kcal),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
  };
}

export async function createRecipe(uid, data) {
  const ingredients = data.ingredients || [];
  const totalGrams = ingredients.reduce((s, i) => s + (i.grams ?? 0), 0);
  const nutrition = calcRecipeNutrition(ingredients);

  const payload = {
    name: data.name,
    description: data.description || '',
    category: data.category || '',
    imageUrl: data.imageUrl || '',
    servings: data.servings || 1,
    totalGrams,
    ingredients,
    nutritionPerServing: {
      kcal: Math.round(nutrition.kcal / (data.servings || 1)),
      protein: Math.round((nutrition.protein / (data.servings || 1)) * 10) / 10,
      carbs: Math.round((nutrition.carbs / (data.servings || 1)) * 10) / 10,
      fat: Math.round((nutrition.fat / (data.servings || 1)) * 10) / 10,
    },
    per100g: totalGrams > 0
      ? {
          kcal: Math.round((nutrition.kcal / totalGrams) * 100),
          protein: Math.round((nutrition.protein / totalGrams) * 1000) / 10,
          carbs: Math.round((nutrition.carbs / totalGrams) * 1000) / 10,
          fat: Math.round((nutrition.fat / totalGrams) * 1000) / 10,
        }
      : { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    tags: data.tags || [],
    prepTimeMinutes: data.prepTimeMinutes || null,
    cookTimeMinutes: data.cookTimeMinutes || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(recipesRef(uid), payload);
  return ref.id;
}

export async function getRecipe(uid, recipeId) {
  const snap = await getDoc(recipeRef(uid, recipeId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listRecipes(uid) {
  const q = query(recipesRef(uid), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateRecipe(uid, recipeId, changes) {
  const update = { ...changes, updatedAt: serverTimestamp() };
  if (changes.ingredients) {
    const ingredients = changes.ingredients;
    const totalGrams = ingredients.reduce((s, i) => s + (i.grams ?? 0), 0);
    const nutrition = calcRecipeNutrition(ingredients);
    const servings = changes.servings || 1;
    update.totalGrams = totalGrams;
    update.nutritionPerServing = {
      kcal: Math.round(nutrition.kcal / servings),
      protein: Math.round((nutrition.protein / servings) * 10) / 10,
      carbs: Math.round((nutrition.carbs / servings) * 10) / 10,
      fat: Math.round((nutrition.fat / servings) * 10) / 10,
    };
    update.per100g = totalGrams > 0
      ? {
          kcal: Math.round((nutrition.kcal / totalGrams) * 100),
          protein: Math.round((nutrition.protein / totalGrams) * 1000) / 10,
          carbs: Math.round((nutrition.carbs / totalGrams) * 1000) / 10,
          fat: Math.round((nutrition.fat / totalGrams) * 1000) / 10,
        }
      : { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  }
  await updateDoc(recipeRef(uid, recipeId), update);
}

export async function deleteRecipe(uid, recipeId) {
  await deleteDoc(recipeRef(uid, recipeId));
}
