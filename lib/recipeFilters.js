/**
 * Client-side recipe normalization, filtering, and sorting for Recipes screens.
 * All filtering is in-memory (Firestore returns lists; no server-side filter queries).
 */

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'protein_desc', label: 'Highest Protein' },
  { value: 'calories_asc', label: 'Lowest Calories' },
  { value: 'time_asc', label: 'Fastest to Make' },
  { value: 'carbs_asc', label: 'Lowest Carbs' },
  { value: 'fat_asc', label: 'Lowest Fat' },
  { value: 'recent_desc', label: 'Most Recently Added' },
];

export const EMPTY_RECIPE_FILTERS = {
  mealType: [],
  nutritionGoal: [],
  calorieRange: null,
  calorieMin: '',
  calorieMax: '',
  proteinRange: null,
  carbsRange: null,
  fatRange: null,
  prepTime: [],
  cookTime: [],
  totalTime: [],
  ingredientsInclude: [],
  ingredientsExclude: [],
  dietary: [],
  sortBy: 'relevance',
};

const MEAT = /\b(chicken|beef|pork|lamb|turkey|fish|salmon|tuna|shrimp|bacon|ham|steak|meat|sausage|anchovy)\b/i;
const DAIRY = /\b(milk|cheese|butter|cream|yogurt|dairy|parmesan|mozzarella|cheddar)\b/i;
const EGG = /\b(egg|eggs)\b/i;
const GLUTEN = /\b(wheat|flour|bread|pasta|barley|rye|gluten)\b/i;

function tsToMs(v) {
  if (v == null) return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (typeof v?.seconds === 'number') return v.seconds * 1000;
  return 0;
}

/** Infer meal-type buckets from category / name (for FatSecret + loose data). */
export function inferMealTypeSet(recipe) {
  const cat = `${recipe.category || ''} ${recipe.mealType || ''}`.toLowerCase();
  const name = (recipe.name || '').toLowerCase();
  const blob = `${cat} ${name}`;
  const set = new Set();
  if (/breakfast|brunch|morning|cereal|pancake|waffle|oatmeal/.test(blob)) set.add('Breakfast');
  if (/\blunch\b|midday|sandwich(?!\s*dessert)/.test(blob)) set.add('Lunch');
  if (/dinner|supper|evening meal|main course|main dish|entree/.test(blob)) {
    set.add('Dinner');
    set.add('Lunch');
  }
  if (/snack|appetizer|finger food/.test(blob)) set.add('Snack');
  if (/dessert|sweet|cake|cookie|brownie|pie|pudding|ice cream|chocolate bar/.test(blob)) set.add('Dessert');
  if (set.size === 0 && /main course|soup|stew|salad|side/.test(cat)) {
    set.add('Lunch');
    set.add('Dinner');
  }
  return set;
}

function inferDietFlags(norm) {
  const tags = new Set();
  const dietArr = [...(norm.dietLabels || [])];
  dietArr.forEach((d) => tags.add(String(d).toLowerCase()));

  const ingBlob = norm.ingredientNames.join(' ');
  if (tags.has('vegetarian') || tags.has('vegan')) {
    /* keep */
  } else if (!MEAT.test(ingBlob) && !MEAT.test(norm.nameLower)) {
    tags.add('vegetarian');
  }
  if (tags.has('vegan')) {
    /* keep */
  } else if (tags.has('vegetarian') && !DAIRY.test(ingBlob) && !EGG.test(ingBlob)) {
    tags.add('vegan');
  }
  if (/\bgluten\s*free\b/.test(dietArr.join(' ')) || tags.has('gluten free')) tags.add('gluten free');
  if (/\bdairy\s*free\b/.test(dietArr.join(' ')) || tags.has('dairy free')) tags.add('dairy free');
  if ((norm.fiberPerServing || 0) >= 5) tags.add('high fiber');
  const k = norm.caloriesPerServing;
  const p = norm.proteinPerServing;
  const c = norm.carbsPerServing;
  const f = norm.fatPerServing;
  if (p >= 25) tags.add('high protein');
  if (k > 0 && k <= 350) tags.add('low calorie');
  if (c <= 15 && k > 0) tags.add('low carb');
  if (f <= 12 && k > 0) tags.add('low fat');
  if (p >= 12 && p <= 35 && c >= 25 && c <= 55 && f >= 8 && f <= 28 && k > 200) tags.add('balanced');
  if (c <= 12 && f >= 14 && k > 0) tags.add('keto-friendly');

  return tags;
}

