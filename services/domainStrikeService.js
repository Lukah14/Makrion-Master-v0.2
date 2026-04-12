/**
 * Per-domain daily flags for Nutrition / Activity / Habit Tracker strikes (Firebase-backed).
 */

import { listFoodLogEntries } from '@/services/foodLogService';
import { listActivityEntries, listActivityEntriesInRange } from '@/services/activityService';
import { listHabitCompletions, listHabitCompletionsSince } from '@/services/habitService';
import { getStepEntry } from '@/services/stepEntryService';

/**
 * True if any habit completion for the day shows logged progress (not an empty day).
 * @param {object[]} list  From listHabitCompletions
 */
export function habitDayHasTrackedProgress(list) {
  if (!Array.isArray(list) || list.length === 0) return false;
  return list.some((c) => {
    if (c?.isCompleted === true || c?.completed === true) return true;
    const pv = Number(c?.progressValue);
    if (Number.isFinite(pv) && pv > 0) return true;
    if (Array.isArray(c?.checklistState)) {
      return c.checklistState.some((item) => item && item.completed === true);
    }
    if (c?.trackingStatus === 'in_progress') return true;
    return false;
  });
}

/**
 * @param {string} uid
 * @param {string} dateKey  YYYY-MM-DD
 * @returns {Promise<{ nutrition: boolean, activity: boolean, habitTracker: boolean }>}
 */
export async function getDayDomainStrikeFlags(uid, dateKey) {
  const [foodEntries, activityEntries, habitList, stepRow] = await Promise.all([
    listFoodLogEntries(uid, dateKey),
    listActivityEntries(uid, dateKey),
    listHabitCompletions(uid, dateKey),
    getStepEntry(uid, dateKey),
  ]);

  const steps = stepRow?.steps ?? 0;
  const hasSteps = Number(steps) > 0;

  return {
    nutrition: foodEntries.length > 0,
    activity: activityEntries.length > 0 || hasSteps,
    habitTracker: habitDayHasTrackedProgress(habitList),
  };
}

const BULK_FOOD_STEP_CHUNK = 6;

/**
 * Streak maps for a sorted inclusive YYYY-MM-DD range: one activity range query + one habit
 * query, then chunked food + step reads (avoids hundreds of per-day activity list calls).
 *
 * @param {string} uid
 * @param {string[]} sortedKeys  ascending, non-empty
 * @returns {Promise<{ nutritionMap: Map<string, boolean>, activityMap: Map<string, boolean>, habitMap: Map<string, boolean> }>}
 */
export async function getDomainStrikeMapsForKeys(uid, sortedKeys) {
  const nutritionMap = new Map();
  const activityMap = new Map();
  const habitMap = new Map();

  if (!uid || !sortedKeys.length) {
    return { nutritionMap, activityMap, habitMap };
  }

  const startKey = sortedKeys[0];
  const endKey = sortedKeys[sortedKeys.length - 1];

  const [activityRows, habitRows] = await Promise.all([
    listActivityEntriesInRange(uid, startKey, endKey),
    listHabitCompletionsSince(uid, startKey),
  ]);

  const activityDates = new Set();
  for (const row of activityRows) {
    if (row?.date) activityDates.add(String(row.date));
  }

  /** @type {Map<string, object[]>} */
  const habitByDate = new Map();
  for (const c of habitRows) {
    const dk = String(c.dateKey || '');
    if (!dk) continue;
    if (!habitByDate.has(dk)) habitByDate.set(dk, []);
    habitByDate.get(dk).push(c);
  }

  for (let i = 0; i < sortedKeys.length; i += BULK_FOOD_STEP_CHUNK) {
    const slice = sortedKeys.slice(i, i + BULK_FOOD_STEP_CHUNK);
    const perDay = await Promise.all(
      slice.map(async (k) => {
        const [foodEntries, stepRow] = await Promise.all([
          listFoodLogEntries(uid, k),
          getStepEntry(uid, k),
        ]);
        return { k, foodEntries, stepRow };
      }),
    );
    for (const { k, foodEntries, stepRow } of perDay) {
      const steps = stepRow?.steps ?? 0;
      const hasSteps = Number(steps) > 0;
      nutritionMap.set(k, foodEntries.length > 0);
      activityMap.set(k, activityDates.has(k) || hasSteps);
      habitMap.set(k, habitDayHasTrackedProgress(habitByDate.get(k) || []));
    }
  }

  return { nutritionMap, activityMap, habitMap };
}
