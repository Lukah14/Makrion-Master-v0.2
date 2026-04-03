/**
 * Habit completion service — profiles/{uid}/habit_completions/{completionId}
 * Flat collection, unique per habitId+dateKey.
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
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
 * Upsert — finds existing completion for habitId+dateKey, updates or creates.
 * Uses a deterministic doc id = `${habitId}_${dateKey}` to enforce one-per-day.
 * @param {string} uid
 * @param {string} habitId
 * @param {string} dateKey
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function upsertHabitCompletion(uid, habitId, dateKey, data = {}) {
  const docId = `${habitId}_${dateKey}`;
  const ref = doc(db, 'profiles', uid, 'habit_completions', docId);
  await setDoc(
    ref,
    {
      uid,
      habitId,
      dateKey,
      isCompleted: data.isCompleted ?? true,
      completedAt: data.isCompleted !== false ? serverTimestamp() : null,
      progressValue: data.progressValue ?? null,
      progressUnit: data.progressUnit ?? null,
      streakSnapshot: data.streakSnapshot ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
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

  await setDoc(ref, {
    uid,
    habitId,
    dateKey,
    isCompleted: true,
    completedAt: serverTimestamp(),
    progressValue: null,
    progressUnit: null,
    streakSnapshot: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return true;
}
