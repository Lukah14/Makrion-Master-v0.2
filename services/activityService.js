/**
 * Activity log entries: users/{uid}/activities/{activityId}
 * Filter by `date` (YYYY-MM-DD).
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
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { devLogFirestore, formatFirestoreError } from '@/lib/firestoreDebug';
import { waitForAuthUser } from '@/lib/waitForAuthUser';
import { estimateCaloriesBurnedFromKcalPerHour80kg } from '@/lib/caloriesBurned';
import { getUserProfile } from '@/services/profileService';

function logActivityError(context, e) {
  const code = e?.code ?? '';
  const message = e?.message ?? String(e);
  console.warn(`[Activity/Firestore:${context}]`, { code, message, authUid: auth.currentUser?.uid ?? null });
}

function activitiesRef(uid) {
  return collection(db, 'users', uid, 'activities');
}

function activityDocRef(uid, activityId) {
  return doc(db, 'users', uid, 'activities', activityId);
}

function activityWritePath(uid) {
  return `users/${uid}/activities`;
}

function createdAtMillis(data) {
  const t = data?.createdAt;
  if (t && typeof t.toMillis === 'function') return t.toMillis();
  if (t && typeof t.seconds === 'number') return t.seconds * 1000;
  return 0;
}

async function resolveUserWeightKg(uid) {
  try {
    const profile = await getUserProfile(uid);
    const w = profile?.body?.currentWeightKg;
    if (w != null && Number(w) > 0) return Number(w);
  } catch {
    /* profile missing or rules */
  }
  return 80;
}

function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {string} uid
 * @param {string} dateKey YYYY-MM-DD
 * @param {Object} input validated values + metadata
 */
export function toActivityFirestorePayload(uid, dateKey, input) {
  const fromCatalog =
    input.source === 'firestore' && input.exerciseId != null && String(input.exerciseId).length > 0;
  const source = fromCatalog ? 'firestore' : 'manual';

  return {
    userId: uid,
    date: dateKey,
    type: input.type,
    name: input.name,
    durationMinutes: input.durationMinutes ?? null,
    distanceKm: input.distanceKm ?? null,
    repsPerSet: input.repsPerSet ?? null,
    sets: input.sets ?? null,
    source,
    exerciseId: fromCatalog ? String(input.exerciseId) : null,
    typeOfExercise: input.typeOfExercise ?? null,
    intensity: input.intensity ?? null,
    met: numOrNull(input.met),
    kcalsPerHour80kg: numOrNull(input.kcalsPerHour80kg),
    category: input.category ?? null,
    shortInstructions: input.shortInstructions ?? null,
  };
}

function attachCaloriesBurned(payload, userWeightKg) {
  const caloriesBurned = estimateCaloriesBurnedFromKcalPerHour80kg({
    kcalsPerHour80kg: payload.kcalsPerHour80kg,
    durationMinutes: payload.durationMinutes,
    userWeightKg,
  });
  return { ...payload, caloriesBurned: caloriesBurned ?? null };
}

