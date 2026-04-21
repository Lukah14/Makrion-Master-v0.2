/**
 * Central Firestore listener lifecycle.
 *
 * Every module that creates `onSnapshot` listeners with a reuse/bucket pattern exports an
 * `evictAll...()` helper that synchronously tears down its listeners (and clears any
 * grace-period destroy timer). This module wires all of those helpers together so we can
 * rip down the *entire* real-time subscription graph in one synchronous call.
 *
 * # Why this matters
 *
 * Firestore 12.x (web SDK on React Native) maintains a single long-lived gRPC-over-WebChannel
 * watch stream for every active `onSnapshot`. When the Firebase Auth token changes (sign-out,
 * user switch, token revoke), the server may still deliver a target-change message for a
 * target that the client's `TargetState` has already invalidated. The client then hits
 * `__PRIVATE_TargetState#We` / `__PRIVATE_WatchChangeAggregator#forEachTarget` and
 * `hardAssert`s with:
 *
 *   FIRESTORE (12.12.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9)
 *
 * That assertion fires from inside `AsyncQueueImpl`, bypasses the user-facing
 * `onSnapshot(..., onError)` callback, poisons the async queue, and then every subsequent
 * `firestoreClientListen` enqueue fails with `b815` ("The AsyncQueue is already failed").
 * On RN that surfaces as `Uncaught (in promise, id: 0) Error: FIRESTORE (12.12.0) ...` and
 * crashes Expo Go in a loop.
 *
 * # Fix
 *
 * Call `tearDownAllFirestoreListeners()` IMMEDIATELY BEFORE `signOut(auth)` (and on any other
 * known auth transition: app-launch forced sign-out, pre-login session swap). By the time
 * Firebase Auth flips its token, there is no active `onSnapshot` left for the watch stream
 * to poison.
 *
 * # When to call
 * - Right before `signOutUser()` in `AuthContext.signOut()` (PRIMARY).
 * - Right before the pre-bootstrap `signOutUser()` in `AuthProvider` for
 *   `EXPO_PUBLIC_SIGN_OUT_ON_LAUNCH=1`.
 * - Also called defensively inside `UserProfileContext` when `user` transitions to null or
 *   when uid changes — belt-and-suspenders for cases where callers of `signOut` bypass
 *   `AuthContext` (there should be none, but we keep the guard).
 */

import { evictAllUsersRootListenerBuckets } from '@/lib/firestoreUserDoc';
import { evictAllMainProfileListenerBuckets } from '@/lib/firestoreMainProfileDoc';
import { evictAllWaterBuckets } from '@/services/waterService';
import { evictAllActivityBuckets } from '@/services/activityService';
import { evictAllFoodLogBuckets } from '@/services/foodLogService';

/**
 * Synchronously detach every active Firestore `onSnapshot` across the app. Safe to call
 * multiple times; each evictor is a no-op when its bucket map is empty.
 *
 * @param {string} reason short label used for debug logs (e.g. 'pre_signOut', 'logout',
 *   'session_swap', 'launch_forced_signOut').
 */
export function tearDownAllFirestoreListeners(reason = 'auth_session_change') {
  if (__DEV__) {
    console.log('[Firestore] tearDownAllFirestoreListeners()', { reason });
  }
  try { evictAllMainProfileListenerBuckets(reason); } catch { /* ignore */ }
  try { evictAllUsersRootListenerBuckets(reason); } catch { /* ignore */ }
  try { evictAllWaterBuckets(reason); } catch { /* ignore */ }
  try { evictAllActivityBuckets(reason); } catch { /* ignore */ }
  try { evictAllFoodLogBuckets(reason); } catch { /* ignore */ }
}
