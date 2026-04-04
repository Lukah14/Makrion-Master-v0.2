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

  const isGramServing =
    description.toLowerCase() === 'g' ||
    description.toLowerCase() === '1 g' ||
    (description.match(/^[\d.]+ ?g$/i) && !description.includes('('));

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
    displayLabel: formatServingLabel(description, metricAmount, metricUnit, isGramServing),
  };
}

export function normalizeServingsFromDetail(foodData) {
  const servingsRaw = foodData?.servings?.serving;
  if (!servingsRaw) return [];
  const arr = Array.isArray(servingsRaw) ? servingsRaw : [servingsRaw];
  return arr.map((raw, i) => normalizeServing(raw, i));
}

export function selectBestServing(servings) {
  if (!servings || servings.length === 0) return null;
  const defaultServing = servings.find((s) => s.isDefault);
  if (defaultServing) return defaultServing;
  const nonGram = servings.find((s) => !s.isGramServing);
  if (nonGram) return nonGram;
  return servings[0];
}

export function selectGramServing(servings) {
  if (!servings || servings.length === 0) return null;
  return servings.find((s) => s.isGramServing) || null;
}

export function formatServingLabel(description, metricAmount, metricUnit, isGramServing) {
  if (!description) return '1 serving';
  const desc = description.trim();

  if (isGramServing || /^[\d.]+ ?g$/i.test(desc)) {
    return 'grams';
  }

  if (metricAmount > 0 && (metricUnit === 'g' || metricUnit === 'ml')) {
    const alreadyHasMetric = desc.includes('(') && desc.includes(')');
    if (alreadyHasMetric) return desc;
    const rounded = metricAmount % 1 === 0 ? metricAmount : round1(metricAmount);
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
      displayLabel: formatServingLabel(description, metricGrams, 'g', false),
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

  const { servings, defaultServing } = buildServingsFromSearchHit({
    ...raw,
    serving,
    calories: cals,
    protein: prot,
    carbs,
    fat,
  });

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
    const key = s.displayLabel.toLowerCase();
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
  if (!serving.isGramServing) return 1;
  if (serving.referenceGrams > 0) return serving.referenceGrams;
  if (serving.id === 'user_original' && serving.metricAmount > 0) return serving.metricAmount;
  return 100;
}
