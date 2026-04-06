import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CLIENT_ID = Deno.env.get("FATSECRET_CLIENT_ID") ?? "776c1ea1a5f649a9ab30f052d7c606fa";
const CLIENT_SECRET = Deno.env.get("FATSECRET_CLIENT_SECRET") ?? "f9d7032b745c4bc19a50b2ae7ec490f4";
const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const API_URL = "https://platform.fatsecret.com/rest/server.api";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=basic premier",
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

function parseDescription(desc: string) {
  const cal = parseFloat(desc.match(/Calories:\s*([\d.]+)/i)?.[1] ?? "0") || 0;
  const fat = parseFloat(desc.match(/Fat:\s*([\d.]+)/i)?.[1] ?? "0") || 0;
  const carbs = parseFloat(desc.match(/Carbs:\s*([\d.]+)/i)?.[1] ?? "0") || 0;
  const prot = parseFloat(desc.match(/Protein:\s*([\d.]+)/i)?.[1] ?? "0") || 0;
  const serving = desc.match(/^([^-]+)-/)?.[1]?.trim() ?? "1 serving";
  return { cal, fat, carbs, prot, serving };
}

function mapFood(item: Record<string, unknown>) {
  const desc = String(item.food_description ?? "");
  const { cal, fat, carbs, prot, serving } = parseDescription(desc);

  return {
    id: String(item.food_id ?? ""),
    name: String(item.food_name ?? ""),
    brand: item.brand_name ? String(item.brand_name) : null,
    category: item.food_type ? String(item.food_type) : null,
    calories: Math.round(cal),
    protein: Math.round(prot * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    serving,
    image: null,
    source: "fatsecret",
  };
}

function safeFloat(val: unknown): number {
  const n = parseFloat(String(val ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function pickRaw(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    const v = raw[k];
    if (v != null && v !== "") return v;
  }
  return undefined;
}

function mapServing(raw: Record<string, unknown>, index: number) {
  const metricAmount = safeFloat(pickRaw(raw, "metric_serving_amount", "metricServingAmount"));
  const metricUnit = String(pickRaw(raw, "metric_serving_unit", "metricServingUnit") ?? "");
  const numberOfUnits = safeFloat(pickRaw(raw, "number_of_units", "numberOfUnits")) || 1;
  const description = String(pickRaw(raw, "serving_description", "description") ?? "1 serving");
  const isDef = pickRaw(raw, "is_default", "isDefault");
  const isDefault = isDef === "1" || isDef === true || isDef === 1;

  const sid = pickRaw(raw, "serving_id", "id", "servingId");
  const idStr = sid != null && String(sid).trim() !== "" ? String(sid) : `fs_${index}`;

  return {
    id: idStr,
    description,
    numberOfUnits,
    metricAmount,
    metricUnit,
    isDefault,
    calories: Math.round(safeFloat(pickRaw(raw, "calories"))),
    protein: round1(safeFloat(pickRaw(raw, "protein"))),
    carbohydrate: round1(safeFloat(pickRaw(raw, "carbohydrate", "carbs"))),
    fat: round1(safeFloat(pickRaw(raw, "fat"))),
    saturated_fat: round1(safeFloat(pickRaw(raw, "saturated_fat", "saturatedFat"))),
    trans_fat: round1(safeFloat(pickRaw(raw, "trans_fat", "transFat"))),
    polyunsaturated_fat: round1(safeFloat(pickRaw(raw, "polyunsaturated_fat", "polyunsaturatedFat"))),
    monounsaturated_fat: round1(safeFloat(pickRaw(raw, "monounsaturated_fat", "monounsaturatedFat"))),
    fiber: round1(safeFloat(pickRaw(raw, "fiber"))),
    sugar: round1(safeFloat(pickRaw(raw, "sugar"))),
    cholesterol: Math.round(safeFloat(pickRaw(raw, "cholesterol"))),
    sodium: Math.round(safeFloat(pickRaw(raw, "sodium"))),
    potassium: Math.round(safeFloat(pickRaw(raw, "potassium"))),
  };
}

function mapFoodDetail(foodData: Record<string, unknown>) {
  const sRoot = foodData.servings as Record<string, unknown> | unknown[] | undefined;
  let servingsArr: Record<string, unknown>[] = [];
  if (Array.isArray(sRoot)) {
    servingsArr = sRoot as Record<string, unknown>[];
  } else if (sRoot && typeof sRoot === "object") {
    const servingsRaw = (sRoot as Record<string, unknown>).serving;
    servingsArr = Array.isArray(servingsRaw)
      ? (servingsRaw as Record<string, unknown>[])
      : servingsRaw
      ? [servingsRaw as Record<string, unknown>]
      : [];
  }
  const servings = servingsArr.map((row, i) => mapServing(row, i));

  return {
    id: String(foodData.food_id ?? ""),
    name: String(foodData.food_name ?? ""),
    brand: foodData.brand_name ? String(foodData.brand_name) : null,
    category: foodData.food_type ? String(foodData.food_type) : null,
    servings,
    source: "fatsecret",
  };
}

function mapRecipe(item: Record<string, unknown>) {
  const desc = String(item.recipe_description ?? "");
  const rating = item.rating ? parseFloat(String(item.rating)) : 0;
  const cookTime = item.cooking_time_min ? parseInt(String(item.cooking_time_min)) : 0;
  const prepTime = item.preparation_time_min ? parseInt(String(item.preparation_time_min)) : 0;
  const servings = item.number_of_servings ? parseInt(String(item.number_of_servings)) : 1;

  const nutrition = (item.recipe_nutrition ?? {}) as Record<string, unknown>;
  const calories = nutrition.calories ? Math.round(parseFloat(String(nutrition.calories))) : 0;
  const protein = nutrition.protein ? Math.round(parseFloat(String(nutrition.protein)) * 10) / 10 : 0;
  const carbs = nutrition.carbohydrate ? Math.round(parseFloat(String(nutrition.carbohydrate)) * 10) / 10 : 0;
  const fat = nutrition.fat ? Math.round(parseFloat(String(nutrition.fat)) * 10) / 10 : 0;
  const fiber = nutrition.fiber ? Math.round(parseFloat(String(nutrition.fiber)) * 10) / 10 : 0;
  const sugar = nutrition.sugar ? Math.round(parseFloat(String(nutrition.sugar)) * 10) / 10 : 0;
  const sodium = nutrition.sodium ? Math.round(parseFloat(String(nutrition.sodium))) : 0;
  const saturatedFat = nutrition.saturated_fat ? Math.round(parseFloat(String(nutrition.saturated_fat)) * 10) / 10 : 0;
  const cholesterol = nutrition.cholesterol ? Math.round(parseFloat(String(nutrition.cholesterol))) : 0;

  const imagesRaw = (item.recipe_images ?? {}) as Record<string, unknown>;
  const imagesArr = imagesRaw.recipe_image
    ? Array.isArray(imagesRaw.recipe_image)
      ? imagesRaw.recipe_image
      : [imagesRaw.recipe_image]
    : [];
  const image = imagesArr.length > 0 ? String(imagesArr[0]) : null;

  const typesRaw = (item.recipe_types ?? {}) as Record<string, unknown>;
  const typesArr = typesRaw.recipe_type
    ? Array.isArray(typesRaw.recipe_type)
      ? typesRaw.recipe_type
      : [typesRaw.recipe_type]
    : [];

  const categoriesRaw = (item.recipe_categories ?? {}) as Record<string, unknown>;
  const categoriesArr = categoriesRaw.recipe_category
    ? Array.isArray(categoriesRaw.recipe_category)
      ? (categoriesRaw.recipe_category as Record<string, unknown>[]).map((c) => String(c.recipe_category_name ?? c))
      : [String((categoriesRaw.recipe_category as Record<string, unknown>).recipe_category_name ?? categoriesRaw.recipe_category)]
    : [];

  const ingredientsRaw = (item.ingredients ?? {}) as Record<string, unknown>;
  const ingredientsArr = ingredientsRaw.ingredient
    ? Array.isArray(ingredientsRaw.ingredient)
      ? ingredientsRaw.ingredient as Record<string, unknown>[]
      : [ingredientsRaw.ingredient as Record<string, unknown>]
    : [];
  const ingredients = ingredientsArr.map((ing) => ({
    name: String(ing.ingredient_description ?? ing.food_name ?? ""),
    amount: String(ing.serving_amount ?? ""),
    unit: String(ing.measurement_description ?? ""),
    calories: ing.calories ? Math.round(parseFloat(String(ing.calories))) : 0,
    protein: ing.protein ? Math.round(parseFloat(String(ing.protein)) * 10) / 10 : 0,
    carbs: ing.carbohydrate ? Math.round(parseFloat(String(ing.carbohydrate)) * 10) / 10 : 0,
    fat: ing.fat ? Math.round(parseFloat(String(ing.fat)) * 10) / 10 : 0,
    foodId: ing.food_id ? String(ing.food_id) : null,
  }));

  const directionsRaw = (item.directions ?? {}) as Record<string, unknown>;
  const directionsArr = directionsRaw.direction
    ? Array.isArray(directionsRaw.direction)
      ? directionsRaw.direction as Record<string, unknown>[]
      : [directionsRaw.direction as Record<string, unknown>]
    : [];
  const instructions = directionsArr.map((d) => ({
    step: parseInt(String(d.direction_number ?? "1")),
    text: String(d.direction_description ?? ""),
    ingredients: [],
  }));

  return {
    id: String(item.recipe_id ?? ""),
    name: String(item.recipe_name ?? ""),
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
    source: "fatsecret",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "search";

    const token = await getAccessToken();

    if (action === "search") {
      const query = url.searchParams.get("q") ?? "";
      const page = parseInt(url.searchParams.get("page") ?? "0");
      const maxResults = parseInt(url.searchParams.get("max_results") ?? "20");

      if (!query.trim()) {
        return new Response(JSON.stringify({ foods: [], totalResults: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params = new URLSearchParams({
        method: "foods.search",
        search_expression: query,
        format: "json",
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
      const totalResults = parseInt(data?.foods?.total_results ?? "0");

      const foods = foodsArr.map(mapFood);

      return new Response(JSON.stringify({ foods, totalResults }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get") {
      const foodId = url.searchParams.get("food_id") ?? "";
      if (!foodId) {
        return new Response(JSON.stringify({ error: "food_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params = new URLSearchParams({
        method: "food.get.v4",
        food_id: foodId,
        format: "json",
      });

      const res = await fetch(`${API_URL}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`FatSecret API error: ${res.status} ${text}`);
      }

      const data = await res.json();
      const foodDetail = data?.food ? mapFoodDetail(data.food as Record<string, unknown>) : null;
      return new Response(JSON.stringify({ food: foodDetail }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "recipes") {
      const query = url.searchParams.get("q") ?? "";
      const page = parseInt(url.searchParams.get("page") ?? "0");
      const maxResults = parseInt(url.searchParams.get("max_results") ?? "20");
      const recipeType = url.searchParams.get("recipe_type") ?? "";
      const maxCookTime = url.searchParams.get("max_cook_time") ?? "";

      const params = new URLSearchParams({
        method: "recipes.search.v3",
        format: "json",
        page_number: String(page),
        max_results: String(maxResults),
      });

      if (query.trim()) params.set("search_expression", query.trim());
      if (recipeType) params.set("recipe_type", recipeType);
      if (maxCookTime) params.set("max_total_cook_time_in_minutes", maxCookTime);

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
      const totalResults = parseInt(data?.recipes?.total_results ?? String(arr.length));

      return new Response(JSON.stringify({ recipes: arr.map(mapRecipe), totalResults }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "recipe_get") {
      const recipeId = url.searchParams.get("recipe_id") ?? "";
      if (!recipeId) {
        return new Response(JSON.stringify({ error: "recipe_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params = new URLSearchParams({
        method: "recipe.get.v2",
        recipe_id: recipeId,
        format: "json",
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
      return new Response(JSON.stringify({ recipe: mapRecipe(recipe) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
