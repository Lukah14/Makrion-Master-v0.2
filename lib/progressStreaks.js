import { parseDateKey, toDateKey, addDaysToDateKey, dateKeyRange } from '@/lib/dateKey';

/**
 * Shared streak helpers for Progress (Nutrition, Activity).
 *
 * - Build a sorted list / Set of dateKeys that count as “active” for that module.
 * - `computeCurrentStreakActiveDays`: consecutive active days ending today, or yesterday if today
 *   is not active (so an open day does not zero the streak).
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
 * Consecutive active days ending today or yesterday (if today not active).
 * @param {Set<string>|string[]} activeDays
 * @param {string} todayKey
 */
export function computeCurrentStreakActiveDays(activeDays, todayKey) {
  const set = activeDays instanceof Set ? activeDays : new Set(activeDays);
  if (set.size === 0) return 0;
  let anchor = todayKey;
  if (!set.has(todayKey)) {
    const y = addDaysToDateKey(todayKey, -1);
    if (!set.has(y)) return 0;
    anchor = y;
  }
  let n = 0;
  const d = parseDateKey(anchor);
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
 * Calendar streak: day counts if isSuccessful(dateKey) is true.
 * Today not successful → anchor yesterday (same as habits home streak).
 * @param {(dateKey: string) => boolean} isSuccessful
 * @param {string} todayKey
 */
export function computeCurrentCalendarStreak(isSuccessful, todayKey) {
  let anchor = todayKey;
  if (!isSuccessful(todayKey)) {
    const y = addDaysToDateKey(todayKey, -1);
    if (!isSuccessful(y)) return 0;
    anchor = y;
  }
  let n = 0;
  let d = parseDateKey(anchor);
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
