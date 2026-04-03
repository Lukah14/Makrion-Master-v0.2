/**
 * Food entry service — profiles/{uid}/food_entries/{entryId}
 * Flat collection, dateKey-filtered.  Accepts food from ANY source and stores
 * a frozen nutrientsSnapshot so historical entries never depend on live data.
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

function entriesRef(uid) {
  return collection(db, 'profiles', uid, 'food_entries');
}

function entryRef(uid, entryId) {
  return doc(db, 'profiles', uid, 'food_entries', entryId);
}

/**
 * @param {string} uid
 * @param {string} dateKey
 * @returns {Promise<import('@/models/firestoreModels').FoodEntry[]>}
 */
export async function getFoodEntriesByDate(uid, dateKey) {
  const q = query(
    entriesRef(uid),
    where('dateKey', '==', dateKey),
    orderBy('createdAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * @param {string} uid
 * @param {Object} data  — must include dateKey, mealType, nutrientsSnapshot etc.
 * @returns {Promise<string>} new document id
 */
export async function addFoodEntry(uid, data) {
  const payload = {
    uid,
    dateKey: data.dateKey,
    mealType: data.mealType,
    type: data.type || 'food',
    source: data.source || 'fatsecret',
    sourceFoodId: data.sourceFoodId || null,
    nameSnapshot: data.nameSnapshot || '',
    brandSnapshot: data.brandSnapshot || null,
    amount: data.amount ?? data.grams ?? 0,
    unit: data.unit || 'g',
    grams: data.grams ?? 0,
    servings: data.servings ?? 1,
    nutrientsSnapshot: data.nutrientsSnapshot || {
      kcal: 0, protein: 0, carbs: 0, fat: 0,
    },
    status: data.status || 'logged',
    note: data.note || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(entriesRef(uid), payload);
  return ref.id;
}

/**
 * @param {string} uid
 * @param {string} entryId
 * @param {Object} changes
 */
export async function updateFoodEntry(uid, entryId, changes) {
  await updateDoc(entryRef(uid, entryId), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

/**
 * @param {string} uid
 * @param {string} entryId
 */
export async function deleteFoodEntry(uid, entryId) {
  await deleteDoc(entryRef(uid, entryId));
}
