/**
 * FatSecret Platform API (server-side). Used by Firebase Callable `fatsecretProxy`.
 * @param {Record<string, unknown>} payload
 * @param {{ clientId: string, clientSecret: string }} creds
 * @returns {Promise<Record<string, unknown>>}
 */
'use strict';

const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
const API_URL = 'https://platform.fatsecret.com/rest/server.api';

/** @type {{ value: string, expiresAt: number } | null} */
let cachedToken = null;

/**
 * @param {string} clientId
 * @param {string} clientSecret
 */
async function getAccessToken(clientId, clientSecret) {
  const id = String(clientId || '').trim();
  const secret = String(clientSecret || '').trim();
  if (!id || !secret) {
    throw new Error(
      'FatSecret credentials missing: set secrets FATSECRET_CLIENT_ID and FATSECRET_CLIENT_SECRET (firebase functions:secrets:set).',
    );
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(`${id}:${secret}`, 'utf8').toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=basic premier',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token fetch failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

/** @param {string} desc */
function parseDescription(desc) {
  const cal = parseFloat(desc.match(/Calories:\s*([\d.]+)/i)?.[1] ?? '0') || 0;
  const fat = parseFloat(desc.match(/Fat:\s*([\d.]+)/i)?.[1] ?? '0') || 0;
  const carbs = parseFloat(desc.match(/Carbs:\s*([\d.]+)/i)?.[1] ?? '0') || 0;
  const prot = parseFloat(desc.match(/Protein:\s*([\d.]+)/i)?.[1] ?? '0') || 0;
  const serving = desc.match(/^([^-]+)-/)?.[1]?.trim() ?? '1 serving';
  return { cal, fat, carbs, prot, serving };
}

/** @param {Record<string, unknown>} item */
function mapFood(item) {
  const desc = String(item.food_description ?? '');
  const { cal, fat, carbs, prot, serving } = parseDescription(desc);

  return {
    id: String(item.food_id ?? ''),
    name: String(item.food_name ?? ''),
    brand: item.brand_name ? String(item.brand_name) : null,
    category: item.food_type ? String(item.food_type) : null,
    calories: Math.round(cal),
    protein: Math.round(prot * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    serving,
    image: null,
    source: 'fatsecret',
  };
}

/** @param {unknown} val */
function safeFloat(val) {
  const n = parseFloat(String(val ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

/** @param {number} n */
function round1(n) {
  return Math.round(n * 10) / 10;
}

/** @param {Record<string, unknown>} raw @param {string[]} keys */
function pickRaw(raw, ...keys) {
  for (const k of keys) {
    const v = raw[k];
    if (v != null && v !== '') return v;
  }
  return undefined;
}

/** @param {Record<string, unknown>} raw @param {number} index */
function mapServing(raw, index) {
  const metricAmount = safeFloat(pickRaw(raw, 'metric_serving_amount', 'metricServingAmount'));
  const metricUnit = String(pickRaw(raw, 'metric_serving_unit', 'metricServingUnit') ?? '');
  const numberOfUnits = safeFloat(pickRaw(raw, 'number_of_units', 'numberOfUnits')) || 1;
  const description = String(pickRaw(raw, 'serving_description', 'description') ?? '1 serving');
  const isDef = pickRaw(raw, 'is_default', 'isDefault');
  const isDefault = isDef === '1' || isDef === true || isDef === 1;

  const sid = pickRaw(raw, 'serving_id', 'id', 'servingId');
  const idStr = sid != null && String(sid).trim() !== '' ? String(sid) : `fs_${index}`;

  return {
    id: idStr,
    description,
    numberOfUnits,
    metricAmount,
    metricUnit,
    isDefault,
    calories: Math.round(safeFloat(pickRaw(raw, 'calories'))),
    protein: round1(safeFloat(pickRaw(raw, 'protein'))),
    carbohydrate: round1(safeFloat(pickRaw(raw, 'carbohydrate', 'carbs'))),
    fat: round1(safeFloat(pickRaw(raw, 'fat'))),
    saturated_fat: round1(safeFloat(pickRaw(raw, 'saturated_fat', 'saturatedFat'))),
    trans_fat: round1(safeFloat(pickRaw(raw, 'trans_fat', 'transFat'))),
    polyunsaturated_fat: round1(safeFloat(pickRaw(raw, 'polyunsaturated_fat', 'polyunsaturatedFat'))),
    monounsaturated_fat: round1(safeFloat(pickRaw(raw, 'monounsaturated_fat', 'monounsaturatedFat'))),
    fiber: round1(safeFloat(pickRaw(raw, 'fiber'))),
    sugar: round1(safeFloat(pickRaw(raw, 'sugar'))),
    cholesterol: Math.round(safeFloat(pickRaw(raw, 'cholesterol'))),
    sodium: Math.round(safeFloat(pickRaw(raw, 'sodium'))),
    potassium: Math.round(safeFloat(pickRaw(raw, 'potassium'))),
  };
}

/** @param {Record<string, unknown>} foodData */
function mapFoodDetail(foodData) {
  const sRoot = foodData.servings;
  let servingsArr = [];
  if (Array.isArray(sRoot)) {
    servingsArr = sRoot;
  } else if (sRoot && typeof sRoot === 'object') {
    const servingsRaw = /** @type {Record<string, unknown>} */ (sRoot).serving;
    servingsArr = Array.isArray(servingsRaw)
      ? servingsRaw
      : servingsRaw
        ? [servingsRaw]
        : [];
  }
  const servings = servingsArr.map((row, i) => mapServing(/** @type {Record<string, unknown>} */ (row), i));

  return {
    id: String(foodData.food_id ?? ''),
    name: String(foodData.food_name ?? ''),
    brand: foodData.brand_name ? String(foodData.brand_name) : null,
    category: foodData.food_type ? String(foodData.food_type) : null,
    servings,
    source: 'fatsecret',
  };
}

/** @param {Record<string, unknown>} item */
function mapRecipe(item) {
  const desc = String(item.recipe_description ?? '');
  const rating = item.rating ? parseFloat(String(item.rating)) : 0;
  const cookTime = item.cooking_time_min ? parseInt(String(item.cooking_time_min), 10) : 0;
  const prepTime = item.preparation_time_min ? parseInt(String(item.preparation_time_min), 10) : 0;
  const servings = item.number_of_servings ? parseInt(String(item.number_of_servings), 10) : 1;

  const nutrition = /** @type {Record<string, unknown>} */ (item.recipe_nutrition ?? {});
  const calories = nutrition.calories ? Math.round(parseFloat(String(nutrition.calories))) : 0;
  const protein = nutrition.protein ? Math.round(parseFloat(String(nutrition.protein)) * 10) / 10 : 0;
  const carbs = nutrition.carbohydrate ? Math.round(parseFloat(String(nutrition.carbohydrate)) * 10) / 10 : 0;
  const fat = nutrition.fat ? Math.round(parseFloat(String(nutrition.fat)) * 10) / 10 : 0;
  const fiber = nutrition.fiber ? Math.round(parseFloat(String(nutrition.fiber)) * 10) / 10 : 0;
  const sugar = nutrition.sugar ? Math.round(parseFloat(String(nutrition.sugar)) * 10) / 10 : 0;
  const sodium = nutrition.sodium ? Math.round(parseFloat(String(nutrition.sodium))) : 0;
  const saturatedFat = nutrition.saturated_fat ? Math.round(parseFloat(String(nutrition.saturated_fat)) * 10) / 10 : 0;
  const cholesterol = nutrition.cholesterol ? Math.round(parseFloat(String(nutrition.cholesterol))) : 0;

  const imagesRaw = /** @type {Record<string, unknown>} */ (item.recipe_images ?? {});
  const imagesArr = imagesRaw.recipe_image
    ? Array.isArray(imagesRaw.recipe_image)
      ? imagesRaw.recipe_image
      : [imagesRaw.recipe_image]
    : [];
  const image = imagesArr.length > 0 ? String(imagesArr[0]) : null;

  const typesRaw = /** @type {Record<string, unknown>} */ (item.recipe_types ?? {});
  const typesArr = typesRaw.recipe_type
    ? Array.isArray(typesRaw.recipe_type)
      ? typesRaw.recipe_type
      : [typesRaw.recipe_type]
    : [];

  const categoriesRaw = /** @type {Record<string, unknown>} */ (item.recipe_categories ?? {});
  const categoriesArr = categoriesRaw.recipe_category
    ? Array.isArray(categoriesRaw.recipe_category)
      ? categoriesRaw.recipe_category.map((c) =>
          String(/** @type {Record<string, unknown>} */ (c).recipe_category_name ?? c),
        )
      : [
          String(
            /** @type {Record<string, unknown>} */ (categoriesRaw.recipe_category).recipe_category_name
              ?? categoriesRaw.recipe_category,
          ),
        ]
    : [];

  const ingredientsRaw = /** @type {Record<string, unknown>} */ (item.ingredients ?? {});
  const ingredientsArr = ingredientsRaw.ingredient
    ? Array.isArray(ingredientsRaw.ingredient)
      ? ingredientsRaw.ingredient
      : [ingredientsRaw.ingredient]
    : [];
  const ingredients = ingredientsArr.map((ing) => {
    const x = /** @type {Record<string, unknown>} */ (ing);
    return {
      name: String(x.ingredient_description ?? x.food_name ?? ''),
      amount: String(x.serving_amount ?? ''),
      unit: String(x.measurement_description ?? ''),
      calories: x.calories ? Math.round(parseFloat(String(x.calories))) : 0,
      protein: x.protein ? Math.round(parseFloat(String(x.protein)) * 10) / 10 : 0,
      carbs: x.carbohydrate ? Math.round(parseFloat(String(x.carbohydrate)) * 10) / 10 : 0,
      fat: x.fat ? Math.round(parseFloat(String(x.fat)) * 10) / 10 : 0,
      foodId: x.food_id ? String(x.food_id) : null,
    };
  });

  const directionsRaw = /** @type {Record<string, unknown>} */ (item.directions ?? {});
  const directionsArr = directionsRaw.direction
    ? Array.isArray(directionsRaw.direction)
      ? directionsRaw.direction
      : [directionsRaw.direction]
    : [];
  const instructions = directionsArr.map((d) => {
    const x = /** @type {Record<string, unknown>} */ (d);
    return {
      step: parseInt(String(x.direction_number ?? '1'), 10),
      text: String(x.direction_description ?? ''),
      ingredients: [],
    };
  });

  return {
    id: String(item.recipe_id ?? ''),
    name: String(item.recipe_name ?? ''),
    description: desc,
    rating: Math.round(rating * 10) / 10,
    cookTime,
    prepTime,
    totalTime: cookTime + prepTime,
    servings,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    sodium,
    saturatedFat,
    cholesterol,
    image,
    types: typesArr.map(String),
    categories: categoriesArr,
    ingredients,
    instructions,
    source: 'fatsecret',
  };
}

/**
 * @param {Record<string, unknown>} payload
 * @param {{ clientId: string, clientSecret: string }} creds
 */
async function runFatSecretProxy(payload, creds) {
  const action = String(payload.action ?? 'search');
  const token = await getAccessToken(creds.clientId, creds.clientSecret);

  if (action === 'search') {
    const query = String(payload.q ?? '');
    const page = parseInt(String(payload.page ?? '0'), 10);
    const maxResults = parseInt(String(payload.max_results ?? '20'), 10);

    if (!query.trim()) {
      return { foods: [], totalResults: 0 };
    }

    const params = new URLSearchParams({
      method: 'foods.search',
      search_expression: query,
      format: 'json',
      page_number: String(page),
      max_results: String(maxResults),
    });

    const res = await fetch(`${API_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`FatSecret API error: ${res.status} ${text}`);
    }

    const data = await res.json();
    const foodsRaw = data?.foods?.food ?? [];
    const foodsArr = Array.isArray(foodsRaw) ? foodsRaw : [foodsRaw];
    const totalResults = parseInt(data?.foods?.total_results ?? '0', 10);

    const foods = foodsArr.map((x) => mapFood(/** @type {Record<string, unknown>} */ (x)));

    return { foods, totalResults };
  }

  if (action === 'get') {
    const foodId = String(payload.food_id ?? '');
    if (!foodId) {
      return { error: 'food_id required' };
    }

    const params = new URLSearchParams({
      method: 'food.get.v4',
      food_id: foodId,
      format: 'json',
    });

    const res = await fetch(`${API_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`FatSecret API error: ${res.status} ${text}`);
    }

    const data = await res.json();
    const foodDetail = data?.food ? mapFoodDetail(/** @type {Record<string, unknown>} */ (data.food)) : null;
    return { food: foodDetail };
  }

  if (action === 'recipes') {
    const query = String(payload.q ?? '');
    const page = parseInt(String(payload.page ?? '0'), 10);
    const maxResults = parseInt(String(payload.max_results ?? '20'), 10);
    const recipeType = String(payload.recipe_type ?? '');
    const maxCookTime = String(payload.max_cook_time ?? '');

    const params = new URLSearchParams({
      method: 'recipes.search.v3',
      format: 'json',
      page_number: String(page),
      max_results: String(maxResults),
    });

    if (query.trim()) params.set('search_expression', query.trim());
    if (recipeType) params.set('recipe_type', recipeType);
    if (maxCookTime) params.set('max_total_cook_time_in_minutes', maxCookTime);

    const res = await fetch(`${API_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`FatSecret recipes API error: ${res.status} ${text}`);
    }

    const data = await res.json();
    const raw = data?.recipes?.recipe ?? [];
    const arr = Array.isArray(raw) ? raw : [raw];
    const totalResults = parseInt(data?.recipes?.total_results ?? String(arr.length), 10);

    return { recipes: arr.map((x) => mapRecipe(/** @type {Record<string, unknown>} */ (x))), totalResults };
  }

  if (action === 'recipe_get') {
    const recipeId = String(payload.recipe_id ?? '');
    if (!recipeId) {
      return { error: 'recipe_id required' };
    }

    const params = new URLSearchParams({
      method: 'recipe.get.v2',
      recipe_id: recipeId,
      format: 'json',
    });

    const res = await fetch(`${API_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`FatSecret recipe.get API error: ${res.status} ${text}`);
    }

    const data = await res.json();
    const recipe = data?.recipe ?? {};
    return { recipe: mapRecipe(/** @type {Record<string, unknown>} */ (recipe)) };
  }

  return { error: 'Unknown action' };
}

module.exports = { runFatSecretProxy };
