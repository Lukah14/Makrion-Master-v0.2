import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

function progressRef(uid) {
  return collection(db, 'users', uid, 'progressEntries');
}

function entryRef(uid, entryId) {
  return doc(db, 'users', uid, 'progressEntries', entryId);
}

function userRef(uid) {
  return doc(db, 'users', uid);
}

export async function addProgressEntry(uid, data) {
  const payload = {
    type: data.type || 'weight',
    date: data.date,
    weight: data.weight ?? null,
    unit: data.unit || 'kg',
    bodyFat: data.bodyFat ?? null,
    measurements: {
      chest: data.measurements?.chest ?? null,
      waist: data.measurements?.waist ?? null,
      hips: data.measurements?.hips ?? null,
      arms: data.measurements?.arms ?? null,
      thighs: data.measurements?.thighs ?? null,
    },
    photoUrl: data.photoUrl || '',
    note: data.note || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(progressRef(uid), payload);
  return ref.id;
}

export async function getProgressEntry(uid, entryId) {
  const snap = await getDoc(entryRef(uid, entryId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listProgressEntries(uid, maxResults = 90) {
  const q = query(progressRef(uid), orderBy('date', 'desc'), limit(maxResults));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getEntryByDate(uid, dateStr) {
  const q = query(progressRef(uid), where('date', '==', dateStr), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function updateProgressEntry(uid, entryId, changes) {
  await updateDoc(entryRef(uid, entryId), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProgressEntry(uid, entryId) {
  await deleteDoc(entryRef(uid, entryId));
}

export async function getLatestProgressEntry(uid) {
  const q = query(progressRef(uid), orderBy('date', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/**
 * Saves a weight entry for a specific date. If an entry already exists for
 * that date, it updates it. Otherwise it creates a new one.
 * Also updates the user profile's currentWeight for fast access.
 */
export async function saveWeightEntry(uid, weight, dateStr) {
  const existing = await getEntryByDate(uid, dateStr);

  let entryId;
  if (existing) {
    await updateProgressEntry(uid, existing.id, { weight, unit: 'kg' });
    entryId = existing.id;
  } else {
    entryId = await addProgressEntry(uid, {
      type: 'weight',
      date: dateStr,
      weight,
      unit: 'kg',
    });
  }

  await setDoc(userRef(uid), {
    currentWeight: weight,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return entryId;
}
