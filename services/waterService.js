/**
 * Per-day water: users/{uid}/dailyLogs/{dateKey} (YYYY-MM-DD)
 * Fields: waterMl, waterGoalMl (optional day override), updatedAt, createdAt
 *
 * Reads legacy users/{uid}/waterLogs/{dateKey} if no dailyLogs doc yet.
 */

import { Platform } from 'react-native';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const WATER_BUCKET_DESTROY_MS = Platform.OS === 'android' ? 2500 : 400;

function cancelWaterBucketDestroy(bucket) {
  if (bucket.pendingDestroyTimer != null) {
    clearTimeout(bucket.pendingDestroyTimer);
    bucket.pendingDestroyTimer = null;
  }
}

function userDailyLogRef(uid, dateKey) {
  return doc(db, 'users', uid, 'dailyLogs', dateKey);
}

function legacyWaterRef(uid, dateKey) {
  return doc(db, 'users', uid, 'waterLogs', dateKey);
}

/**
 * @returns {object} UI-shaped water state (totalMl mirrors waterMl)
 */
export function normalizeWaterDoc(uid, dateKey, data) {
  const rawMl =
    data?.waterMl != null
      ? Number(data.waterMl)
      : data?.totalMl != null
        ? Number(data.totalMl)
        : data?.consumedMl != null
          ? Number(data.consumedMl)
          : 0;
  const waterMl = Math.max(0, Math.round(Number.isFinite(rawMl) ? rawMl : 0));
  const goalRaw =
    data?.waterGoalMl != null
      ? Number(data.waterGoalMl)
      : data?.goalMl != null
        ? Number(data.goalMl)
        : null;
  const waterGoalMl =
    goalRaw != null && Number.isFinite(goalRaw)
      ? Math.max(500, Math.min(20000, Math.round(goalRaw)))
      : null;
  const glasses = Math.round(waterMl / 250);
  return {
    userId: uid,
    date: dateKey,
    dateKey,
    waterMl,
    totalMl: waterMl,
    consumedMl: waterMl,
    glasses,
    goalMl: waterGoalMl,
    waterGoalMl,
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
  };
}

/**
 * @returns {Promise<ReturnType<typeof normalizeWaterDoc>>}
 */
export async function getWaterLog(uid, dateKey) {
  const snap = await getDoc(userDailyLogRef(uid, dateKey));
  if (snap.exists()) {
    return normalizeWaterDoc(uid, dateKey, snap.data());
  }
  const leg = await getDoc(legacyWaterRef(uid, dateKey));
  if (leg.exists()) {
    return normalizeWaterDoc(uid, dateKey, leg.data());
  }
  return normalizeWaterDoc(uid, dateKey, null);
}

async function mergeDailyWater(uid, dateKey, patch) {
  const ref = userDailyLogRef(uid, dateKey);
  const existing = await getDoc(ref);
  const base = existing.exists() ? existing.data() : {};
  const prevMl = Math.max(0, Math.round(Number(base.waterMl ?? base.totalMl ?? 0) || 0));
  const waterMl =
    patch.waterMl !== undefined
      ? Math.max(0, Math.round(Number(patch.waterMl) || 0))
      : prevMl;

  const next = {
    ...base,
    uid,
    dateKey,
    waterMl,
    updatedAt: serverTimestamp(),
  };
  if (patch.waterGoalMl !== undefined) {
    const g = Number(patch.waterGoalMl);
    next.waterGoalMl =
      g != null && Number.isFinite(g) ? Math.max(500, Math.min(20000, Math.round(g))) : null;
  }
  if (!existing.exists()) {
    next.createdAt = serverTimestamp();
  }
  await setDoc(ref, next, { merge: true });
  return getWaterLog(uid, dateKey);
}

