/**
 * Manual daily steps — users/{uid}/dailySteps/{dateKey} (doc id YYYY-MM-DD).
 * Reads fall back to profiles/{uid}/daily_logs/{dateKey}.steps for older data.
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  documentId,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDailyLog } from '@/services/dailyLogService';

function userDailyStepsRef(uid, dateKey) {
  return doc(db, 'users', uid, 'dailySteps', dateKey);
}

function readStepsFromData(data) {
  if (!data || typeof data !== 'object') return 0;
  const raw = data.steps ?? data.stepCount;
  if (raw == null || raw === '') return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * @param {string} uid
 * @param {string} dateKey  YYYY-MM-DD
 * @returns {Promise<{ dateKey: string, steps: number, uid: string } | null>}  null if no doc and no legacy log
 */
export async function getStepEntry(uid, dateKey) {
  const snap = await getDoc(userDailyStepsRef(uid, dateKey));
  if (snap.exists()) {
    return {
      dateKey,
      uid,
      steps: readStepsFromData(snap.data()),
    };
  }
  const log = await getDailyLog(uid, dateKey);
  if (!log) return null;
  const steps = readStepsFromData(log);
  return { dateKey, uid, steps };
}

/**
 * @param {string} uid
 * @param {string} dateKey
 * @param {number} steps  Non-negative integer
 */
export async function upsertStepEntry(uid, dateKey, steps) {
  const n = Math.max(0, Math.floor(Number(steps)));
  const ref = userDailyStepsRef(uid, dateKey);
  const existing = await getDoc(ref);
  const base = existing.exists() ? existing.data() : {};
  const payload = {
    ...base,
    userId: uid,
    dateKey,
    steps: n,
    updatedAt: serverTimestamp(),
  };
  if (!existing.exists()) {
    payload.createdAt = serverTimestamp();
  }
  await setDoc(ref, payload, { merge: true });
}

/**
 * Days in [startKey, endKey] that have steps &gt; 0.
 * Merges users/{uid}/dailySteps with legacy profiles/.../daily_logs in range.
 *
 * @param {string} uid
 * @param {string} startKey  YYYY-MM-DD
 * @param {string} endKey    YYYY-MM-DD
 * @returns {Promise<Array<{ dateKey: string, steps: number }>>}
 */
export async function listStepEntriesInRange(uid, startKey, endKey) {
  if (!uid || !startKey || !endKey || startKey > endKey) return [];
  const byDate = new Map();

  const usersQ = query(
    collection(db, 'users', uid, 'dailySteps'),
    where(documentId(), '>=', startKey),
    where(documentId(), '<=', endKey),
  );
  const userSnap = await getDocs(usersQ);
  for (const d of userSnap.docs) {
    byDate.set(d.id, readStepsFromData(d.data()));
  }

  const profQ = query(
    collection(db, 'profiles', uid, 'daily_logs'),
    where('dateKey', '>=', startKey),
    where('dateKey', '<=', endKey),
  );
  const profSnap = await getDocs(profQ);
  for (const d of profSnap.docs) {
    const dk = d.data().dateKey || d.id;
    if (!byDate.has(dk)) {
      byDate.set(dk, readStepsFromData(d.data()));
    }
  }

  return Array.from(byDate.entries())
    .map(([dateKey, steps]) => ({ dateKey, steps }))
    .filter((r) => r.steps > 0)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}
