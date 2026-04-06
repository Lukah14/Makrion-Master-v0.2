/**
 * Firebase-backed "meaningful daily progress" for strikes / streaks.
 * A day counts if the user logged food, activity, water, a habit completion, or weight.
 */

import { listFoodLogEntries } from '@/services/foodLogService';
import { listActivityEntries } from '@/services/activityService';
import { getWaterLog } from '@/services/waterService';
import { listHabitCompletions } from '@/services/habitService';
import { getWeightEntryForDate } from '@/services/weightEntryService';

/**
 * @param {string} uid
 * @param {string} dateKey  YYYY-MM-DD
 * @returns {Promise<boolean>}
 */
export async function dayHasMeaningfulProgress(uid, dateKey) {
  const [food, activity, water, completions, weightEntry] = await Promise.all([
    listFoodLogEntries(uid, dateKey).then((a) => a.length > 0),
    listActivityEntries(uid, dateKey).then((a) => a.length > 0),
    getWaterLog(uid, dateKey).then(
      (w) => (w.totalMl || 0) > 0 || (w.glasses || 0) > 0,
    ),
    listHabitCompletions(uid, dateKey).then((list) => {
      if (!list.length) return false;
      return list.some((c) => c.completed !== false);
    }),
    getWeightEntryForDate(uid, dateKey).then((e) => e != null && e.weightKg != null),
  ]);
  return food || activity || water || completions || weightEntry;
}