/** @returns {Promise<ReturnType<typeof normalizeWaterDoc>>} */
export async function setWaterLog(uid, dateKey, _glasses, totalMl, extra = {}) {
  const ml = Math.max(0, Math.round(Number(totalMl) || 0));
  const patch = { waterMl: ml };
  if (extra.goalMl != null || extra.waterGoalMl != null) {
    patch.waterGoalMl = extra.waterGoalMl ?? extra.goalMl;
  }
  return mergeDailyWater(uid, dateKey, patch);
}

export async function setWaterGoalMl(uid, dateKey, goalMl) {
  const current = await getWaterLog(uid, dateKey);
  const g = Math.round(Number(goalMl) || 0);
  const clamped = Math.max(500, Math.min(20000, g));
  return mergeDailyWater(uid, dateKey, { waterMl: current.waterMl, waterGoalMl: clamped });
}

export async function addWaterGlass(uid, dateKey, mlPerGlass = 250) {
  const current = await getWaterLog(uid, dateKey);
  const step = Math.max(1, Math.round(Number(mlPerGlass) || 250));
  return mergeDailyWater(uid, dateKey, { waterMl: current.waterMl + step });
}

export async function removeWaterGlass(uid, dateKey, mlPerGlass = 250) {
  const current = await getWaterLog(uid, dateKey);
  const step = Math.max(1, Math.round(Number(mlPerGlass) || 250));
  return mergeDailyWater(uid, dateKey, { waterMl: Math.max(0, current.waterMl - step) });
}

/** Add or subtract ml (delta may be negative). Result clamped to &gt;= 0. */
export async function adjustWaterMl(uid, dateKey, deltaMl) {
  const current = await getWaterLog(uid, dateKey);
  const d = Math.round(Number(deltaMl) || 0);
  return mergeDailyWater(uid, dateKey, { waterMl: Math.max(0, current.waterMl + d) });
}

function isTargetIdConflict(err) {
  return /Target ID already exists/i.test(err?.message || String(err));
}

const WATER_TARGET_ID_LOG_THROTTLE_MS = 30_000;

const waterBuckets = new Map();

function waterBucketKey(uid, dateKey) {
  return `${uid}__${dateKey}`;
}

/**
 * Live listener for users/{uid}/dailyLogs/{dateKey} water fields (shared if multiple subscribers).
 * @returns {() => void}
 */
export function subscribeWaterLog(uid, dateKey, onNext, onError) {
  const k = waterBucketKey(uid, dateKey);
  let bucket = waterBuckets.get(k);
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
    waterBuckets.set(k, bucket);
  }

  cancelWaterBucketDestroy(bucket);
  bucket.destroyed = false;

  const id = ++bucket.nextId;
  bucket.listeners.set(id, { onNext, onError });

  const broadcast = (data) => {
    for (const l of bucket.listeners.values()) {
      try {
        l.onNext(normalizeWaterDoc(bucket.uid, bucket.dateKey, data));
      } catch (e) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[water] subscriber error', e);
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
    const ref = userDailyLogRef(bucket.uid, bucket.dateKey);
    bucket.unsub = onSnapshot(
      ref,
      async (snap) => {
        if (!snap.exists()) {
          const leg = await getDoc(legacyWaterRef(bucket.uid, bucket.dateKey));
          broadcast(leg.exists() ? leg.data() : null);
          return;
        }
        broadcast(snap.data());
      },
      (err) => {
        if (bucket.destroyed) return;
        if (isTargetIdConflict(err)) {
          const now = Date.now();
          if (__DEV__ && now - bucket.lastTargetIdLogAt > WATER_TARGET_ID_LOG_THROTTLE_MS) {
            bucket.lastTargetIdLogAt = now;
            // eslint-disable-next-line no-console
            console.log('[water] Target ID conflict (ignored; listener kept)', bucket.uid, bucket.dateKey);
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
      cancelWaterBucketDestroy(bucket);
      bucket.pendingDestroyTimer = setTimeout(() => {
        bucket.pendingDestroyTimer = null;
        if (bucket.listeners.size > 0) return;
        bucket.destroyed = true;
        detach();
        waterBuckets.delete(k);
      }, WATER_BUCKET_DESTROY_MS);
    }
  };
}