/**
 * Normalize any recipe card shape to comparable numbers (per serving).
 */
export function normalizeRecipeForFilters(recipe) {
  const nps = recipe.nutritionPerServing || {};
  const servings = Math.max(1, Number(recipe.servings) || 1);
  const total = recipe.totalNutrition || {};

  let caloriesPerServing = Number(nps.kcal ?? nps.calories ?? recipe.calories ?? 0);
  let proteinPerServing = Number(nps.protein ?? recipe.protein ?? 0);
  let carbsPerServing = Number(nps.carbs ?? nps.carbohydrate ?? recipe.carbs ?? 0);
  let fatPerServing = Number(nps.fat ?? recipe.fat ?? 0);
  let fiberPerServing = Number(nps.fiber ?? recipe.fiber ?? total.fiber ?? 0);

  if ((!caloriesPerServing && !proteinPerServing) && (total.kcal || total.protein)) {
    caloriesPerServing = Math.round((total.kcal || 0) / servings);
    proteinPerServing = Math.round(((total.protein || 0) / servings) * 10) / 10;
    carbsPerServing = Math.round(((total.carbs || 0) / servings) * 10) / 10;
    fatPerServing = Math.round(((total.fat || 0) / servings) * 10) / 10;
  }

  const prepTimeMinutes = Number(recipe.prepTimeMinutes ?? recipe.prepTime ?? 0);
  const cookTimeMinutes = Number(recipe.cookTimeMinutes ?? recipe.cookTime ?? 0);
  const totalTimeMinutes = prepTimeMinutes + cookTimeMinutes;

  const ingredientNames = (recipe.ingredients || [])
    .map((i) => String(i.name || i.food_name || '').toLowerCase().trim())
    .filter(Boolean);

  const dietLabels = [];
  if (Array.isArray(recipe.diet)) dietLabels.push(...recipe.diet);
  if (Array.isArray(recipe.tags)) dietLabels.push(...recipe.tags);
  if (Array.isArray(recipe.dietaryTags)) dietLabels.push(...recipe.dietaryTags);

  const nameLower = (recipe.name || '').toLowerCase();
  const mealTypes = inferMealTypeSet(recipe);

  const base = {
    raw: recipe,
    caloriesPerServing,
    proteinPerServing,
    carbsPerServing,
    fatPerServing,
    fiberPerServing,
    prepTimeMinutes,
    cookTimeMinutes,
    totalTimeMinutes,
    ingredientNames,
    dietLabels,
    nameLower,
    mealTypes,
    createdAtMs: tsToMs(recipe.createdAt) || Number(recipe._addedAt) || Number(recipe._createdAtMs) || 0,
    searchIndex: Number(recipe._searchIndex) || 0,
  };

  base.inferredDietFlags = inferDietFlags(base);
  return base;
}

function inCalorieRange(norm, filters) {
  let min = 0;
  let max = Infinity;
  if (filters.calorieRange === '0-200') {
    min = 0;
    max = 200;
  } else if (filters.calorieRange === '200-400') {
    min = 200;
    max = 400;
  } else if (filters.calorieRange === '400-600') {
    min = 400;
    max = 600;
  } else if (filters.calorieRange === 'custom') {
    const a = parseFloat(filters.calorieMin);
    const b = parseFloat(filters.calorieMax);
    if (Number.isFinite(a)) min = a;
    if (Number.isFinite(b)) max = b;
  } else {
    return true;
  }
  const k = norm.caloriesPerServing;
  if (k <= 0 && max < Infinity) return false;
  return k >= min && k <= max;
}

