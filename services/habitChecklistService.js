/**
 * Habit checklist service — profiles/{uid}/habit_checklist_items/{itemId}
 * Template definitions for checklist-type habits (NOT day-specific).
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

function checklistRef(uid) {
  return collection(db, 'profiles', uid, 'habit_checklist_items');
}

function itemRef(uid, itemId) {
  return doc(db, 'profiles', uid, 'habit_checklist_items', itemId);
}

/**
 * @param {string} uid
 * @param {string} habitId
 * @returns {Promise<import('@/models/firestoreModels').HabitChecklistItem[]>}
 */
export async function getChecklistItems(uid, habitId) {
  const q = query(
    checklistRef(uid),
    where('habitId', '==', habitId),
    orderBy('sortOrder', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * @param {string} uid
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function addChecklistItem(uid, data) {
  const payload = {
    uid,
    habitId: data.habitId,
    label: data.label || '',
    sortOrder: data.sortOrder ?? 0,
    isActive: data.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(checklistRef(uid), payload);
  return ref.id;
}

/**
 * @param {string} uid
 * @param {string} itemId
 * @param {Object} changes
 */
export async function updateChecklistItem(uid, itemId, changes) {
  await updateDoc(itemRef(uid, itemId), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

/**
 * @param {string} uid
 * @param {string} itemId
 */
export async function deleteChecklistItem(uid, itemId) {
  await deleteDoc(itemRef(uid, itemId));
}
