/** Coerce to a finite number for UI (null/undefined/NaN → fallback). */
export function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
