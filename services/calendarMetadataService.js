/**
 * Aggregates per-day flags for the monthly calendar (Firebase, user-scoped).
 */

import { dayHasMeaningfulProgress } from '@/services/dailyMeaningfulDayService';
import { fetchMemorableMomentDateKeys } from '@/services/memorableMomentService';
import { getMonthDateKeyRange } from '@/lib/calendarUtils';

export { fetchMemorableMomentDateKeys };

async function dayHasTrackedData(uid, dateKey) {
  return dayHasMeaningfulProgress(uid, dateKey);
}

/**
 * @returns {Promise<Record<string, { hasTrackedData: boolean, hasMoment: boolean }>>}
 */
export async function fetchCalendarMonthMetadata(uid, year, monthIndex) {
  const { startKey, endKey, keys } = getMonthDateKeyRange(year, monthIndex);
  const momentKeys = await fetchMemorableMomentDateKeys(uid, startKey, endKey);

  const result = {};
  const chunkSize = 6;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    const trackedFlags = await Promise.all(
      chunk.map((k) => dayHasTrackedData(uid, k))
    );
    chunk.forEach((k, idx) => {
      result[k] = {
        hasTrackedData: trackedFlags[idx],
        hasMoment: momentKeys.has(k),
      };
    });
  }

  return result;
}