function inMacroRange(val, rangeKey) {
  if (!rangeKey) return true;
  if (rangeKey === '0-10') return val >= 0 && val < 10;
  if (rangeKey === '10-20') return val >= 10 && val < 20;
  if (rangeKey === '20+') return val >= 20;
  if (rangeKey === '0-20') return val >= 0 && val < 20;
  if (rangeKey === '20-40') return val >= 20 && val < 40;
  if (rangeKey === '40+') return val >= 40;
  if (rangeKey === '0-15') return val >= 0 && val < 15;
  if (rangeKey === '15-30') return val >= 15 && val < 30;
  if (rangeKey === '30+') return val >= 30;
  return true;
}

function prepCookMatches(minutes, selected, mode) {
  if (!selected?.length) return true;
  return selected.some((label) => {
    const n = mode === 'prep' ? minutes : minutes;
    if (label.includes('10 min')) return minutes < 10;
    if (label.includes('20 min')) return minutes < 20;
    if (label.includes('30 min')) return minutes < 30;
    if (label.includes('30+')) return minutes >= 30;
    return true;
  });
}

function totalTimeMatches(total, selected) {
  if (!selected?.length) return true;
  return selected.some((label) => {
    if (/^Quick/i.test(label)) return total <= 20;
    if (/^Medium/i.test(label)) return total > 20 && total <= 45;
    if (/^Long/i.test(label)) return total > 45;
    return true;
  });
}

function nutritionGoalMatches(norm, goals) {
  if (!goals?.length) return true;
  const flags = norm.inferredDietFlags;
  return goals.some((g) => {
    const key = g.toLowerCase();
    if (key.includes('high protein')) return flags.has('high protein') || norm.proteinPerServing >= 25;
    if (key.includes('low calorie')) return flags.has('low calorie') || (norm.caloriesPerServing > 0 && norm.caloriesPerServing <= 350);
    if (key.includes('low carb')) return flags.has('low carb') || norm.carbsPerServing <= 15;
    if (key.includes('low fat')) return flags.has('low fat') || norm.fatPerServing <= 12;
    if (key.includes('balanced')) return flags.has('balanced');
    return false;
  });
}

function recipeLooksVegetarian(norm) {
  if (norm.dietLabels.some((d) => /vegetarian|vegan/i.test(d))) return true;
  const blob = `${norm.nameLower} ${norm.ingredientNames.join(' ')}`;
  if (MEAT.test(blob)) return false;
  return true;
}

function recipeLooksVegan(norm) {
  if (norm.dietLabels.some((d) => /vegan/i.test(d))) return true;
  const blob = `${norm.nameLower} ${norm.ingredientNames.join(' ')}`;
  if (MEAT.test(blob) || DAIRY.test(blob) || EGG.test(blob)) return false;
  return true;
}

function dietaryMatches(norm, selected) {
  if (!selected?.length) return true;
  const flags = norm.inferredDietFlags;
  return selected.every((pref) => {
    const p = pref.toLowerCase();
    if (p.includes('vegetarian') && !p.includes('vegan')) return recipeLooksVegetarian(norm);
    if (p.includes('vegan')) return recipeLooksVegan(norm);
    if (p.includes('gluten free')) {
      return flags.has('gluten free') || norm.dietLabels.some((d) => /gluten/i.test(d));
    }
    if (p.includes('dairy free')) {
      return flags.has('dairy free') || norm.dietLabels.some((d) => /dairy/i.test(d));
    }
    if (p.includes('high fiber')) return flags.has('high fiber') || norm.fiberPerServing >= 5;
    if (p.includes('keto')) return flags.has('keto-friendly') || (norm.carbsPerServing <= 12 && norm.fatPerServing >= 12);
    return true;
  });
}

