/**
 * Per-domain daily flags for Nutrition / Activity / Habit Tracker strikes (Firebase-backed).
 */

import { listFoodLogEntries } from '@/services/foodLogService';
import { listActivityEntries } from '@/services/activityService';
import { listHabitCompletions } from '@/services/habitService';
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
