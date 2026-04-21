/**
 * Activity log entries: users/{uid}/activities/{activityId}
 * Filter by `date` (YYYY-MM-DD).
 */

import { Platform } from 'react-native';
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
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { devLogFirestore, formatFirestoreError } from '@/lib/firestoreDebug';
import { waitForAuthUser } from '@/lib/waitForAuthUser';
import { estimateCaloriesBurnedFromKcalPerHour80kg } from '@/lib/caloriesBurned';
import { resolveActivityUserWeightKg } from '@/lib/activityUserWeight';

const ACTIVITY_BUCKET_DESTROY_MS = Platform.OS === 'android' ? 2500 : 400;

function cancelActivityBucketDestroy(bucket) {
  if (bucket.pendingDestroyTimer != null) {
    clearTimeout(bucket.pendingDestroyTimer);
    bucket.pendingDestroyTimer = null;
  }
}

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

function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Activity rows with missing/blank name or literal string "null" should not be shown in the UI.
 */
export function isActivityEntryVisible(entry) {
  if (!entry) return false;
  const n = entry.name;
  if (n == null) return false;
  const s = String(n).trim();
  if (!s) return false;
  if (s.toLowerCase() === 'null') return false;
  return true;
}

export function filterVisibleActivityEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.filter(isActivityEntryVisible);
}

function isLibrarySource(input) {
  const s = input?.source;
  return s === 'exercise_library' || s === 'firestore';
}

function isLibraryPayload(row) {
  return row.source === 'exercise_library' && row.exerciseId != null && String(row.exerciseId).length > 0;
}

/**
 * @param {string} uid
 * @param {string} dateKey YYYY-MM-DD
 * @param {Object} input validated values + metadata
 */
