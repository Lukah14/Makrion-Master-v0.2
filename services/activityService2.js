/**
 * Activity service — profiles/{uid}/activities/{activityId}
 * Flat collection, dateKey-filtered.
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

function activitiesRef(uid) {
  return collection(db, 'profiles', uid, 'activities');
}

function activityRef(uid, activityId) {
  return doc(db, 'profiles', uid, 'activities', activityId);
}

/**
 * @param {string} uid
 * @param {string} dateKey
 * @returns {Promise<import('@/models/firestoreModels').Activity[]>}
 */
export async function getActivitiesByDate(uid, dateKey) {
  const q = query(
    activitiesRef(uid),
    where('dateKey', '==', dateKey),
    orderBy('createdAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * @param {string} uid
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function addActivity(uid, data) {
  const payload = {
    uid,
    dateKey: data.dateKey,
    type: data.type || 'other',
    name: data.name || '',
    category: data.category || null,
    durationMinutes: data.durationMinutes ?? 0,
    caloriesBurned: data.caloriesBurned ?? 0,
    steps: data.steps ?? null,
    distanceKm: data.distanceKm ?? null,
    status: data.status || 'done',
    startedAt: data.startedAt ?? null,
    completedAt: data.completedAt ?? null,
    note: data.note || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(activitiesRef(uid), payload);
  return ref.id;
}

/**
 * @param {string} uid
 * @param {string} activityId
 * @param {Object} changes
 */
export async function updateActivity(uid, activityId, changes) {
  await updateDoc(activityRef(uid, activityId), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

/**
 * @param {string} uid
 * @param {string} activityId
 */
export async function deleteActivity(uid, activityId) {
  await deleteDoc(activityRef(uid, activityId));
}
