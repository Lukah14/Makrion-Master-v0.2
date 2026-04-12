/**
 * Weight entries — profiles/{uid}/weight_entries/{entryId}
 * One document per calendar day: id `weight_{YYYY-MM-DD}`.
 *
 * Fields align with app usage + optional mirror fields for tooling:
 * - userId, uid, dateKey, date (YYYY-MM-DD), weightKg, createdAt, updatedAt
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

function userRootRef(uid) {
  return doc(db, 'users', uid);
}

function entriesRef(uid) {
  return collection(db, 'profiles', uid, 'weight_entries');
}

function entryDocRef(uid, dateKey) {
  return doc(db, 'profiles', uid, 'weight_entries', `weight_${dateKey}`);
}

function profileDocRef(uid) {
  return doc(db, 'profiles', uid);
}

async function syncProfileLatestWeightKg(uid) {
  try {
    const latest = await getLatestWeightEntry(uid);
    const w = latest?.weightKg;
    await updateDoc(profileDocRef(uid), {
      'body.currentWeightKg': w != null && Number.isFinite(Number(w)) ? Number(w) : null,
      updatedAt: serverTimestamp(),
    });
  } catch {
    /* profile doc may be missing */
  }
}

/** Keep Dashboard / useUser in sync with latest logged weight (users/{uid} mirrors). */
async function mirrorLatestWeightToUserRoot(uid) {
  try {
    const latest = await getLatestWeightEntry(uid);
    const w = latest?.weightKg;
    if (w == null || !Number.isFinite(Number(w))) return;
    const nk = Math.round(Number(w) * 1000) / 1000;
    await updateDoc(userRootRef(uid), {
      'profile.currentWeight': nk,
      'profile.weight': nk,
      'goals.currentWeight': nk,
      updatedAt: serverTimestamp(),
    });
  } catch {
    /* users doc may not exist yet */
  }
}

/**
 * @param {string} uid
 * @returns {Promise<Array<{ id: string, ... }>>} newest first
 */
export async function getWeightEntries(uid) {
  const q = query(entriesRef(uid), orderBy('dateKey', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * @param {string} uid
 * @returns {Promise<Array<{ id: string, ... }>>} oldest first (for charts)
 */
export async function getWeightEntriesChronological(uid) {
  const q = query(entriesRef(uid), orderBy('dateKey', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * @param {string} uid
 * @param {string} startKey YYYY-MM-DD inclusive
 * @param {string} endKey YYYY-MM-DD inclusive
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
 * @param {string} uid
 * @param {string} dateKey YYYY-MM-DD
 */
export async function getWeightEntryForDate(uid, dateKey) {
  const ref = entryDocRef(uid, dateKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
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

/**
 * Create or update weight for a calendar day.
 * @param {string} uid
 * @param {{ dateKey: string, weightKg: number, bodyFatPct?: number|null, note?: string|null, photoUrl?: string|null }} data
 * @returns {Promise<string>} document id
 */
export async function upsertWeightEntry(uid, data) {
  const dateKey = String(data.dateKey || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error('Invalid dateKey');
  }
  const w = Number(data.weightKg);
  if (!Number.isFinite(w) || w <= 0 || w > 500) {
    throw new Error('Invalid weight');
  }

  const ref = entryDocRef(uid, dateKey);
  const snap = await getDoc(ref);
  const payload = {
    userId: uid,
    uid,
    dateKey,
    date: dateKey,
    weightKg: Math.round(w * 1000) / 1000,
    bodyFatPct: data.bodyFatPct ?? null,
    note: data.note ?? null,
    photoUrl: data.photoUrl ?? null,
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    await setDoc(ref, {
      ...payload,
      createdAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, payload);
  }

  await syncProfileLatestWeightKg(uid);
  await mirrorLatestWeightToUserRoot(uid);
  return ref.id;
}

/** @deprecated use upsertWeightEntry */
export async function addWeightEntry(uid, data) {
  return upsertWeightEntry(uid, data);
}

/**
 * Delete weight entry for a date (removes `weight_{dateKey}` if it exists).
 */
export async function deleteWeightEntryForDate(uid, dateKey) {
  const key = String(dateKey || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
  const ref = entryDocRef(uid, key);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
  }
  await syncProfileLatestWeightKg(uid);
  await mirrorLatestWeightToUserRoot(uid);
}

/**
 * Move entry from one date to another (delete old id, write new).
 */
export async function moveWeightEntry(uid, fromDateKey, toDateKey, weightKg) {
  const from = String(fromDateKey).slice(0, 10);
  const to = String(toDateKey).slice(0, 10);
  if (from === to) {
    await upsertWeightEntry(uid, { dateKey: to, weightKg });
    return;
  }
  await deleteWeightEntryForDate(uid, from);
  await upsertWeightEntry(uid, { dateKey: to, weightKg });
}
