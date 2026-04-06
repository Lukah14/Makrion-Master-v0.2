const AGE_MIN = 13;
const AGE_MAX = 120;
const HEIGHT_CM_MIN = 100;
const HEIGHT_CM_MAX = 250;
const WEIGHT_KG_MIN = 30;
const WEIGHT_KG_MAX = 400;

export function parsePositiveInt(s, min, max) {
  const n = parseInt(String(s).trim(), 10);
  if (!Number.isFinite(n) || n < min || n > max) return { ok: false, error: `Must be between ${min} and ${max}` };
  return { ok: true, value: n };
}

export function parsePositiveNumber(s, min, max, decimals = true) {
  const n = parseFloat(String(s).replace(',', '.').trim());
  if (!Number.isFinite(n) || n < min || n > max) {
    return { ok: false, error: `Must be between ${min} and ${max}` };
  }
  return { ok: true, value: decimals ? Math.round(n * 1000) / 1000 : Math.round(n) };
}

export function validateAge(s) {
  return parsePositiveInt(s, AGE_MIN, AGE_MAX);
}

export function validateHeightCm(s) {
  return parsePositiveNumber(s, HEIGHT_CM_MIN, HEIGHT_CM_MAX);
}

export function validateWeightKg(s) {
  return parsePositiveNumber(s, WEIGHT_KG_MIN, WEIGHT_KG_MAX);
}

export function validateMacroGrams(s) {
  const n = parseFloat(String(s).replace(',', '.').trim());
  if (!Number.isFinite(n) || n < 0 || n > 1000) {
    return { ok: false, error: 'Must be between 0 and 1000 g' };
  }
  return { ok: true, value: Math.round(n * 10) / 10 };
}

export function validateCalories(s) {
  const n = parseInt(String(s).trim(), 10);
  if (!Number.isFinite(n) || n < 0 || n > 20000) {
    return { ok: false, error: 'Must be between 0 and 20000 kcal' };
  }
  return { ok: true, value: n };
}

export function validateDateKey(s) {
  const t = String(s || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return { ok: false, error: 'Use YYYY-MM-DD' };
  return { ok: true, value: t };
}
