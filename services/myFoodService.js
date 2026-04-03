/**
 * My-food service — profiles/{uid}/my_foods/{foodId}
 * User-created food definitions (source layer).
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
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

function myFoodsRef(uid) {
  return collection(db, 'profiles', uid, 'my_foods');
}

function myFoodRef(uid, foodId) {
  return doc(db, 'profiles', uid, 'my_foods', foodId);
}

/**
 * @param {string} uid
 * @returns {Promise<import('@/models/firestoreModels').MyFood[]>}
 */
export async function listMyFoods(uid) {
  const q = query(myFoodsRef(uid), orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Client-side search — returns my_foods whose name includes the query (case-insensitive).
 * Firestore doesn't support LIKE, so we fetch all and filter locally.
 * @param {string} uid
 * @param {string} searchQuery
 * @returns {Promise<import('@/models/firestoreModels').MyFood[]>}
 */
export async function searchMyFoods(uid, searchQuery) {
  const all = await listMyFoods(uid);
  if (!searchQuery) return all;
  const lc = searchQuery.toLowerCase();
  return all.filter((f) => f.name?.toLowerCase().includes(lc));
}

/**
 * @param {string} uid
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function createMyFood(uid, data) {
  const payload = {
    uid,
    name: data.name || '',
    brand: data.brand || null,
    category: data.category || null,
    barcode: data.barcode || null,
    servingGrams: data.servingGrams ?? 100,
    per100g: data.per100g || {
      kcal: 0, protein: 0, carbs: 0, fat: 0,
      fiber: 0, sugar: 0, salt: 0,
    },
    source: 'user',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(myFoodsRef(uid), payload);
  return ref.id;
}

/**
 * @param {string} uid
 * @param {string} foodId
 * @param {Object} changes
 */
export async function updateMyFood(uid, foodId, changes) {
  await updateDoc(myFoodRef(uid, foodId), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

/**
 * @param {string} uid
 * @param {string} foodId
 */
export async function deleteMyFood(uid, foodId) {
  await deleteDoc(myFoodRef(uid, foodId));
}
