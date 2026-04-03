/**
 * Habit template service — profiles/{uid}/habits/{habitId}
 * Definitions / templates (NOT day-specific).
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getActiveHabitsForDate } from '@/lib/habitSchedule';

function habitsRef(uid) {
  return collection(db, 'profiles', uid, 'habits');
}

function habitRef(uid, habitId) {
  return doc(db, 'profiles', uid, 'habits', habitId);
}

/**
 * @param {string} uid
 * @param {boolean} [includeArchived=false]
 * @returns {Promise<import('@/models/firestoreModels').Habit[]>}
 */
export async function getHabits(uid, includeArchived = false) {
  const constraints = [orderBy('createdAt', 'desc')];
  if (!includeArchived) constraints.unshift(where('isArchived', '==', false));
  const q = query(habitsRef(uid), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Return habits that are active on a specific date.
 * @param {string} uid
 * @param {string} dateKey
 * @returns {Promise<import('@/models/firestoreModels').Habit[]>}
 */
export async function getHabitsForDate(uid, dateKey) {
  const all = await getHabits(uid);
  return getActiveHabitsForDate(all, dateKey);
}

/**
 * @param {string} uid
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function createHabit(uid, data) {
  const payload = {
    uid,
    name: data.name || '',
    icon: data.icon || 'check',
    color: data.color || '#2DA89E',
    category: data.category || 'health',
    type: data.type || 'yes_no',
    evaluation: {
      targetValue: data.evaluation?.targetValue ?? null,
      unit: data.evaluation?.unit ?? null,
      checklistTargetCount: data.evaluation?.checklistTargetCount ?? null,
      ratingMin: data.evaluation?.ratingMin ?? null,
      ratingMax: data.evaluation?.ratingMax ?? null,
    },
    repeat: {
      mode: data.repeat?.mode || 'daily',
      daysOfWeek: data.repeat?.daysOfWeek ?? null,
      daysOfMonth: data.repeat?.daysOfMonth ?? null,
      interval: data.repeat?.interval ?? null,
    },
    schedule: {
      startDateKey: data.schedule?.startDateKey ?? null,
      endDateKey: data.schedule?.endDateKey ?? null,
      reminderEnabled: data.schedule?.reminderEnabled ?? false,
      reminderTime: data.schedule?.reminderTime ?? null,
      priority: data.schedule?.priority || 'medium',
    },
    isArchived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(habitsRef(uid), payload);
  return ref.id;
}

/**
 * @param {string} uid
 * @param {string} habitId
 * @param {Object} changes
 */
export async function updateHabit(uid, habitId, changes) {
  await updateDoc(habitRef(uid, habitId), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

/**
 * @param {string} uid
 * @param {string} habitId
 */
export async function archiveHabit(uid, habitId) {
  await updateDoc(habitRef(uid, habitId), {
    isArchived: true,
    updatedAt: serverTimestamp(),
  });
}

/**
 * @param {string} uid
 * @param {string} habitId
 */
export async function deleteHabitPermanently(uid, habitId) {
  await deleteDoc(habitRef(uid, habitId));
}