export function recipeMatchesFilters(recipe, filters) {
  const norm = normalizeRecipeForFilters(recipe);

  if (filters.mealType?.length) {
    const wanted = new Set(filters.mealType);
    const hit = [...wanted].some((m) => norm.mealTypes.has(m));
    if (!hit) return false;
  }

  if (!nutritionGoalMatches(norm, filters.nutritionGoal)) return false;

  if (!inCalorieRange(norm, filters)) return false;

  if (!inMacroRange(norm.proteinPerServing, filters.proteinRange)) return false;
  if (!inMacroRange(norm.carbsPerServing, filters.carbsRange)) return false;
  if (!inMacroRange(norm.fatPerServing, filters.fatRange)) return false;

  if (filters.prepTime?.length && !prepCookMatches(norm.prepTimeMinutes, filters.prepTime, 'prep')) return false;
  if (filters.cookTime?.length && !prepCookMatches(norm.cookTimeMinutes, filters.cookTime, 'cook')) return false;
  if (filters.totalTime?.length && !totalTimeMatches(norm.totalTimeMinutes, filters.totalTime)) return false;

  const blob = `${norm.nameLower} ${norm.ingredientNames.join(' ')}`;
  if (filters.ingredientsInclude?.length) {
    const ok = filters.ingredientsInclude.every((term) => {
      const t = term.toLowerCase().trim();
      return blob.includes(t) || norm.ingredientNames.some((n) => n.includes(t));
    });
    if (!ok) return false;
  }
  if (filters.ingredientsExclude?.length) {
    const bad = filters.ingredientsExclude.some((term) => {
      const t = term.toLowerCase().trim();
      return blob.includes(t) || norm.ingredientNames.some((n) => n.includes(t));
    });
    if (bad) return false;
  }

  if (!dietaryMatches(norm, filters.dietary)) return false;

  return true;
}

export function filterRecipes(recipes, filters) {
  if (!recipes?.length) return [];
  return recipes.filter((r) => recipeMatchesFilters(r, filters));
}

export function sortRecipes(recipes, sortBy, isSearch) {
  const list = [...recipes];
  const getNorm = (r) => normalizeRecipeForFilters(r);

  switch (sortBy) {
    case 'protein_desc':
      return list.sort((a, b) => getNorm(b).proteinPerServing - getNorm(a).proteinPerServing);
    case 'calories_asc':
      return list.sort((a, b) => {
        const ca = getNorm(a).caloriesPerServing || 99999;
        const cb = getNorm(b).caloriesPerServing || 99999;
        return ca - cb;
      });
    case 'carbs_asc':
      return list.sort((a, b) => getNorm(a).carbsPerServing - getNorm(b).carbsPerServing);
    case 'fat_asc':
      return list.sort((a, b) => getNorm(a).fatPerServing - getNorm(b).fatPerServing);
    case 'time_asc':
      return list.sort((a, b) => getNorm(a).totalTimeMinutes - getNorm(b).totalTimeMinutes);
    case 'recent_desc':
      return list.sort((a, b) => getNorm(b).createdAtMs - getNorm(a).createdAtMs);
    case 'relevance':
    default:
      if (isSearch) return list.sort((a, b) => (a._searchIndex || 0) - (b._searchIndex || 0));
      return list;
  }
}

export function countActiveFilters(filters) {
  if (!filters) return 0;
  let n = 0;
  n += filters.mealType?.length || 0;
  n += filters.nutritionGoal?.length || 0;
  if (filters.calorieRange) n += 1;
  if (filters.proteinRange) n += 1;
  if (filters.carbsRange) n += 1;
  if (filters.fatRange) n += 1;
  n += filters.prepTime?.length || 0;
  n += filters.cookTime?.length || 0;
  n += filters.totalTime?.length || 0;
  n += filters.ingredientsInclude?.length || 0;
  n += filters.ingredientsExclude?.length || 0;
  n += filters.dietary?.length || 0;
  return n;
}

