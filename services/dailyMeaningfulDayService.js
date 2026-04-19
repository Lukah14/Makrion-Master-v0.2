/**
 * Firebase-backed "meaningful daily progress" for strikes / streaks.
 * A day counts if the user logged food, activity, water, a habit completion, or weight.
 */

import { listFoodLogEntries } from '@/services/foodLogService';
import { listActivityEntries } from '@/services/activityService';
import { getWaterLog } from '@/services/waterService';
import { listHabitCompletions } from '@/services/habitService';
import { getWeightEntryForDate } from '@/services/weightEntryService';
import { getMemorableMomentForDate } from '@/services/memorableMomentService';
import { habitDayHasTrackedProgress } from '@/services/domainStrikeService';

/**
 * True when the user saved real tracked data for that calendar day (not screen opens).
 *
 * @param {string} uid
 * @param {string} dateKey  YYYY-MM-DD
 * @returns {Promise<boolean>}
 */
export async function dayHasMeaningfulProgress(uid, dateKey) {
  const [food, activity, water, habitList, weightEntry, moment] = await Promise.all([
    listFoodLogEntries(uid, dateKey).then((a) => a.length > 0),
    listActivityEntries(uid, dateKey).then((a) => a.length > 0),
    getWaterLog(uid, dateKey).then((w) => {
      const ml = Math.max(0, Math.round(Number(w?.waterMl ?? w?.totalMl ?? 0) || 0));
      return ml > 0 || (w?.glasses || 0) > 0;
    }),
    listHabitCompletions(uid, dateKey),
    getWeightEntryForDate(uid, dateKey).then(
      (e) => e != null && e.weightKg != null && Number.isFinite(Number(e.weightKg)),
    ),
    getMemorableMomentForDate(uid, dateKey).then((m) => m != null),
  ]);
  const habitTracked = habitDayHasTrackedProgress(habitList);
  return food || activity || water || habitTracked || weightEntry || moment;
}
