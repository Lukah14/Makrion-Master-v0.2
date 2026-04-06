import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Water logs: users/{uid}/waterLogs/{date} (YYYY-MM-DD) ───────────────────

function waterRef(uid, date) {
  return doc(db, 'users', uid, 'waterLogs', date);
}

function normalizeWaterDoc(uid, date, data) {
  if (!data || typeof data !== 'object') {
    return {
      userId: uid,
      date,
      glasses: 0,
      totalMl: 0,
      consumedMl: 0,
      goalMl: null,
    };
  }
  const totalMl = Math.max(0, Number(data.totalMl) || 0);
  const goalRaw = data.goalMl != null ? Number(data.goalMl) : null;
  const goalMl = goalRaw != null && Number.isFinite(goalRaw) ? goalRaw : null;
  const consumedMl =
    data.consumedMl != null && Number.isFinite(Number(data.consumedMl))
      ? Math.max(0, Number(data.consumedMl))
      : totalMl;
  return {
    userId: data.userId || uid,
    date: data.date || date,
    glasses: Math.max(0, Number(data.glasses) || 0),
    totalMl,
    consumedMl,
    goalMl,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * @returns {Promise<{ userId: string, date: string, glasses: number, totalMl: number, consumedMl: number, goalMl: number|null, createdAt?: *, updatedAt?: * }>}
 */
export async function getWaterLog(uid, date) {
  const snap = await getDoc(waterRef(uid, date));
  if (!snap.exists()) {
    return normalizeWaterDoc(uid, date, null);
  }
  return normalizeWaterDoc(uid, date, snap.data());
}

async function mergeWaterDoc(uid, date, patch) {
  const ref = waterRef(uid, date);
  const existing = await getDoc(ref);
  const base = existing.exists() ? existing.data() : {};
  const next = {
    ...base,
    userId: uid,
    date,
    ...patch,
    updatedAt: serverTimestamp(),
  };
  if (!existing.exists()) {
    next.createdAt = serverTimestamp();
  }
  await setDoc(ref, next, { merge: true });
  return getWaterLog(uid, date);
}

/**
 * @param {number} glasses
 * @param {number} totalMl
 * @param {Record<string, unknown>} [extra]
 */
export async function setWaterLog(uid, date, glasses, totalMl, extra = {}) {
  const g = Math.max(0, Number(glasses) || 0);
  const ml = Math.max(0, Number(totalMl) || 0);
  return mergeWaterDoc(uid, date, {
    glasses: g,
    totalMl: ml,
    consumedMl: ml,
    ...extra,
  });
}

export async function setWaterGoalMl(uid, date, goalMl) {
  const g = Math.round(Number(goalMl) || 0);
  const clamped = Math.max(500, Math.min(20000, g));
  return mergeWaterDoc(uid, date, { goalMl: clamped });
}

export async function addWaterGlass(uid, date, mlPerGlass = 250) {
  const current = await getWaterLog(uid, date);
  const step = Math.max(1, Number(mlPerGlass) || 250);
  const newGlasses = (current.glasses || 0) + 1;
  const newTotal = (current.totalMl || 0) + step;
  return mergeWaterDoc(uid, date, {
    glasses: newGlasses,
    totalMl: newTotal,
    consumedMl: newTotal,
  });
}

export async function removeWaterGlass(uid, date, mlPerGlass = 250) {
  const current = await getWaterLog(uid, date);
  const step = Math.max(1, Number(mlPerGlass) || 250);
  const newGlasses = Math.max(0, (current.glasses || 0) - 1);
  const newTotal = Math.max(0, (current.totalMl || 0) - step);
  return mergeWaterDoc(uid, date, {
    glasses: newGlasses,
    totalMl: newTotal,
    consumedMl: newTotal,
  });
}
