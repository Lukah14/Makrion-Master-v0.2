/**
 * Shared helpers for Compare Foods: serving prep, FatSecret detail fetch, nutrition at quantity.
 */

import {
  selectBestServing,
  selectGramServing,
  defaultQuantityForServing,
  normalizeServingsFromDetail,
  ensureGramsOption,
} from '@/lib/servingUtils';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Fetch FatSecret food detail and return normalized servings (same shape as FoodDetailScreen).
 * @param {string} foodId
 * @returns {Promise<Array>}
 */
export async function fetchFatSecretServingsNormalized(foodId) {
  if (!foodId || !SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  try {
    const url = `${SUPABASE_URL}/functions/v1/fatsecret-proxy?action=get&food_id=${foodId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const foodDetail = data?.food;
    if (!foodDetail) return [];

    const normalized = normalizeServingsFromDetail(foodDetail);
    if (!normalized.length) return [];
    return ensureGramsOption(normalized) || normalized;
  } catch {
    return [];
  }
}

export function computeCompareNutrition(serving, quantity) {
  const empty = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    saturated_fat: 0,
    trans_fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    salt: 0,
    cholesterol: 0,
  };
  if (!serving) return empty;

  if (serving.isGramServing && serving.per100g) {
    const p = serving.per100g;
    const factor = quantity / 100;
    const sodium = Math.round((p.sodium || 0) * factor);
    return {
      calories: Math.round((p.calories || 0) * factor),
      protein: round1((p.protein || 0) * factor),
      carbs: round1((p.carbohydrate ?? p.carbs ?? 0) * factor),
      fat: round1((p.fat || 0) * factor),
      saturated_fat: round1((p.saturated_fat || 0) * factor),
      trans_fat: round1((p.trans_fat || 0) * factor),
      fiber: round1((p.fiber || 0) * factor),
      sugar: round1((p.sugar || 0) * factor),
      sodium,
      salt: round1(sodium * 0.0025),
      cholesterol: Math.round((p.cholesterol || 0) * factor),
    };
  }

  const factor = quantity / (serving.numberOfUnits || 1);
  const n = serving.nutrition || {};
  const sodium = Math.round((n.sodium || 0) * factor);
  return {
    calories: Math.round((n.calories || 0) * factor),
    protein: round1((n.protein || 0) * factor),
    carbs: round1((n.carbohydrate ?? n.carbs ?? 0) * factor),
    fat: round1((n.fat || 0) * factor),
    saturated_fat: round1((n.saturated_fat || 0) * factor),
    trans_fat: round1((n.trans_fat || 0) * factor),
    fiber: round1((n.fiber || 0) * factor),
    sugar: round1((n.sugar || 0) * factor),
    sodium,
    salt: round1(sodium * 0.0025),
    cholesterol: Math.round((n.cholesterol || 0) * factor),
  };
}

/**
 * @param {object} food  Same model as FoodDetailScreen / FoodSearchView
 * @returns {{ key: string, food: object, servings: array, selectedServing: object|null, quantity: number }}
 */
export function buildCompareSlotFromFood(food) {
  let servings = [...(food.servings || [])];
  servings = ensureGramsOption(servings) || servings;

  const gramFirst = selectGramServing(servings) || servings.find((s) => s.per100g);
  const selected = gramFirst || selectBestServing(servings);
  const quantity = selected ? defaultQuantityForServing(selected) : 100;

  const key = `slot_${food.id}_${Math.random().toString(36).slice(2, 9)}`;

  return {
    key,
    food,
    servings,
    selectedServing: selected,
    quantity: Math.max(0.5, quantity),
  };
}

/**
 * Enrich food with FatSecret servings if needed, then build slot.
 * @returns {Promise<object>}
 */
export async function buildCompareSlotResolved(food) {
  let f = { ...food };
  if (f.source === 'fatsecret' && (!f.servings || f.servings.length === 0)) {
    const s = await fetchFatSecretServingsNormalized(String(f.id));
    if (s.length) f = { ...f, servings: s };
  }
  return buildCompareSlotFromFood(f);
}
