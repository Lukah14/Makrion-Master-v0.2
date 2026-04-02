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

// ─── Activity log entries (users/{uid}/activityLogs/{date}/entries/{id}) ────────

function entriesRef(uid, date) {
  return collection(db, 'users', uid, 'activityLogs', date, 'entries');
}

function entryRef(uid, date, entryId) {
  return doc(db, 'users', uid, 'activityLogs', date, 'entries', entryId);
}

export async function addActivityEntry(uid, date, data) {
  const payload = {
    name: data.name,
    type: data.type || 'cardio',
    durationMinutes: data.durationMinutes ?? 0,
    caloriesBurned: data.caloriesBurned ?? 0,
    sets: data.sets || null,
    reps: data.reps || null,
    weight: data.weight || null,
    distance: data.distance || null,
    unit: data.unit || 'km',
    note: data.note || '',
    source: data.source || 'manual',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(entriesRef(uid, date), payload);
  return ref.id;
}

export async function getActivityEntry(uid, date, entryId) {
  const snap = await getDoc(entryRef(uid, date, entryId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listActivityEntries(uid, date) {
  const q = query(entriesRef(uid, date), orderBy('createdAt'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateActivityEntry(uid, date, entryId, changes) {
  await updateDoc(entryRef(uid, date, entryId), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteActivityEntry(uid, date, entryId) {
  await deleteDoc(entryRef(uid, date, entryId));
}

export function calcTotalCaloriesBurned(entries) {
  return entries.reduce((sum, e) => sum + (e.caloriesBurned ?? 0), 0);
}
