/**
 * Habit completion service — profiles/{uid}/habit_completions/{completionId}
 * Flat collection, unique per habitId+dateKey.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

function completionsRef(uid) {
  return collection(db, 'profiles', uid, 'habit_completions');
}

/**
 * @param {string} uid
 * @param {string} dateKey
 * @returns {Promise<import('@/models/firestoreModels').HabitCompletion[]>}
 */
export async function getHabitCompletionsByDate(uid, dateKey) {
  const q = query(completionsRef(uid), where('dateKey', '==', dateKey));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * All completions for one habit (any date). Sorted by dateKey ascending.
 * @param {string} uid
 * @param {string} habitId
 * @returns {Promise<import('@/models/firestoreModels').HabitCompletion[]>}
 */
/**
 * Completions on or after minDateKey (inclusive). Client may filter further.
 * @param {string} uid
 * @param {string} minDateKey  "YYYY-MM-DD"
 */
export async function listHabitCompletionsSince(uid, minDateKey) {
  const q = query(completionsRef(uid), where('dateKey', '>=', minDateKey));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => String(a.dateKey).localeCompare(String(b.dateKey)));
  return rows;
}

export async function listHabitCompletionsForHabit(uid, habitId) {
  const q = query(completionsRef(uid), where('habitId', '==', habitId));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => String(a.dateKey).localeCompare(String(b.dateKey)));
  return rows;
}

/**
 * Upsert — deterministic doc id `${habitId}_${dateKey}`. Only sets `createdAt` on first write.
 * Pass only fields you want to change; omitted fields are not cleared (merge).
 * @param {string} uid
 * @param {string} habitId
 * @param {string} dateKey
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function upsertHabitCompletion(uid, habitId, dateKey, data = {}) {
  const docId = `${habitId}_${dateKey}`;
  const ref = doc(db, 'profiles', uid, 'habit_completions', docId);
  const existing = await getDoc(ref);

  /** @type {Record<string, unknown>} */
  const payload = {
    uid,
    habitId,
    dateKey,
    updatedAt: serverTimestamp(),
  };

  if (!existing.exists()) {
    payload.createdAt = serverTimestamp();
  }

  if (data.isCompleted !== undefined) {
    payload.isCompleted = data.isCompleted;
    payload.completedAt = data.isCompleted ? serverTimestamp() : null;
  }
  if (data.progressValue !== undefined) payload.progressValue = data.progressValue;
  if (data.progressUnit !== undefined) payload.progressUnit = data.progressUnit;
  if (data.streakSnapshot !== undefined) payload.streakSnapshot = data.streakSnapshot;
  if (data.completionPercent !== undefined) payload.completionPercent = data.completionPercent;
  if (data.checklistState !== undefined) payload.checklistState = data.checklistState;
  if (data.trackingStatus === null) {
    payload.trackingStatus = deleteField();
  } else if (data.trackingStatus !== undefined) {
    payload.trackingStatus = data.trackingStatus;
  }

  await setDoc(ref, payload, { merge: true });
  return docId;
}

/**
 * Toggle a habit's completion for a given date.
 * @param {string} uid
 * @param {string} habitId
 * @param {string} dateKey
 * @returns {Promise<boolean>} new isCompleted value
 */
export async function toggleHabitCompletion(uid, habitId, dateKey) {
  const docId = `${habitId}_${dateKey}`;
  const ref = doc(db, 'profiles', uid, 'habit_completions', docId);

  const existing = await getDocs(
    query(completionsRef(uid), where('dateKey', '==', dateKey)),
  );
  const match = existing.docs.find((d) => d.data().habitId === habitId);
  const wasCompleted = match?.data()?.isCompleted ?? false;

  if (wasCompleted) {
    await deleteDoc(ref);
    return false;
  }

  await upsertHabitCompletion(uid, habitId, dateKey, {
    isCompleted: true,
    progressValue: null,
    progressUnit: null,
    streakSnapshot: null,
  });

  return true;
}

/**
 * Remove completion doc for habitId + dateKey (same id as upsert: habitId_dateKey).
 * @param {string} uid
 * @param {string} habitId
 * @param {string} dateKey
 */
export async function deleteHabitCompletionForDate(uid, habitId, dateKey) {
  const docId = `${habitId}_${dateKey}`;
  await deleteDoc(doc(db, 'profiles', uid, 'habit_completions', docId));
}
