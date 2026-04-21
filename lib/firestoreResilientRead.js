/**
 * Firestore reads that do not hard-fail when the SDK reports "offline" (common on RN / Expo).
 * Used so onboarding writes can proceed using merge + pending writes.
 */

import { getDoc, getDocFromCache } from 'firebase/firestore';
import { isFirestoreTargetIdError } from '@/lib/firestoreRnErrors';

export function isFirestoreOfflineLikeError(err) {
  const code = err?.code;
  const msg = String(err?.message || '');
  return (
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    /offline/i.test(msg) ||
    /client is offline/i.test(msg)
  );
}

/**
 * React Native Firestore can throw "Target ID already exists" on getDoc when the watch layer is wedged.
 * Retry with backoff before giving up.
 *
 * @param {import('firebase/firestore').DocumentReference} docRef
 * @param {number} [maxAttempts]
 */
export async function getDocWithTargetIdRetries(docRef, maxAttempts = 6) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await getDoc(docRef);
    } catch (err) {
      lastErr = err;
      if (isFirestoreTargetIdError(err) && attempt < maxAttempts) {
        await new Promise((r) =>
          setTimeout(r, Math.min(2000, 250 * Math.pow(2, attempt - 1))),
        );
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function packSnapshot(snap) {
  return {
    exists: snap.exists(),
    data: () => (snap.exists() ? snap.data() : undefined),
    id: snap.id,
    /**
     * `true` when `exists` reflects an actual server or cache read. Consumers that must route on
     * "profile exists vs. not" should treat `reliable === false` as "unknown — do not decide yet".
     */
    reliable: true,
  };
}

/**
 * @param {import('firebase/firestore').DocumentReference} docRef
 * @returns {Promise<{ exists: boolean, data: () => Record<string, unknown> | undefined, id: string, reliable: boolean }>}
 */
export async function readDocResilient(docRef) {
  try {
    const snap = await getDocWithTargetIdRetries(docRef);
    return packSnapshot(snap);
  } catch (err) {
    if (!isFirestoreOfflineLikeError(err) && !isFirestoreTargetIdError(err)) throw err;
    try {
      const snap = await getDocFromCache(docRef);
      return packSnapshot(snap);
    } catch {
      /**
       * Both network and cache failed. We do NOT know whether the doc exists — callers that route
       * on existence must wait for a real snapshot. `exists:false` is a safe placeholder for
       * callers that only need a defaulting read (e.g. ensureUserDocument). `reliable:false`
       * flags this to callers that care.
       */
      return { exists: false, data: () => undefined, id: docRef.id, reliable: false };
    }
  }
}