export async function addActivityEntry(uid, dateKey, data) {
  if (!uid) throw new Error('addActivityEntry: missing uid (not signed in).');
  const authUid = await waitForAuthUser();
  if (authUid !== uid) {
    const msg = `Activity save blocked: Auth uid (${authUid}) does not match save target (${uid}).`;
    console.warn('[Activity]', msg);
    throw new Error(msg);
  }
  const path = activityWritePath(uid);
  devLogFirestore('activity.add', {
    path: `${path} (addDoc)`,
    collectionPath: path,
    authUid,
    dateKey,
    name: data?.name,
  });
  const userWeightKg = await resolveUserWeightKg(uid);
  const base = toActivityFirestorePayload(uid, dateKey, data);
  const withCalories = attachCaloriesBurned(base, userWeightKg);
  const payload = {
    ...withCalories,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  try {
    const ref = await addDoc(activitiesRef(uid), payload);
    devLogFirestore('activity.add.ok', { docId: ref.id, path });
    return ref.id;
  } catch (e) {
    logActivityError('add', e);
    devLogFirestore('activity.add.error', { code: e?.code, message: e?.message });
    throw new Error(formatFirestoreError(e));
  }
}

export async function getActivityEntry(uid, entryId) {
  const snap = await getDoc(activityDocRef(uid, entryId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listActivityEntries(uid, dateKey) {
  if (!uid) return [];
  const authUid = await waitForAuthUser();
  if (authUid !== uid) {
    const msg = `Activity list blocked: Auth uid (${authUid}) does not match requested uid (${uid}).`;
    console.warn('[Activity]', msg);
    throw new Error(msg);
  }
  const path = activityWritePath(uid);
  devLogFirestore('activity.list', {
    path,
    query: `collection(users/${uid}/activities) where date == "${dateKey}"`,
    authUid,
  });
  try {
    const q = query(activitiesRef(uid), where('date', '==', dateKey));
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => createdAtMillis(a) - createdAtMillis(b));
    return rows;
  } catch (e) {
    logActivityError('list', e);
    devLogFirestore('activity.list.error', { code: e?.code, message: e?.message });
    throw new Error(formatFirestoreError(e));
  }
}

const ALLOWED_UPDATE = [
  'type',
  'name',
  'durationMinutes',
  'distanceKm',
  'repsPerSet',
  'sets',
  'source',
  'exerciseId',
  'category',
  'shortInstructions',
  'typeOfExercise',
  'intensity',
  'met',
  'kcalsPerHour80kg',
];

export async function updateActivityEntry(uid, _dateKey, entryId, changes) {
  if (!uid) throw new Error('updateActivityEntry: missing uid.');
  const authUid = await waitForAuthUser();
  if (authUid !== uid) throw new Error('Cannot update activity for another user.');
  devLogFirestore('activity.update', {
    path: `${activityWritePath(uid)}/${entryId}`,
    authUid,
  });
  const snap = await getDoc(activityDocRef(uid, entryId));
  if (!snap.exists()) throw new Error('Activity entry not found.');

  const prev = snap.data();
  const merged = { ...prev };
  for (const k of ALLOWED_UPDATE) {
    if (Object.prototype.hasOwnProperty.call(changes, k) && changes[k] !== undefined) {
      merged[k] = changes[k];
    }
  }
  const userWeightKg = await resolveUserWeightKg(uid);
  const caloriesBurned = estimateCaloriesBurnedFromKcalPerHour80kg({
    kcalsPerHour80kg: merged.kcalsPerHour80kg,
    durationMinutes: merged.durationMinutes,
    userWeightKg,
  });
  const patch = { updatedAt: serverTimestamp(), caloriesBurned: caloriesBurned ?? null };
  for (const k of ALLOWED_UPDATE) {
    if (Object.prototype.hasOwnProperty.call(changes, k) && changes[k] !== undefined) {
      patch[k] = changes[k];
    }
  }

  try {
    await updateDoc(activityDocRef(uid, entryId), patch);
  } catch (e) {
    logActivityError('update', e);
    throw new Error(formatFirestoreError(e));
  }
}

export async function deleteActivityEntry(uid, _dateKey, entryId) {
  if (!uid) throw new Error('deleteActivityEntry: missing uid.');
  const authUid = await waitForAuthUser();
  if (authUid !== uid) throw new Error('Cannot delete activity for another user.');
  devLogFirestore('activity.delete', {
    path: `${activityWritePath(uid)}/${entryId}`,
    authUid,
  });
  try {
    await deleteDoc(activityDocRef(uid, entryId));
  } catch (e) {
    logActivityError('delete', e);
    throw new Error(formatFirestoreError(e));
  }
}

export function calcTotalCaloriesBurned(entries) {
  return entries.reduce((sum, e) => sum + (Number(e.caloriesBurned) || 0), 0);
}
