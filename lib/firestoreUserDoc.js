import { Platform } from 'react-native';
import { doc, onSnapshot, enableNetwork } from 'firebase/firestore';
import { flowLog } from '@/lib/flowLog';

/**
 * One physical onSnapshot per `users/{uid}` — multiple hooks (useUser, useUserHealthProfile, tabs)
 * otherwise register duplicate watch targets and Firestore throws "Target ID already exists" on RN.
 *
 * Bucket key includes project id so two Firestore instances (mis-init) never share one bucket.
 */
const buckets = new Map();

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

/** Firestore JS can surface wedged watch state as ca9/b815; never detach/reattach on these. */
function isBenignWatchStreamGlitch(err) {
  const msg = err?.message || String(err);
  return (
    /INTERNAL ASSERTION FAILED/i.test(msg) ||
    /Unexpected state \(ID: ca9\)/i.test(msg) ||
    /Unexpected state \(ID: b815\)/i.test(msg) ||
    /TargetState/i.test(msg)
  );
}

/** RN: reattaching on this error often spams errors while snapshots still succeed; do not detach. */
const TARGET_ID_LOG_THROTTLE_MS = 30_000;

/**
 * React 18+/19 dev Strict Mode runs effect mount → unmount → mount. Tearing down Firestore
 * listeners synchronously on the first unmount races the watch stream and triggers
 * INTERNAL ASSERTION FAILED (TargetState / ca9). Defer full detach until the bucket stays empty.
 * Web (especially Expo dev) needs a longer delay than iOS.
 */
function listenerBucketDestroyDelayMs() {
  if (Platform.OS === 'android') return 4000;
  if (Platform.OS === 'web') return __DEV__ ? 3500 : 1000;
  /** iOS: longer teardown avoids Strict Mode double-mount vs watch stream (same class of bug as Android). */
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
 * Subscribe to users/{uid} with RN-friendly behaviour:
 * - does not call getDocFromServer (server-only reads fail offline and are unnecessary here)
 * - onSnapshot uses normal cache/server resolution
 * - on "offline" listener errors, re-enables network and re-attaches the listener
 */
export function subscribeUsersRootDocument(db, uid, { onData, onHardError }) {
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
          // eslint-disable-next-line no-console
          console.warn('[Firestore] users doc subscriber onData error', e);
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
          // eslint-disable-next-line no-console
          console.warn('[Firestore] users doc subscriber onHardError error', e);
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
    const ref = doc(bucket.db, 'users', bucket.uid);
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
                ? '[Firestore] users doc Target ID conflict (ignored; listener kept)'
                : '[Firestore] users doc watch glitch (ignored; no detach)',
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
          /** Longer backoff + min delay reduces detach/reattach races (Unexpected state / TargetState on RN). */
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
                /* ignore — extra enableNetwork calls can fail the async queue while streams attach */
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
    flowLog('PROFILE_LISTENER_ATTACH', { path: 'users_root', uid, bucketKey: key });
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Firestore] users doc listener attach (shared)', uid);
    }
    /** Do not call enableNetwork here — lib/firebase.js already enables; concurrent enqueue breaks RN (ERROR null / ca9). */
    attach();
  }

  return () => {
    bucket.listeners.delete(id);
    if (bucket.listeners.size === 0) {
      cancelPendingBucketDestroy(bucket);
      bucket.pendingDestroyTimer = setTimeout(() => {
        bucket.pendingDestroyTimer = null;
        if (bucket.listeners.size > 0) return;
        flowLog('PROFILE_LISTENER_UNSUBSCRIBE', { path: 'users_root', uid, bucketKey: key });
        bucket.destroyed = true;
        detachInner();
        buckets.delete(key);
      }, listenerBucketDestroyDelayMs());
    }
  };
}