/** Remove one chip by descriptor id: "mealType:Breakfast", "calorieRange", "sortBy", "include:chicken" */
export function removeFilterByChipId(filters, chipId) {
  const next = { ...filters, mealType: [...(filters.mealType || [])], nutritionGoal: [...(filters.nutritionGoal || [])], prepTime: [...(filters.prepTime || [])], cookTime: [...(filters.cookTime || [])], totalTime: [...(filters.totalTime || [])], ingredientsInclude: [...(filters.ingredientsInclude || [])], ingredientsExclude: [...(filters.ingredientsExclude || [])], dietary: [...(filters.dietary || [])] };

  if (chipId === 'calorieRange') {
    next.calorieRange = null;
    next.calorieMin = '';
    next.calorieMax = '';
  } else if (chipId === 'proteinRange') next.proteinRange = null;
  else if (chipId === 'carbsRange') next.carbsRange = null;
  else if (chipId === 'fatRange') next.fatRange = null;
  else if (chipId === 'sortBy') next.sortBy = 'relevance';
  else if (chipId.startsWith('mealType:')) {
    const v = chipId.slice('mealType:'.length);
    next.mealType = next.mealType.filter((x) => x !== v);
  } else if (chipId.startsWith('nutritionGoal:')) {
    const v = chipId.slice('nutritionGoal:'.length);
    next.nutritionGoal = next.nutritionGoal.filter((x) => x !== v);
  } else if (chipId.startsWith('prepTime:')) {
    const v = chipId.slice('prepTime:'.length);
    next.prepTime = next.prepTime.filter((x) => x !== v);
  } else if (chipId.startsWith('cookTime:')) {
    const v = chipId.slice('cookTime:'.length);
    next.cookTime = next.cookTime.filter((x) => x !== v);
  } else if (chipId.startsWith('totalTime:')) {
    const v = chipId.slice('totalTime:'.length);
    next.totalTime = next.totalTime.filter((x) => x !== v);
  } else if (chipId.startsWith('dietary:')) {
    const v = chipId.slice('dietary:'.length);
    next.dietary = next.dietary.filter((x) => x !== v);
  } else if (chipId.startsWith('include:')) {
    const v = chipId.slice('include:'.length);
    next.ingredientsInclude = next.ingredientsInclude.filter((x) => x !== v);
  } else if (chipId.startsWith('exclude:')) {
    const v = chipId.slice('exclude:'.length);
    next.ingredientsExclude = next.ingredientsExclude.filter((x) => x !== v);
  }
  return next;
}

export function buildFilterChips(filters) {
  const chips = [];
  (filters.mealType || []).forEach((v) => chips.push({ id: `mealType:${v}`, label: v }));
  (filters.nutritionGoal || []).forEach((v) => chips.push({ id: `nutritionGoal:${v}`, label: v }));
  if (filters.calorieRange) {
    let lbl = filters.calorieRange;
    if (filters.calorieRange === 'custom' && (filters.calorieMin || filters.calorieMax)) {
      lbl = `${filters.calorieMin || '0'}–${filters.calorieMax || '∞'} kcal`;
    } else if (filters.calorieRange === '0-200') lbl = '0–200 kcal';
    else if (filters.calorieRange === '200-400') lbl = '200–400 kcal';
    else if (filters.calorieRange === '400-600') lbl = '400–600 kcal';
    chips.push({ id: 'calorieRange', label: lbl });
  }
  if (filters.proteinRange) chips.push({ id: 'proteinRange', label: `Protein: ${filters.proteinRange}` });
  if (filters.carbsRange) chips.push({ id: 'carbsRange', label: `Carbs: ${filters.carbsRange}` });
  if (filters.fatRange) chips.push({ id: 'fatRange', label: `Fat: ${filters.fatRange}` });
  (filters.prepTime || []).forEach((v) => chips.push({ id: `prepTime:${v}`, label: `Prep: ${v}` }));
  (filters.cookTime || []).forEach((v) => chips.push({ id: `cookTime:${v}`, label: `Cook: ${v}` }));
  (filters.totalTime || []).forEach((v) => chips.push({ id: `totalTime:${v}`, label: v }));
  (filters.ingredientsInclude || []).forEach((v) => chips.push({ id: `include:${v}`, label: `+ ${v}` }));
  (filters.ingredientsExclude || []).forEach((v) => chips.push({ id: `exclude:${v}`, label: `− ${v}` }));
  (filters.dietary || []).forEach((v) => chips.push({ id: `dietary:${v}`, label: v }));
  if (filters.sortBy && filters.sortBy !== 'relevance') {
    const so = SORT_OPTIONS.find((o) => o.value === filters.sortBy);
    chips.push({ id: 'sortBy', label: `Sort: ${so?.label || filters.sortBy}` });
  }
  return chips;
}
