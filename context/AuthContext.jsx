import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { onAuthChange, signOutUser } from '@/services/authService';
import { bootLog, bootStage } from '@/lib/onboardingDebug';
import { flowLog } from '@/lib/flowLog';
import { AUTH_BOOT_FAILSAFE_MS } from '@/lib/bootstrapConstants';
import { tearDownAllFirestoreListeners } from '@/lib/firestoreListenerLifecycle';
import { terminateFirestoreDbForWeb, disableNetworkForNativeSignOut } from '@/lib/firebase';

const AuthContext = createContext(null);

/**
 * Single source of truth for Firebase Auth lifecycle.
 *
 * Exposed state:
 * - `user`                 — current Firebase user object, or `null` when signed out.
 * - `authInitializing`     — `true` ONLY until the first `onAuthStateChanged` callback fires.
 *                            After that it stays `false` across the rest of the app lifetime,
 *                            including sign-out → sign-in transitions.
 * - `loading`              — legacy alias kept for backwards compatibility with NavigationGate
 *                            and other consumers; equivalent to `authInitializing`.
 * - `generation`           — increments on every resolved auth transition (null↔uid, uid↔uid').
 *                            Downstream providers (profile) pin async work to this counter so
 *                            stale callbacks from a previous session can never apply state.
 *
 * Exposed actions:
 * - `signOut()`            — centralized logout. Clears listener-scoped refs, calls
 *                            `signOutUser()`, and lets `onAuthStateChanged` drive the rest.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [generation, setGeneration] = useState(0);
  const authResolvedRef = useRef(false);
  const prevUidRef = useRef(/** @type {string | null} */ (null));
  const signingOutRef = useRef(false);
  /**
   * Firebase's `onAuthStateChanged` fires on more than just session transitions:
   * initial attach, ID-token refresh, `getIdToken(true)`, and internal re-emits can all call
   * back with the SAME uid. We de-duplicate these so downstream consumers see exactly one
   * "user detected" event per sign-in, avoiding duplicated logs and redundant setState churn
   * that has historically looked like "same user detected twice".
   */
  const lastHandledUidRef = useRef(/** @type {string | null} */ (null));
  const callbackSeqRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let failsafe = null;
    let unsubscribe = () => {};

    const run = async () => {
      /**
       * Clear persisted session *before* `onAuthStateChanged` so no tab/profile Firestore
       * listeners attach while a stale user is still in memory (reduces RN Firestore stream errors).
       * Set `EXPO_PUBLIC_SIGN_OUT_ON_LAUNCH=1` in `.env` for a clean unauthenticated start.
       */
      if (process.env.EXPO_PUBLIC_SIGN_OUT_ON_LAUNCH === '1') {
        try {
          /**
           * Nothing should be subscribed this early, but run the teardown defensively —
           * Fast Refresh / HMR or a warm JS bundle can leave module-scoped buckets around
           * from a previous dev session.
           */
          tearDownAllFirestoreListeners('launch_forced_signOut');
          await signOutUser();
          if (__DEV__) {
            bootLog('EXPO_PUBLIC_SIGN_OUT_ON_LAUNCH=1 — signed out before auth listener');
          }
        } catch {
          /* ignore */
        }
      }
      if (cancelled) return;

      flowLog('AUTH_START');
      flowLog('APP_BOOT_START');
      bootLog('app boot started');
      bootStage('auth', 'AuthProvider mount');
      authResolvedRef.current = false;
      flowLog('LOADING_SET_TRUE', { scope: 'auth' });
      setAuthInitializing(true);
      flowLog('AUTH_LISTENER_ATTACH');
      bootLog('auth listener started');

      failsafe = setTimeout(() => {
        if (authResolvedRef.current) return;
        flowLog('LOADING_SET_FALSE', { reason: 'AUTH_FAILSAFE' });
        bootLog(
          `auth failsafe (${AUTH_BOOT_FAILSAFE_MS}ms): no callback — setAuthInitializing(false), continue unauthenticated`,
        );
        setAuthInitializing(false);
        bootLog('loading finished', 'auth failsafe');
      }, AUTH_BOOT_FAILSAFE_MS);

      unsubscribe = onAuthChange((firebaseUser) => {
        authResolvedRef.current = true;
        clearTimeout(failsafe);
        const seq = ++callbackSeqRef.current;
        const nextUid = firebaseUser?.uid ?? null;
        const prev = prevUidRef.current;
        const prevHandled = lastHandledUidRef.current;
        const uidChanged = prev !== nextUid;
        const isSignOut = prev != null && nextUid == null;
        const isSessionSwap = prev != null && nextUid != null && prev !== nextUid;
        /**
         * DUPLICATE DETECTION. Firebase re-emits the current auth state for token refreshes,
         * internal reauths, and some platform events. These callbacks carry the SAME uid and
         * must NOT cascade through downstream providers — otherwise the profile bootstrap,
         * loading flags, and navigation gate all flicker for no reason and logs look like
         * "same user detected twice".
         */
        if (!uidChanged && prevHandled === nextUid) {
          if (__DEV__) {
            console.log('[AUTH] duplicate callback — same uid, ignoring downstream side-effects', {
              seq,
              uid: nextUid ? `${nextUid.slice(0, 8)}…` : null,
            });
          }
          /**
           * Still refresh `user` with the latest object (newer token/photoURL/displayName).
           * `user?.uid` is stable, so UserProfileContext's effect keyed on `user?.uid`
           * will NOT re-run. No listener churn, no extra getDoc.
           */
          setUser(firebaseUser);
          return;
        }
        if (__DEV__ && uidChanged) {
          console.log('[AUTH_SESSION]', {
            seq,
            event: prev == null && nextUid != null
              ? 'SIGN_IN'
              : isSignOut
                ? 'SIGN_OUT'
                : 'SESSION_SWAP',
            fromUid: prev ? `${prev.slice(0, 8)}…` : null,
            toUid: nextUid ? `${nextUid.slice(0, 8)}…` : null,
          });
        }
        /**
         * Safety net: if Firebase Auth reports a sign-out or session swap that our
         * `AuthContext.signOut` did NOT initiate (e.g. token revoke, external `signOut(auth)`,
         * deleted account), rip any remaining `onSnapshot` listeners down before React
         * re-renders consumers. This runs AFTER the auth-token flip, so it's a last line of
         * defence — the primary prevention is the pre-signOut teardown in `signOut()` above.
         */
        if ((isSignOut || isSessionSwap) && !signingOutRef.current) {
          try {
            tearDownAllFirestoreListeners(
              isSignOut ? 'external_signOut' : 'session_swap_callback',
            );
          } catch (e) {
            if (__DEV__) {
              console.warn('[AUTH] post-flip teardown threw (non-fatal)', e?.message || e);
            }
          }
        }
        prevUidRef.current = nextUid;
        lastHandledUidRef.current = nextUid;
        if (firebaseUser?.uid) {
          flowLog('AUTH_USER_FOUND', firebaseUser.uid);
          bootLog('auth user detected', firebaseUser.uid);
          if (__DEV__) {
            console.log('[AUTH] user detected (new)', {
              uid: `${firebaseUser.uid.slice(0, 8)}…`,
              email: firebaseUser.email || null,
              isAnonymous: firebaseUser.isAnonymous === true,
              providerId: firebaseUser.providerData?.[0]?.providerId || null,
            });
          }
        } else {
          flowLog('AUTH_NO_USER');
          bootLog('no auth user');
          signingOutRef.current = false;
          if (__DEV__) {
            console.log('[AUTH] no user (signed out)');
          }
        }
        setUser(firebaseUser);
        /**
         * Bump generation ONLY on actual session transitions. A transient callback with the same
         * uid (e.g. token refresh) must not invalidate in-flight profile bootstrap work.
         */
        if (uidChanged) {
          setGeneration((g) => g + 1);
        }
        flowLog('LOADING_SET_FALSE', { reason: 'AUTH_RESOLVED' });
        setAuthInitializing(false);
        bootLog('loading finished', 'auth state resolved');
      });
    };

    void run();

    return () => {
      cancelled = true;
      if (failsafe) clearTimeout(failsafe);
      unsubscribe();
    };
  }, []);

  /**
   * Centralized sign-out.
   *
   * Ordering is load-bearing. We MUST synchronously detach every Firestore `onSnapshot`
   * BEFORE calling `signOut(auth)`. If any listener is alive when Firebase flips the auth
   * token, its server-side watch stream can deliver a target-change for the dying session
   * that the client's `TargetState` cannot reconcile — hard-asserting `ca9` deep inside
   * the Firestore AsyncQueue. That assertion bypasses `onSnapshot(..., onError)`, poisons
   * the queue, and every subsequent `firestoreClientListen` enqueue throws `b815`
   * ("AsyncQueue already failed"), crashing RN in a loop on the next re-login attempt.
   *
   * Callers do NOT need to manually reset state — downstream providers
   * (UserProfileProvider, OnboardingNavProvider) are keyed on `user?.uid` and will tear
   * down their own subscribers + state when Firebase fires `onAuthStateChanged(null)`.
   * NavigationGate will replace the route to `/(auth)/login`. The `signingOutRef` guard
   * avoids double-entry.
   */
  const signOut = useCallback(async () => {
    if (signingOutRef.current) {
      if (__DEV__) console.log('[AUTH] signOut ignored — already signing out');
      return;
    }
    signingOutRef.current = true;
    /**
     * Reset the duplicate-detection ref so that if the user signs back in with the SAME uid
     * after this logout, our `onAuthStateChanged` handler treats it as a fresh SIGN_IN event
     * instead of a duplicate callback.
     */
    lastHandledUidRef.current = null;
    bootLog('logout cleanup started');
    flowLog('AUTH_SIGN_OUT_START', { uid: prevUidRef.current });
    if (__DEV__) {
      console.log('[AUTH] signOut() start', {
        uid: prevUidRef.current ? `${prevUidRef.current.slice(0, 8)}…` : null,
      });
    }
    /**
     * Close the Firestore transport BEFORE evicting listeners and revoking the auth token.
     *
     * Without this, the flow is:
     *   innerUnsub() → WATCH_REMOVE queued → long-poll still alive → server sends one last
     *   WATCH_CHANGE for the just-removed target → client's TargetState is already gone →
     *   hardAssert(false) → ca9 → AsyncQueue poisoned → every subsequent Firestore call
     *   (including the next login's profile write) throws b815.
     *
     * Web  : terminate() + page reload (db is unusable after terminate; reload gives a new instance).
     * Native: disableNetwork() closes the long-poll without destroying the instance; enableNetwork()
     *         is called automatically by UserProfileContext on the next sign-in.
     */
    if (Platform.OS === 'web') {
      try {
        await terminateFirestoreDbForWeb();
      } catch (e) {
        if (__DEV__) {
          console.warn('[AUTH] terminateFirestoreDbForWeb threw (non-fatal)', e?.message || e);
        }
      }
    } else {
      try {
        await disableNetworkForNativeSignOut();
      } catch (e) {
        if (__DEV__) {
          console.warn('[AUTH] disableNetworkForNativeSignOut threw (non-fatal)', e?.message || e);
        }
      }
    }
    /**
     * CRITICAL: rip every live `onSnapshot` down BEFORE the auth-token flip. This must be
     * synchronous and must happen before the `signOutUser()` await so that no microtask
     * can schedule a new listener attach between here and the token change.
     */
    try {
      tearDownAllFirestoreListeners('pre_signOut');
    } catch (e) {
      if (__DEV__) {
        console.warn('[AUTH] tearDownAllFirestoreListeners threw (non-fatal)', e?.message || e);
      }
    }
    try {
      await signOutUser();
      bootLog('logout cleanup completed (firebase signOut ok)');
      flowLog('AUTH_SIGN_OUT_OK');
    } catch (e) {
      signingOutRef.current = false;
      bootLog('logout cleanup failed', e?.message || e);
      flowLog('AUTH_SIGN_OUT_FAILED', { message: e?.message || String(e) });
      throw e;
    }
    /**
     * Web: reload the page after sign-out. Since `terminateFirestoreDbForWeb()` above
     * already closed and cleared the Firestore singleton, the app cannot make Firestore
     * calls in this tab without a fresh instance. A full page reload is the standard
     * recovery pattern for Firebase Firestore on web after a session ends.
     *
     * The Firebase Auth sign-out is already committed at this point, so after reload the
     * NavigationGate will correctly route to the login screen.
     */
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[AUTH] web sign-out complete — reloading page for clean Firestore instance');
      }
      window.location.reload();
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      authInitializing,
      loading: authInitializing,
      generation,
      signOut,
    }),
    [user, authInitializing, generation, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
