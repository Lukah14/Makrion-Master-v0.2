import { Platform } from 'react-native';
import { doc, onSnapshot, enableNetwork } from 'firebase/firestore';
import { flowLog } from '@/lib/flowLog';

/**
 * One physical onSnapshot per `users/{uid}/profile/main` — avoids duplicate watch targets
 * ("Target ID already exists") when multiple hooks subscribe.
 *
 * Stored on globalThis so Expo web HMR module reloads do NOT reset to an empty Map.
 * See firestoreUserDoc.js for the full explanation.
 */
const _g = typeof globalThis !== 'undefined' ? globalThis : global;
const _MAIN_PROFILE_BUCKET_KEY = '__makrion_main_profile_listener_buckets__';
if (!_g[_MAIN_PROFILE_BUCKET_KEY]) _g[_MAIN_PROFILE_BUCKET_KEY] = new Map();
/** @type {Map<string, object>} */
const buckets = _g[_MAIN_PROFILE_BUCKET_KEY];

/** @param {import('firebase/firestore').Firestore} db */
function listenerBucketKey(db, uid) {
  const projectId = db?.app?.options?.projectId ?? 'default';
  return `${projectId}::${uid}`;
}

function looksOffline(err) {
  const msg = err?.message || String(err);
  return (
    /offline/i.test(msg) ||
    err?.code === 'unavailable' ||
    err?.code === 'failed-precondition'
  );
}

function isTargetIdConflict(err) {
  const msg = err?.message || String(err);
  return /Target ID already exists/i.test(msg);
}

function isBenignWatchStreamGlitch(err) {
  const msg = err?.message || String(err);
  return (
    /INTERNAL ASSERTION FAILED/i.test(msg) ||
    /Unexpected state \(ID: ca9\)/i.test(msg) ||
    /Unexpected state \(ID: b815\)/i.test(msg) ||
    /TargetState/i.test(msg)
  );
}

/** RN: reattaching amplifies this error while snapshots may still work. */
const TARGET_ID_LOG_THROTTLE_MS = 30_000;

/** See `firestoreUserDoc.js` — avoids Strict Mode unmount/mount wedging Firestore watch targets. */
function listenerBucketDestroyDelayMs() {
  if (Platform.OS === 'android') return 4000;
  if (Platform.OS === 'web') return __DEV__ ? 3500 : 1000;
  if (Platform.OS === 'ios') return __DEV__ ? 2800 : 800;
  return 500;
}

function cancelPendingBucketDestroy(bucket) {
  if (bucket.pendingDestroyTimer != null) {
    clearTimeout(bucket.pendingDestroyTimer);
    bucket.pendingDestroyTimer = null;
  }
}

/**
 * @param {import('firebase/firestore').Firestore} db
 * @param {string} uid
 * @param {{ onData: (snap: import('firebase/firestore').DocumentSnapshot) => void, onHardError: (err: Error) => void }} handlers
 */
