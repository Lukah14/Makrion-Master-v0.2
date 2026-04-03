/**
 * Weight entry service — profiles/{uid}/weight_entries/{weightEntryId}
 * Flat collection, dateKey-filtered.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

function entriesRef(uid) {
  return collection(db, 'profiles', uid, 'weight_entries');
}

/**
 * Get all weight entries, newest first.
 * @param {string} uid
 * @returns {Promise<import('@/models/firestoreModels').WeightEntry[]>}
 */
export async function getWeightEntries(uid) {
  const q = query(entriesRef(uid), orderBy('dateKey', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get weight entries between two dateKeys (inclusive).
 * @param {string} uid
 * @param {string} startKey
 * @param {string} endKey
 * @returns {Promise<import('@/models/firestoreModels').WeightEntry[]>}
 */
export async function getWeightEntriesByRange(uid, startKey, endKey) {
  const q = query(
    entriesRef(uid),
    where('dateKey', '>=', startKey),
    where('dateKey', '<=', endKey),
    orderBy('dateKey', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Add or replace today's weight entry (one per day, deterministic doc id).
 * @param {string} uid
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function addWeightEntry(uid, data) {
  const dateKey = data.dateKey;
  const docId = `weight_${dateKey}`;
  const ref = doc(db, 'profiles', uid, 'weight_entries', docId);
  await setDoc(ref, {
    uid,
    dateKey,
    weightKg: data.weightKg,
    bodyFatPct: data.bodyFatPct ?? null,
    note: data.note ?? null,
    photoUrl: data.photoUrl ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return docId;
}

/**
 * @param {string} uid
 * @returns {Promise<import('@/models/firestoreModels').WeightEntry|null>}
 */
export async function getLatestWeightEntry(uid) {
  const q = query(entriesRef(uid), orderBy('dateKey', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}