export function toActivityFirestorePayload(uid, dateKey, input) {
  const fromLibrary =
    isLibrarySource(input) && input.exerciseId != null && String(input.exerciseId).length > 0;
  const source = fromLibrary ? 'exercise_library' : 'manual';

  return {
    userId: uid,
    date: dateKey,
    type: 'time',
    name: input.name,
    durationMinutes: input.durationMinutes ?? null,
    source,
    exerciseId: fromLibrary ? String(input.exerciseId) : null,
    category: fromLibrary ? input.category ?? null : null,
    shortInstructions: fromLibrary ? input.shortInstructions ?? null : null,
    kcalsPerHour80kg: fromLibrary ? numOrNull(input.kcalsPerHour80kg) : null,
    typeOfExercise: fromLibrary ? input.typeOfExercise ?? null : null,
    intensity: fromLibrary ? input.intensity ?? null : null,
    met: fromLibrary ? numOrNull(input.met) : null,
  };
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
  const userWeightKg = await resolveActivityUserWeightKg(uid);
  const base = toActivityFirestorePayload(uid, dateKey, data);
  let caloriesBurned = numOrNull(data.caloriesBurned);
  if (caloriesBurned == null && isLibraryPayload(base)) {
    caloriesBurned = estimateCaloriesBurnedFromKcalPerHour80kg({
      kcalsPerHour80kg: base.kcalsPerHour80kg,
      durationMinutes: base.durationMinutes,
      userWeightKg,
    });
  }
  const payload = {
    ...base,
    caloriesBurned: caloriesBurned ?? null,
    weightUsedKg: isLibraryPayload(base) ? userWeightKg : null,
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

/**
 * All activities with date in [startKey, endKey] (inclusive), YYYY-MM-DD order.
 * @param {string} uid
 * @param {string} startKey
 * @param {string} endKey
 */
export async function listActivityEntriesInRange(uid, startKey, endKey) {
  if (!uid) return [];
  const authUid = await waitForAuthUser();
  if (authUid !== uid) {
    const msg = `Activity range list blocked: Auth uid (${authUid}) does not match requested uid (${uid}).`;
    console.warn('[Activity]', msg);
    throw new Error(msg);
  }
  try {
    const q = query(
      activitiesRef(uid),
      where('date', '>=', startKey),
      where('date', '<=', endKey),
    );
    const snap = await getDocs(q);
    const rows = filterVisibleActivityEntries(
      snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    );
    rows.sort((a, b) => {
      const da = String(a.date || '').localeCompare(String(b.date || ''));
      if (da !== 0) return da;
      return createdAtMillis(a) - createdAtMillis(b);
    });
    return rows;
  } catch (e) {
    logActivityError('listInRange', e);
    throw new Error(formatFirestoreError(e));
  }
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
    const rows = filterVisibleActivityEntries(
      snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    );
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
  'caloriesBurned',
  'source',
  'exerciseId',
  'category',
  'shortInstructions',
  'typeOfExercise',
  'intensity',
  'met',
  'kcalsPerHour80kg',
  'weightUsedKg',
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

  const patch = { updatedAt: serverTimestamp() };
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

function isTargetIdConflict(err) {
  return /Target ID already exists/i.test(err?.message || String(err));
}

const ACTIVITY_TARGET_ID_LOG_THROTTLE_MS = 30_000;

const activityBuckets = new Map();

function activityBucketKey(uid, dateKey) {
  return `${uid}__${dateKey}`;
}

/**
 * Real-time activities for one calendar day (shared listener per uid+date).
 * @returns {() => void} unsubscribe
 */
export function subscribeActivityEntries(uid, dateKey, onNext, onError) {
  const k = activityBucketKey(uid, dateKey);
  let bucket = activityBuckets.get(k);
  if (!bucket) {
    bucket = {
      listeners: new Map(),
      nextId: 0,
      unsub: null,
      destroyed: false,
      lastTargetIdLogAt: 0,
      pendingDestroyTimer: null,
      uid,
      dateKey,
    };
    activityBuckets.set(k, bucket);
  }

  cancelActivityBucketDestroy(bucket);
  bucket.destroyed = false;

  const id = ++bucket.nextId;
  bucket.listeners.set(id, { onNext, onError });

  const broadcast = (rows) => {
    for (const l of bucket.listeners.values()) {
      try {
        l.onNext(rows);
      } catch (e) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[activity] subscriber onNext error', e);
        }
      }
    }
  };

  const broadcastErr = (err) => {
    for (const l of bucket.listeners.values()) {
      try {
        l.onError?.(err);
      } catch {
        /* ignore */
      }
    }
  };

  const detach = () => {
    try {
      bucket.unsub?.();
    } catch {
      /* ignore */
    }
    bucket.unsub = null;
  };

  const attach = () => {
    if (bucket.destroyed) return;
    detach();
    const q = query(activitiesRef(bucket.uid), where('date', '==', bucket.dateKey));
    bucket.unsub = onSnapshot(
      q,
      (snap) => {
        const rows = filterVisibleActivityEntries(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );
        rows.sort((a, b) => {
          const da = String(a.date || '').localeCompare(String(b.date || ''));
          if (da !== 0) return da;
          return createdAtMillis(a) - createdAtMillis(b);
        });
        broadcast(rows);
      },
      (err) => {
        if (bucket.destroyed) return;
        if (isTargetIdConflict(err)) {
          const now = Date.now();
          if (__DEV__ && now - bucket.lastTargetIdLogAt > ACTIVITY_TARGET_ID_LOG_THROTTLE_MS) {
            bucket.lastTargetIdLogAt = now;
            // eslint-disable-next-line no-console
            console.log('[activity] Target ID conflict (ignored; listener kept)', bucket.uid, bucket.dateKey);
          }
          return;
        }
        broadcastErr(err);
      },
    );
  };

  if (bucket.listeners.size === 1 && !bucket.unsub) {
    attach();
  }

  return () => {
    bucket.listeners.delete(id);
    if (bucket.listeners.size === 0) {
      cancelActivityBucketDestroy(bucket);
      bucket.pendingDestroyTimer = setTimeout(() => {
        bucket.pendingDestroyTimer = null;
        if (bucket.listeners.size > 0) return;
        bucket.destroyed = true;
        detach();
        activityBuckets.delete(k);
      }, ACTIVITY_BUCKET_DESTROY_MS);
    }
  };
}

/** See `evictAllWaterBuckets` — same crash class (Firestore ca9 on logout/login). */
export function evictAllActivityBuckets(reason = 'auth_session_change') {
  if (activityBuckets.size === 0) return;
  if (__DEV__) {
    console.log('[activity] evicting all listener buckets', {
      count: activityBuckets.size,
      reason,
    });
  }
  for (const [key, bucket] of activityBuckets) {
    try {
      if (bucket.pendingDestroyTimer != null) {
        clearTimeout(bucket.pendingDestroyTimer);
        bucket.pendingDestroyTimer = null;
      }
      bucket.destroyed = true;
      bucket.listeners.clear();
      try {
        bucket.unsub?.();
      } catch {
        /* ignore */
      }
      bucket.unsub = null;
    } catch (e) {
      if (__DEV__) {
        console.warn('[activity] eviction error for', key, e?.message || e);
      }
    }
  }
  activityBuckets.clear();
}