export function subscribeMainProfileDocument(db, uid, { onData, onHardError }) {
  const key = listenerBucketKey(db, uid);
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = {
      listeners: new Map(),
      nextId: 0,
      innerUnsub: null,
      destroyed: false,
      offlineRetries: 0,
      lastTargetIdLogAt: 0,
      pendingDestroyTimer: null,
      db,
      uid,
    };
    buckets.set(key, bucket);
  }

  cancelPendingBucketDestroy(bucket);
  bucket.destroyed = false;

  const id = ++bucket.nextId;
  bucket.listeners.set(id, { onData, onHardError });

  const broadcastData = (snap) => {
    for (const l of bucket.listeners.values()) {
      try {
        l.onData(snap);
      } catch (e) {
        if (__DEV__) {
          console.warn('[Firestore] profile/main subscriber onData error', e);
        }
      }
    }
  };

  const broadcastError = (err) => {
    for (const l of bucket.listeners.values()) {
      try {
        l.onHardError(err);
      } catch (e) {
        if (__DEV__) {
          console.warn('[Firestore] profile/main subscriber onHardError error', e);
        }
      }
    }
  };

  const detachInner = () => {
    try {
      bucket.innerUnsub?.();
    } catch {
      /* ignore */
    }
    bucket.innerUnsub = null;
  };

  const maxOfflineRetries = 12;

  const attach = () => {
    if (bucket.destroyed) return;
    detachInner();
    const ref = doc(bucket.db, 'users', bucket.uid, 'profile', 'main');
    bucket.innerUnsub = onSnapshot(
      ref,
      (snap) => {
        bucket.offlineRetries = 0;
        broadcastData(snap);
      },
      (err) => {
        if (bucket.destroyed) return;
        if (isTargetIdConflict(err) || isBenignWatchStreamGlitch(err)) {
          const now = Date.now();
          if (__DEV__ && now - bucket.lastTargetIdLogAt > TARGET_ID_LOG_THROTTLE_MS) {
            bucket.lastTargetIdLogAt = now;
            // eslint-disable-next-line no-console
            console.log(
              isTargetIdConflict(err)
                ? '[Firestore] profile/main Target ID conflict (ignored; listener kept)'
                : '[Firestore] profile/main watch glitch (ignored; no detach)',
              bucket.uid,
            );
          }
          return;
        }
        if (
          Platform.OS !== 'web' &&
          looksOffline(err) &&
          bucket.offlineRetries < maxOfflineRetries
        ) {
          bucket.offlineRetries += 1;
          const delay = Math.max(
            1500,
            Math.min(8000, Math.round(350 * Math.pow(bucket.offlineRetries, 1.2))),
          );
          setTimeout(() => {
            if (bucket.destroyed) return;
            void (async () => {
              try {
                await enableNetwork(bucket.db);
              } catch {
                /* ignore */
              }
              if (bucket.destroyed) return;
              detachInner();
              attach();
            })();
          }, delay);
          return;
        }
        broadcastError(err);
      },
    );
  };

  if (bucket.listeners.size === 1 && !bucket.innerUnsub) {
    flowLog('PROFILE_LISTENER_ATTACH', { path: 'profile_main', uid, bucketKey: key });
    if (__DEV__) {
      console.log('[Firestore] profile/main listener attach (shared)', uid);
    }
    /** Do not call enableNetwork here — see firestoreUserDoc.js (RN async-queue wedge). */
    attach();
  }

  return () => {
    bucket.listeners.delete(id);
    if (bucket.listeners.size === 0) {
      cancelPendingBucketDestroy(bucket);
      bucket.pendingDestroyTimer = setTimeout(() => {
        bucket.pendingDestroyTimer = null;
        if (bucket.listeners.size > 0) return;
        flowLog('PROFILE_LISTENER_UNSUBSCRIBE', { path: 'profile_main', uid, bucketKey: key });
        bucket.destroyed = true;
        detachInner();
        buckets.delete(key);
      }, listenerBucketDestroyDelayMs());
    }
  };
}

/**
 * Force-tear-down EVERY users/{uid}/profile/main listener bucket synchronously.
 * See `evictAllUsersRootListenerBuckets` — same crash class (ca9 on logout→login).
 */
export function evictAllMainProfileListenerBuckets(reason = 'auth_session_change') {
  if (buckets.size === 0) return;
  if (__DEV__) {
    console.log('[Firestore] profile_main: evicting all listener buckets', {
      count: buckets.size,
      reason,
    });
  }
  for (const [key, bucket] of buckets) {
    try {
      if (bucket.pendingDestroyTimer != null) {
        clearTimeout(bucket.pendingDestroyTimer);
        bucket.pendingDestroyTimer = null;
      }
      bucket.destroyed = true;
      bucket.listeners.clear();
      try {
        bucket.innerUnsub?.();
      } catch {
        /* ignore */
      }
      bucket.innerUnsub = null;
      flowLog('PROFILE_LISTENER_UNSUBSCRIBE', {
        path: 'profile_main',
        uid: bucket.uid,
        bucketKey: key,
        reason,
        forced: true,
      });
    } catch (e) {
      if (__DEV__) {
        console.warn('[Firestore] profile_main eviction error for', key, e?.message || e);
      }
    }
  }
  buckets.clear();
}
