/**
 * Scale recipe ingredient amounts when the user changes "servings" vs the recipe's base yield.
 */

/** Vulgar fractions (single Unicode code points) → numeric value */
const UNICODE_FRAC = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

const UNICODE_FRAC_ALT = Object.keys(UNICODE_FRAC)
  .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');

/**
 * @param {object} recipe
 * @returns {number} Recipe yield the ingredient amounts are written for (min 0.01).
 */
export function getRecipeBaseServings(recipe) {
  const n = Number(recipe?.servings);
  if (Number.isFinite(n) && n > 0) return n;
  return 1;
}

/** Remove embedded “(💙 N saves)” style snippets from API descriptions. */
export function stripSavesSnippetFromDescription(desc) {
  if (desc == null || typeof desc !== 'string') return '';
  let s = desc
    .replace(/\s*\(?\s*💙\s*[\d.,\s]*\s*saves?\s*\)?/gi, '')
    .replace(/\s*\(\s*💙\s*[^)]*saves?\s*\)/gi, '')
    .replace(/\s*·\s*[\d.,\s]+\s*saves?/gi, '');
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

/**
 * Parse a leading numeric from an amount string; return value and the remainder (units, words).
 * @returns {{ value: number, rest: string } | null}
 */
export function parseLeadingIngredientQuantity(str) {
  const s = String(str ?? '').trim();
  if (!s) return null;

  const u0 = s[0];
  if (UNICODE_FRAC[u0] !== undefined) {
    return { value: UNICODE_FRAC[u0], rest: s.slice(1).trim() };
  }

  // e.g. "1½ tsp", "2⅓ cup"
  const digitUnicodeFrac = new RegExp(`^(\\d+)(${UNICODE_FRAC_ALT})\\s*(.*)$`);
  let m = s.match(digitUnicodeFrac);
  if (m) {
    const whole = Number(m[1]);
    const fracVal = UNICODE_FRAC[m[2]];
    if (Number.isFinite(whole) && fracVal !== undefined) {
      return { value: whole + fracVal, rest: (m[3] || '').trim() };
    }
  }

  // e.g. "1 1/2 cups"
  m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\s*(.*)$/);
  if (m) {
    const b = Number(m[3]);
    if (b) return { value: Number(m[1]) + Number(m[2]) / b, rest: (m[4] || '').trim() };
  }

  m = s.match(/^(\d+)\s*\/\s*(\d+)\s*(.*)$/);
  if (m) {
    const b = Number(m[2]);
    if (b) return { value: Number(m[1]) / b, rest: (m[3] || '').trim() };
  }

  m = s.match(/^([\d.,]+)\s*(.*)$/);
  if (m) {
    const v = parseFloat(m[1].replace(',', '.'));
    if (Number.isFinite(v)) return { value: v, rest: (m[2] || '').trim() };
  }

  return null;
}

export function formatScaledQuantity(n) {
  if (!Number.isFinite(n)) return '';
  const r = Math.round(n * 10000) / 10000;
  if (Math.abs(r - Math.round(r)) < 1e-4) return String(Math.round(r));
  const t = Math.round(r * 1000) / 1000;
  let out = String(t);
  if (out.includes('.')) {
    out = out.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.$/, '');
  }
  return out;
}

/**
 * FatSecret-style: amount + unit. User recipes: grams, or quantity + servingLabel.
 * @returns {{ amountStr: string, unitStr: string }}
 */
export function getIngredientAmountParts(ing) {
  const a = String(ing?.amount ?? '').trim();
  const u = String(ing?.unit ?? '').trim();
  if (a || u) return { amountStr: a, unitStr: u };

  const grams = Number(ing?.grams);
  if (Number.isFinite(grams) && grams > 0) {
    return { amountStr: String(grams), unitStr: 'g' };
  }

  const q = Number(ing?.quantity);
  if (Number.isFinite(q)) {
    const sl = String(ing?.servingLabel ?? '').trim();
    return { amountStr: String(q), unitStr: sl };
  }

  return { amountStr: '', unitStr: '' };
}

/**
 * One-line amount for an ingredient after scaling.
 * @param {object} ing { amount?, unit?, name?, grams?, quantity?, servingLabel? }
 * @param {number} scaleFactor selectedServings / recipeBaseServings
 */
export function scaledIngredientAmountLine(ing, scaleFactor) {
  if (!Number.isFinite(scaleFactor) || scaleFactor <= 0) scaleFactor = 1;

  const { amountStr, unitStr } = getIngredientAmountParts(ing);
  const combined = [amountStr, unitStr].filter(Boolean).join(' ').trim();

  const scaleParsedString = (sourceStr) => {
    const parsed = parseLeadingIngredientQuantity(sourceStr);
    if (!parsed) return null;
    const v = parsed.value * scaleFactor;
    const formatted = formatScaledQuantity(v);
    const tail = parsed.rest.trim();
    return tail ? `${formatted} ${tail}`.trim() : formatted;
  };

  if (combined) {
    const line = scaleParsedString(combined);
    if (line) return line;
  }

  const name = String(ing?.name ?? '').trim();
  if (name) {
    const fromName = scaleParsedString(name);
    if (fromName) return fromName;
  }

  return combined || name;
}

/** True if ingredient uses structured amount fields (not quantity-in-name-only). */
export function ingredientHasStructuredAmount(ing) {
  const { amountStr, unitStr } = getIngredientAmountParts(ing);
  return !!(amountStr || unitStr);
}

export function scaledIngredientMacros(ing, scaleFactor) {
  if (!Number.isFinite(scaleFactor) || scaleFactor <= 0) scaleFactor = 1;
  const nu = ing?.nutrients || {};
  const carbs =
    Number(ing?.carbs ?? ing?.carbohydrate ?? nu.carbs ?? nu.carbohydrate) || 0;
  const kcal = Number(ing?.calories ?? nu.kcal ?? nu.calories) || 0;
  return {
    calories: Math.round(kcal * scaleFactor),
    protein: Math.round((Number(ing?.protein ?? nu.protein) || 0) * scaleFactor * 10) / 10,
    carbs: Math.round(carbs * scaleFactor * 10) / 10,
    fat: Math.round((Number(ing?.fat ?? nu.fat) || 0) * scaleFactor * 10) / 10,
  };
}
