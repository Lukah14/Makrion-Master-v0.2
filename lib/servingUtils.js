const NUM_FIELDS = [
  'calories', 'protein', 'carbohydrate', 'fat', 'saturated_fat',
  'trans_fat', 'polyunsaturated_fat', 'monounsaturated_fat',
  'fiber', 'sugar', 'cholesterol', 'sodium', 'potassium',
  'vitamin_a', 'vitamin_c', 'calcium', 'iron',
];

function safeFloat(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

export function normalizeServing(raw, index) {
  const metricAmount = safeFloat(raw.metric_serving_amount);
  const metricUnit = raw.metric_serving_unit || '';
  const numberOfUnits = safeFloat(raw.number_of_units) || 1;
  const description = String(raw.serving_description || '1 serving');
  const isDefault = raw.is_default === '1' || raw.is_default === true;

  const nutrition = {};
  for (const field of NUM_FIELDS) {
    nutrition[field] = safeFloat(raw[field]);
  }

  let per100g = null;
  if (metricAmount > 0 && (metricUnit === 'g' || metricUnit === 'ml' || metricUnit === 'oz')) {
    const grams = metricUnit === 'oz' ? metricAmount * 28.3495 : metricAmount;
    if (grams > 0) {
      per100g = {};
      const factor = 100 / grams;
      for (const field of NUM_FIELDS) {
        per100g[field] = round1(nutrition[field] * factor);
      }
    }
  }

  // FatSecret API rows are never "gram mode" in the UI — only `synthetic_grams` uses isGramServing.
  const isGramServing = false;

  return {
    id: raw.serving_id || `serving_${index}`,
    description,
    numberOfUnits,
    metricAmount,
    metricUnit,
    isDefault,
    isGramServing,
    nutrition,
    per100g,
    displayLabel: formatServingLabel(description, metricAmount, metricUnit),
  };
}

/**
 * FatSecret / proxy may return servings as an array, or { serving: T | T[] }.
 */
export function extractServingsRawArray(servingsNode) {
  if (servingsNode == null) return [];
  if (Array.isArray(servingsNode)) return servingsNode;
  if (typeof servingsNode === 'object' && servingsNode.serving != null) {
    const inner = servingsNode.serving;
    return Array.isArray(inner) ? inner : [inner];
  }
  return [];
}

/**
 * Map one API row (snake_case or camelCase) into the shape expected by normalizeServing.
 */
export function coalesceServingApiRaw(raw, index) {
  if (!raw || typeof raw !== 'object') {
    return {
      serving_id: `serving_${index}`,
      serving_description: '1 serving',
      number_of_units: 1,
      metric_serving_amount: 0,
      metric_serving_unit: '',
      is_default: false,
      calories: 0,
      protein: 0,
      carbohydrate: 0,
      fat: 0,
      saturated_fat: 0,
      trans_fat: 0,
      polyunsaturated_fat: 0,
      monounsaturated_fat: 0,
      fiber: 0,
      sugar: 0,
      cholesterol: 0,
      sodium: 0,
      potassium: 0,
      vitamin_a: 0,
      vitamin_c: 0,
      calcium: 0,
      iron: 0,
    };
  }
  const pick = (snake, ...alts) => {
    if (raw[snake] != null && raw[snake] !== '') return raw[snake];
    for (const k of alts) {
      if (raw[k] != null && raw[k] !== '') return raw[k];
    }
    return undefined;
  };
  const isDefRaw = pick('is_default', 'isDefault');
  const isDefault = isDefRaw === '1' || isDefRaw === true || isDefRaw === 1;
  return {
    serving_id: pick('serving_id', 'id') ?? `serving_${index}`,
    serving_description: String(pick('serving_description', 'description') ?? '1 serving'),
    number_of_units: pick('number_of_units', 'numberOfUnits') ?? 1,
    metric_serving_amount: pick('metric_serving_amount', 'metricAmount') ?? 0,
    metric_serving_unit: String(pick('metric_serving_unit', 'metricUnit') ?? ''),
    is_default: isDefault,
    calories: pick('calories') ?? 0,
    protein: pick('protein') ?? 0,
    carbohydrate: pick('carbohydrate', 'carbs') ?? 0,
    fat: pick('fat') ?? 0,
    saturated_fat: pick('saturated_fat', 'saturatedFat') ?? 0,
    trans_fat: pick('trans_fat', 'transFat') ?? 0,
    polyunsaturated_fat: pick('polyunsaturated_fat', 'polyunsaturatedFat') ?? 0,
    monounsaturated_fat: pick('monounsaturated_fat', 'monounsaturatedFat') ?? 0,
    fiber: pick('fiber') ?? 0,
    sugar: pick('sugar') ?? 0,
    cholesterol: pick('cholesterol') ?? 0,
    sodium: pick('sodium') ?? 0,
    potassium: pick('potassium') ?? 0,
    vitamin_a: pick('vitamin_a', 'vitaminA') ?? 0,
    vitamin_c: pick('vitamin_c', 'vitaminC') ?? 0,
    calcium: pick('calcium') ?? 0,
    iron: pick('iron') ?? 0,
  };
}

/**
 * Normalize all servings from a FatSecret `food` object (search detail or getFood).
 */
export function normalizeServingsFromDetail(foodData) {
  const arr = extractServingsRawArray(foodData?.servings);
  if (arr.length === 0) return [];
  const normalized = arr.map((raw, i) => normalizeServing(coalesceServingApiRaw(raw, i), i));
  const seen = new Set();
  return normalized.map((s, i) => {
    let id = String(s.id);
    if (seen.has(id)) {
      id = `${String(s.id)}__${i}`;
    }
    seen.add(id);
    return id === s.id ? s : { ...s, id };
  });
}

/** Synthetic "grams" row (manual gram amount, default 100 g). */
export const SYNTHETIC_GRAMS_ID = 'synthetic_grams';

/**
 * True for standard FatSecret "per 100 g" reference rows we replace with {@link SYNTHETIC_GRAMS_ID}.
 */
export function isRedundantPer100gApiServing(s) {
  if (!s || s.id === SYNTHETIC_GRAMS_ID || s.id === 'user_original') return false;
  const d = String(s.description || '').trim().toLowerCase();
  if (d === '100g' || d === '100 g' || d === 'per 100g' || d === 'per 100 g') return true;
  if (/^per\s+100(\.0+)?\s*g$/.test(d)) return true;
  const m = d.match(/^([\d.]+)\s*g$/);
  if (m && !d.includes('(') && Math.abs(parseFloat(m[1]) - 100) < 0.01) return true;
  return false;
}

/**
 * Prepends a single "grams" option (default 100 g, per100g math) and drops duplicate API 100 g rows.
 */
export function ensureGramsOption(servingsList) {
  if (!servingsList || servingsList.length === 0) return servingsList;

  const withoutSynth = servingsList.filter((s) => s.id !== SYNTHETIC_GRAMS_ID);
  const donor = withoutSynth.find((s) => s.per100g) || withoutSynth[0];
  if (!donor) return servingsList;

  let per100g = donor.per100g;
  if (!per100g && donor.metricAmount > 0 && donor.nutrition) {
    const grams = donor.metricUnit === 'oz' ? donor.metricAmount * 28.3495 : donor.metricAmount;
    if (grams > 0 && (donor.metricUnit === 'g' || donor.metricUnit === 'ml' || donor.metricUnit === 'oz')) {
      const f = 100 / grams;
      per100g = {};
      for (const field of NUM_FIELDS) {
        per100g[field] = round1((donor.nutrition[field] || 0) * f);
      }
    }
  }
  if (!per100g) return servingsList;

  const rest = withoutSynth.filter((s) => !isRedundantPer100gApiServing(s));

  const synthetic = {
    id: SYNTHETIC_GRAMS_ID,
    description: 'grams',
    numberOfUnits: 100,
    metricAmount: 100,
    metricUnit: 'g',
    isDefault: false,
    isGramServing: true,
    nutrition: { ...per100g },
    per100g,
    displayLabel: 'grams',
  };

  return [synthetic, ...rest.filter((s) => s.id !== SYNTHETIC_GRAMS_ID)];
}

export function selectBestServing(servings) {
  if (!servings || servings.length === 0) return null;
  const defaultServing = servings.find((s) => s.isDefault && s.id !== SYNTHETIC_GRAMS_ID);
  if (defaultServing) return defaultServing;
  const nonSynthetic = servings.find((s) => s.id !== SYNTHETIC_GRAMS_ID);
  if (nonSynthetic) return nonSynthetic;
  return servings.find((s) => s.id === SYNTHETIC_GRAMS_ID) || servings[0];
}

export function selectGramServing(servings) {
  if (!servings || servings.length === 0) return null;
  const syn = servings.find((s) => s.id === SYNTHETIC_GRAMS_ID);
  if (syn) return syn;
  return servings.find((s) => s.isGramServing) || null;
}

export function formatServingLabel(description, metricAmount, metricUnit) {
  if (!description) return '1 serving';
  const desc = description.trim();

  if (metricAmount > 0 && (metricUnit === 'g' || metricUnit === 'ml')) {
    const alreadyHasMetric = desc.includes('(') && desc.includes(')');
    if (alreadyHasMetric) return desc;
    const rounded = metricAmount % 1 === 0 ? metricAmount : round1(metricAmount);
    const withSpace = `${rounded} ${metricUnit}`.toLowerCase();
    const compact = `${rounded}${metricUnit}`.toLowerCase();
    const lower = desc.toLowerCase();
    if (lower === withSpace || lower === compact) return desc;
    return `${desc} (${rounded} ${metricUnit})`;
  }

  return desc;
}

export function calculateNutritionForServing(serving, quantity) {
  if (!serving) return null;
  const factor = quantity / serving.numberOfUnits;
  const result = {};
  for (const field of NUM_FIELDS) {
    result[field] = round1(serving.nutrition[field] * factor);
  }
  result.calories = Math.round(serving.nutrition.calories * factor);
  result.cholesterol = Math.round(serving.nutrition.cholesterol * factor);
  result.sodium = Math.round(serving.nutrition.sodium * factor);
  return result;
}

export function calculateNutritionForGrams(serving, grams) {
  if (!serving || !serving.per100g) return null;
  const factor = grams / 100;
  const result = {};
  for (const field of NUM_FIELDS) {
    result[field] = round1(serving.per100g[field] * factor);
  }
  result.calories = Math.round(serving.per100g.calories * factor);
  result.cholesterol = Math.round(serving.per100g.cholesterol * factor);
  result.sodium = Math.round(serving.per100g.sodium * factor);
  return result;
}

/**
 * Attempt to derive per-100g nutrition from a serving description and
 * the macro values that correspond to that serving.
 */
export function deriveNutritionPer100g(servingText, nutrition) {
  if (!servingText) return null;
  const s = servingText.toLowerCase().trim();

  if (s === '100g' || s === 'per 100g' || s === '100 g' ||
      s === '100ml' || s === 'per 100ml' || s === '100 ml') {
    return { ...nutrition };
  }

  const gramMatch = s.match(/\(?\s*([\d.]+)\s*g\s*\)?/);
  if (gramMatch) {
    const grams = parseFloat(gramMatch[1]);
    if (grams > 0) {
      const factor = 100 / grams;
      return {
        calories: Math.round(nutrition.calories * factor),
        protein: round1(nutrition.protein * factor),
        carbs: round1(nutrition.carbs * factor),
        fat: round1(nutrition.fat * factor),
      };
    }
  }

  const mlMatch = s.match(/\(?\s*([\d.]+)\s*ml\s*\)?/);
  if (mlMatch) {
    const ml = parseFloat(mlMatch[1]);
    if (ml > 0) {
      const factor = 100 / ml;
      return {
        calories: Math.round(nutrition.calories * factor),
        protein: round1(nutrition.protein * factor),
        carbs: round1(nutrition.carbs * factor),
        fat: round1(nutrition.fat * factor),
      };
    }
  }

  const ozMatch = s.match(/\(?\s*([\d.]+)\s*oz\s*\)?/);
  if (ozMatch) {
    const grams = parseFloat(ozMatch[1]) * 28.3495;
    if (grams > 0) {
      const factor = 100 / grams;
      return {
        calories: Math.round(nutrition.calories * factor),
        protein: round1(nutrition.protein * factor),
        carbs: round1(nutrition.carbs * factor),
        fat: round1(nutrition.fat * factor),
      };
    }
  }

  return null;
}

function nutritionStripeFromDerived(derived) {
  if (!derived) return null;
  return {
    calories: Math.round(derived.calories ?? 0),
    protein: round1(derived.protein ?? 0),
    carbohydrate: round1(derived.carbs ?? derived.carbohydrate ?? 0),
    fat: round1(derived.fat ?? 0),
    saturated_fat: 0,
    trans_fat: 0,
    polyunsaturated_fat: 0,
    monounsaturated_fat: 0,
    fiber: 0,
    sugar: 0,
    cholesterol: 0,
    sodium: 0,
  };
}

/**
 * FatSecret search hits only include one serving line — build servings for Add-to-Log
 * (listed size from API text + optional 100 g when per-100g can be derived).
 */
export function buildServingsFromSearchHit(raw) {
  const description = String(raw.serving || raw.servingText || '1 serving').trim();
  const cals = safeFloat(raw.calories);
  const prot = safeFloat(raw.protein);
  const carbs = safeFloat(raw.carbs);
  const fat = safeFloat(raw.fat);

  const nutrition = {
    calories: cals,
    protein: prot,
    carbohydrate: carbs,
    fat,
    saturated_fat: 0,
    trans_fat: 0,
    polyunsaturated_fat: 0,
    monounsaturated_fat: 0,
    fiber: 0,
    sugar: 0,
    cholesterol: 0,
    sodium: 0,
  };

  const derived = deriveNutritionPer100g(description, {
    calories: cals,
    protein: prot,
    carbs,
    fat,
  });
  const per100g = nutritionStripeFromDerived(derived);

  const sLower = description.toLowerCase();
  const isPer100 =
    sLower === '100g' ||
    sLower === '100 g' ||
    sLower === 'per 100g' ||
    sLower === 'per 100 g' ||
    /^per\s+100\s*g\b/.test(sLower) ||
    sLower === '100ml' ||
    sLower === '100 ml' ||
    /^per\s+100\s*ml\b/.test(sLower);

  const simpleGramOnly = /^\s*([\d.]+)\s*g\s*$/i.exec(description);
  const simpleMlOnly = /^\s*([\d.]+)\s*ml\s*$/i.exec(description);

  let metricGrams = 0;
  const parenG = description.match(/\(\s*([\d.]+)\s*g\s*\)/i);
  if (parenG) metricGrams = safeFloat(parenG[1]);
  if (!metricGrams) {
    const gMatch = sLower.match(/\(?\s*([\d.]+)\s*g\s*\)?/);
    if (gMatch) metricGrams = safeFloat(gMatch[1]);
  }
  if (!metricGrams) {
    const mlMatch = sLower.match(/\(?\s*([\d.]+)\s*ml\s*\)?/);
    if (mlMatch) metricGrams = safeFloat(mlMatch[1]);
  }

  const servings = [];

  const push100gOption = (isDefault) => {
    if (!per100g) return;
    servings.push({
      id: `search_100g_${servings.length}`,
      description: '100g',
      numberOfUnits: 100,
      metricAmount: 100,
      metricUnit: 'g',
      isDefault,
      isGramServing: true,
      referenceGrams: 100,
      nutrition: {
        calories: per100g.calories,
        protein: per100g.protein,
        carbohydrate: per100g.carbohydrate,
        fat: per100g.fat,
        saturated_fat: 0,
        trans_fat: 0,
        polyunsaturated_fat: 0,
        monounsaturated_fat: 0,
        fiber: 0,
        sugar: 0,
        cholesterol: 0,
        sodium: 0,
      },
      per100g,
      displayLabel: '100 g',
    });
  };

  if (isPer100 && per100g) {
    push100gOption(true);
  } else if (simpleGramOnly && per100g) {
    const g = safeFloat(simpleGramOnly[1]);
    servings.push({
      id: 'search_gram_line',
      description,
      numberOfUnits: 100,
      metricAmount: g,
      metricUnit: 'g',
      isDefault: true,
      isGramServing: true,
      referenceGrams: g,
      nutrition: {
        calories: per100g.calories,
        protein: per100g.protein,
        carbohydrate: per100g.carbohydrate,
        fat: per100g.fat,
        saturated_fat: 0,
        trans_fat: 0,
        polyunsaturated_fat: 0,
        monounsaturated_fat: 0,
        fiber: 0,
        sugar: 0,
        cholesterol: 0,
        sodium: 0,
      },
      per100g,
      displayLabel: `${g % 1 === 0 ? g : round1(g)} g`,
    });
    if (Math.abs(g - 100) > 0.5) push100gOption(false);
  } else if (simpleMlOnly && per100g) {
    const ml = safeFloat(simpleMlOnly[1]);
    servings.push({
      id: 'search_ml_line',
      description,
      numberOfUnits: 100,
      metricAmount: ml,
      metricUnit: 'ml',
      isDefault: true,
      isGramServing: true,
      referenceGrams: ml,
      nutrition: {
        calories: per100g.calories,
        protein: per100g.protein,
        carbohydrate: per100g.carbohydrate,
        fat: per100g.fat,
        saturated_fat: 0,
        trans_fat: 0,
        polyunsaturated_fat: 0,
        monounsaturated_fat: 0,
        fiber: 0,
        sugar: 0,
        cholesterol: 0,
        sodium: 0,
      },
      per100g,
      displayLabel: `${ml % 1 === 0 ? ml : round1(ml)} ml`,
    });
    if (Math.abs(ml - 100) > 0.5) push100gOption(false);
  } else if (metricGrams > 0 && per100g) {
    servings.push({
      id: 'search_listed',
      description,
      numberOfUnits: 1,
      metricAmount: metricGrams,
      metricUnit: 'g',
      isDefault: true,
      isGramServing: false,
      nutrition: { ...nutrition },
      per100g,
      displayLabel: formatServingLabel(description, metricGrams, 'g'),
    });
    if (Math.abs(metricGrams - 100) > 0.5) push100gOption(false);
  } else {
    servings.push({
      id: 'search_default',
      description,
      numberOfUnits: 1,
      metricAmount: metricGrams || 0,
      metricUnit: 'g',
      isDefault: true,
      isGramServing: false,
      nutrition: { ...nutrition },
      per100g,
      displayLabel: description.length > 40 ? `${description.slice(0, 37)}…` : description,
    });
    if (per100g) push100gOption(false);
  }

  const best = selectBestServing(servings);
  return { servings, defaultServing: best };
}

export function buildFoodModelFromSearch(raw) {
  const serving = raw.serving || '1 serving';
  const cals = raw.calories || 0;
  const prot = raw.protein || 0;
  const carbs = raw.carbs || 0;
  const fat = raw.fat || 0;

  const nutritionPer100g = deriveNutritionPer100g(serving, {
    calories: cals,
    protein: prot,
    carbs,
    fat,
  });

  let { servings, defaultServing } = buildServingsFromSearchHit({
    ...raw,
    serving,
    calories: cals,
    protein: prot,
    carbs,
    fat,
  });
  servings = ensureGramsOption(servings) || servings;
  defaultServing = selectBestServing(servings);

  return {
    id: raw.id,
    name: raw.name,
    brand: raw.brand || null,
    category: raw.category || null,
    servingText: serving,
    calories: defaultServing && !defaultServing.isGramServing
      ? Math.round(defaultServing.nutrition.calories)
      : cals,
    protein: defaultServing && !defaultServing.isGramServing
      ? round1(defaultServing.nutrition.protein)
      : prot,
    carbs: defaultServing && !defaultServing.isGramServing
      ? round1(defaultServing.nutrition.carbohydrate)
      : carbs,
    fat: defaultServing && !defaultServing.isGramServing
      ? round1(defaultServing.nutrition.fat)
      : fat,
    nutritionPer100g,
    source: raw.source || 'fatsecret',
    servings,
    defaultServing,
  };
}

export function buildFoodModelFromDetail(foodData, searchFood) {
  const servings = normalizeServingsFromDetail(foodData);
  const bestServing = selectBestServing(servings);
  const name = foodData?.food_name || searchFood?.name || '';
  const brand = foodData?.brand_name || searchFood?.brand || null;
  const category = foodData?.food_type || searchFood?.category || null;

  return {
    id: String(foodData?.food_id || searchFood?.id || ''),
    name,
    brand,
    category,
    servings,
    defaultServing: bestServing,
    servingText: bestServing ? bestServing.displayLabel : (searchFood?.servingText || '1 serving'),
    calories: bestServing ? Math.round(bestServing.nutrition.calories) : (searchFood?.calories || 0),
    protein: bestServing ? round1(bestServing.nutrition.protein) : (searchFood?.protein || 0),
    carbs: bestServing ? round1(bestServing.nutrition.carbohydrate) : (searchFood?.carbs || 0),
    fat: bestServing ? round1(bestServing.nutrition.fat) : (searchFood?.fat || 0),
    source: 'fatsecret',
  };
}

export function buildLocalFoodModel(localFood) {
  const metricAmount = localFood.serving === '100g' ? 100 :
    localFood.serving === '100ml' ? 100 : 0;
  const metricUnit = localFood.serving === '100ml' ? 'ml' : 'g';

  const serving = {
    id: 'local_default',
    description: localFood.serving || '100g',
    numberOfUnits: 1,
    metricAmount: metricAmount || 100,
    metricUnit,
    isDefault: true,
    isGramServing: localFood.serving === '100g',
    nutrition: {
      calories: localFood.calories || 0,
      protein: localFood.protein || 0,
      carbohydrate: localFood.carbs || 0,
      fat: localFood.fat || 0,
      saturated_fat: 0,
      trans_fat: 0,
      polyunsaturated_fat: 0,
      monounsaturated_fat: 0,
      fiber: 0,
      sugar: 0,
      cholesterol: 0,
      sodium: 0,
      potassium: 0,
      vitamin_a: 0,
      vitamin_c: 0,
      calcium: 0,
      iron: 0,
    },
    per100g: null,
    displayLabel: localFood.serving === '100g' ? 'grams' : (localFood.serving || '1 serving'),
  };

  if (metricAmount > 0) {
    const factor = 100 / metricAmount;
    serving.per100g = {};
    for (const field of NUM_FIELDS) {
      serving.per100g[field] = round1(serving.nutrition[field] * factor);
    }
  }

  const nutritionPer100g = serving.per100g
    ? {
        calories: Math.round(serving.per100g.calories || 0),
        protein: round1(serving.per100g.protein || 0),
        carbs: round1(serving.per100g.carbohydrate ?? serving.per100g.carbs ?? 0),
        fat: round1(serving.per100g.fat || 0),
      }
    : null;

  return {
    id: localFood.id,
    name: localFood.name,
    brand: localFood.brand || null,
    category: localFood.category || null,
    servings: [serving],
    defaultServing: serving,
    servingText: serving.displayLabel,
    calories: localFood.calories || 0,
    protein: localFood.protein || 0,
    carbs: localFood.carbs || 0,
    fat: localFood.fat || 0,
    nutritionPer100g,
    source: 'local',
    image: localFood.image || null,
  };
}

export function getServingDropdownOptions(servings) {
  if (!servings || servings.length === 0) return [];
  const seen = new Set();
  return servings.filter((s) => {
    const key = String(s.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Initial amount for food detail / add-to-log: grams in gram mode, else number of servings.
 * My Foods "original" gram portion uses the saved gram size (e.g. 50 g), not 100 g.
 */
export function defaultQuantityForServing(serving) {
  if (!serving) return 100;
  if (serving.id === SYNTHETIC_GRAMS_ID || serving.isGramServing) {
    if (serving.referenceGrams > 0) return serving.referenceGrams;
    if (serving.id === 'user_original' && serving.metricAmount > 0) return serving.metricAmount;
    return 100;
  }
  return 1;
}
