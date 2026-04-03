/**
 * Aggregates per-day flags for the monthly calendar (Firebase, user-scoped).
 */

import { listFoodLogEntries } from '@/services/foodLogService';
import { listActivityEntries } from '@/services/activityService';
import { getWaterLog } from '@/services/waterService';
import { listHabitCompletions } from '@/services/habitService';
import { getEntryByDate } from '@/services/progressService';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getMonthDateKeyRange } from '@/lib/calendarUtils';

function momentsRef(uid) {
  return collection(db, 'profiles', uid, 'memorable_moments');
}

/**
 * All memorable moments in [startKey, endKey] (inclusive).
 */
export async function fetchMemorableMomentDateKeys(uid, startKey, endKey) {
  const q = query(
    momentsRef(uid),
    where('dateKey', '>=', startKey),
    where('dateKey', '<=', endKey),
    orderBy('dateKey', 'asc')
  );
  const snap = await getDocs(q);
  const set = new Set();
  snap.docs.forEach((d) => {
    const k = d.data()?.dateKey;
    if (k) set.add(k);
  });
  return set;
}

async function dayHasTrackedData(uid, dateKey) {
  const [food, activity, water, completions, weightEntry] = await Promise.all([
    listFoodLogEntries(uid, dateKey).then((a) => a.length > 0),
    listActivityEntries(uid, dateKey).then((a) => a.length > 0),
    getWaterLog(uid, dateKey).then(
      (w) => (w.totalMl || 0) > 0 || (w.glasses || 0) > 0
    ),
    listHabitCompletions(uid, dateKey).then((list) => {
      if (!list.length) return false;
      return list.some((c) => c.completed !== false);
    }),
    getEntryByDate(uid, dateKey).then((e) => e != null && e.weight != null),
  ]);
  return food || activity || water || completions || weightEntry;
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
