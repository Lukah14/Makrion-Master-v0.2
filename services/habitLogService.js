/**
 * Habit log service — profiles/{uid}/habit_logs/{habitLogId}
 * Rich daily tracking: ratings 1-10, timers, numeric progress, notes.
 * All records are day-specific (dateKey required).
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

function logsRef(uid) {
  return collection(db, 'profiles', uid, 'habit_logs');
}

/**
 * @param {string} uid
 * @param {string} dateKey
 * @returns {Promise<import('@/models/firestoreModels').HabitLog[]>}
 */
export async function getHabitLogsByDate(uid, dateKey) {
  const q = query(logsRef(uid), where('dateKey', '==', dateKey));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * @param {string} uid
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function addHabitLog(uid, data) {
  const payload = {
    uid,
    habitId: data.habitId,
    dateKey: data.dateKey,
    logType: data.logType || 'note',
    value: data.value ?? null,
    minValue: data.minValue ?? null,
    maxValue: data.maxValue ?? null,
    unit: data.unit ?? null,
    durationSeconds: data.durationSeconds ?? null,
    note: data.note ?? null,
    status: data.status || 'completed',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(logsRef(uid), payload);
  return ref.id;
}

/**
 * Get the rating log for a specific habit on a specific date.
 * @param {string} uid
 * @param {string} habitId
 * @param {string} dateKey
 * @returns {Promise<import('@/models/firestoreModels').HabitLog|null>}
 */
export async function getHabitRatingByDate(uid, habitId, dateKey) {
  const q = query(
    logsRef(uid),
    where('habitId', '==', habitId),
    where('dateKey', '==', dateKey),
    where('logType', '==', 'rating'),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/**
 * Upsert a rating log for habitId + dateKey.
 * Uses deterministic id `${habitId}_${dateKey}_rating`.
 * @param {string} uid
 * @param {string} habitId
 * @param {string} dateKey
 * @param {number} value
 * @param {Object} [opts]
 * @returns {Promise<string>}
 */
export async function upsertHabitRating(uid, habitId, dateKey, value, opts = {}) {
  const docId = `${habitId}_${dateKey}_rating`;
  const ref = doc(db, 'profiles', uid, 'habit_logs', docId);
  await setDoc(
    ref,
    {
      uid,
      habitId,
      dateKey,
      logType: 'rating',
      value,
      minValue: opts.minValue ?? 1,
      maxValue: opts.maxValue ?? 10,
      unit: opts.unit ?? 'score',
      durationSeconds: null,
      note: opts.note ?? null,
      status: 'completed',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return docId;
}
