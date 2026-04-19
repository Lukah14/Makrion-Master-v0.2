import { parseDateKey, toDateKey, dateKeyRange } from '@/lib/dateKey';

/**
 * Shared streak helpers for Progress (Nutrition, Activity).
 *
 * - Build a sorted list / Set of dateKeys that count as “active” for that module.
 * - `computeCurrentStreakActiveDays`: consecutive active days ending **today** only (today required).
 * - `computeBestStreakFromSortedActiveDays`: longest run of consecutive calendar active days.
 *
 * H. Tracker uses `progressHabits.js` (neutral/success/fail per day) instead of a flat active set.
 */

/**
 * @param {string[]} sortedDateKeys  ascending YYYY-MM-DD, unique "active" days
 */
export function computeBestStreakFromSortedActiveDays(sortedDateKeys) {
  if (!sortedDateKeys.length) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < sortedDateKeys.length; i++) {
    const a = parseDateKey(sortedDateKeys[i - 1]);
    const b = parseDateKey(sortedDateKeys[i]);
    const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
    if (diff === 1) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

/**
 * Consecutive active days ending today; walk backward until a gap. Today must be active.
 * @param {Set<string>|string[]} activeDays
 * @param {string} todayKey
 */
export function computeCurrentStreakActiveDays(activeDays, todayKey) {
  const set = activeDays instanceof Set ? activeDays : new Set(activeDays);
  if (set.size === 0 || !todayKey) return 0;
  if (!set.has(todayKey)) return 0;
  let n = 0;
  const d = parseDateKey(todayKey);
  for (let i = 0; i < 4000; i++) {
    const k = toDateKey(d);
    if (set.has(k)) {
      n++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return n;
}

/**
 * Calendar streak: consecutive successful days ending today; today must succeed.
 * @param {(dateKey: string) => boolean} isSuccessful
 * @param {string} todayKey
 */
export function computeCurrentCalendarStreak(isSuccessful, todayKey) {
  if (!todayKey || !isSuccessful(todayKey)) return 0;
  let n = 0;
  const d = parseDateKey(todayKey);
  for (let i = 0; i < 4000; i++) {
    const k = toDateKey(d);
    if (isSuccessful(k)) {
      n++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return n;
}

/**
 * Longest run of consecutive calendar days where isSuccessful is true.
 * @param {(dateKey: string) => boolean} isSuccessful
 * @param {string} startKey
 * @param {string} endKey
 */
export function computeBestCalendarStreakInRange(isSuccessful, startKey, endKey) {
  if (endKey < startKey) return 0;
  const keys = dateKeyRange(startKey, endKey);
  let best = 0;
  let run = 0;
  for (const k of keys) {
    if (isSuccessful(k)) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}
