/**
 * Back-compat wrapper — same storage as activityService (users/{uid}/activities).
 */

import {
  listActivityEntries,
  addActivityEntry,
  updateActivityEntry,
  deleteActivityEntry,
} from '@/services/activityService';

/**
 * @param {string} uid
 * @param {string} dateKey
 */
export async function getActivitiesByDate(uid, dateKey) {
  const list = await listActivityEntries(uid, dateKey);
  return list.map((a) => ({ ...a, dateKey: a.date ?? a.dateKey }));
}

/**
 * @param {string} uid
 * @param {Object} data must include dateKey (YYYY-MM-DD)
 */
export async function addActivity(uid, data) {
  const dateKey = data.dateKey || data.date;
  if (!dateKey) throw new Error('addActivity: dateKey is required');
  const { dateKey: _dk, date: _d, uid: _u, id: _i, createdAt: _c, updatedAt: _up, userId: _uid, ...rest } = data;
  return addActivityEntry(uid, dateKey, rest);
}

export async function updateActivity(uid, activityId, changes) {
  const {
    id: _i,
    createdAt: _c,
    updatedAt: _u,
    userId: _uid,
    date: _dt,
    dateKey: _dk,
    ...patch
  } = changes;
  await updateActivityEntry(uid, '', activityId, patch);
}

export async function deleteActivity(uid, activityId) {
  await deleteActivityEntry(uid, '', activityId);
}
