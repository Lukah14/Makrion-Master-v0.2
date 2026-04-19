import { parseDateKey, toDateKey } from '@/lib/dateKey';

/** Inclusive list of date keys from startKey through endKey. */
export function dateKeysInclusive(startKey, endKey) {
  if (!startKey || !endKey || startKey > endKey) return [];
  const out = [];
  const d = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  for (;;) {
    const k = toDateKey(d);
    out.push(k);
    if (k >= endKey) break;
    d.setDate(d.getDate() + 1);
    if (d > end) break;
  }
  return out;
}

/**
 * Current streak: consecutive calendar days ending **today**, walking backward only.
 * Today must have proof — no “yesterday anchor” (avoids inflated streaks when today is empty
 * and prevents backfilled older days from extending the *current* run).
 *
 * @param {Map<string, boolean>} meaningfulByKey
 * @param {string} todayKey
 */
export function computeDashboardCurrentStreak(meaningfulByKey, todayKey) {
  if (!meaningfulByKey?.size || !todayKey) return 0;
  if (!meaningfulByKey.get(todayKey)) return 0;
  let n = 0;
  const d = parseDateKey(todayKey);
  for (;;) {
    const k = toDateKey(d);
    if (meaningfulByKey.get(k)) {
      n += 1;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return n;
}

/**
 * Longest run of consecutive meaningful days within sorted keys (chronological order).
 * Historical backfill can create longer past runs; this does not change *current* streak logic.
 *
 * @param {string[]} sortedKeys ascending YYYY-MM-DD
 * @param {Map<string, boolean>} meaningfulByKey
 */
export function computeBestStreakInRange(sortedKeys, meaningfulByKey) {
  let best = 0;
  let run = 0;
  let prevKey = null;

  for (const k of sortedKeys) {
    if (!meaningfulByKey.get(k)) {
      run = 0;
      prevKey = null;
      continue;
    }
    if (prevKey == null) {
      run = 1;
    } else {
      const a = parseDateKey(prevKey);
      const b = parseDateKey(k);
      const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    }
    best = Math.max(best, run);
    prevKey = k;
  }
  return best;
}
