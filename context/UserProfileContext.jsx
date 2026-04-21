import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { doc, enableNetwork } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { readDocResilient } from '@/lib/firestoreResilientRead';
import { useAuth } from '@/context/AuthContext';
import {
  subscribeUsersRootDocument,
  evictAllUsersRootListenerBuckets,
} from '@/lib/firestoreUserDoc';
import {
  subscribeMainProfileDocument,
  evictAllMainProfileListenerBuckets,
} from '@/lib/firestoreMainProfileDoc';
import {
  updateUserProfile,
  updateUserGoals,
  updateUserPreferences,
  patchUserDocument,
  syncProfilesFromUserDoc,
} from '@/services/userService';
import { mergeMainHealthProfile } from '@/services/userHealthProfileService';
import { mergeRootGoalsWithMainProfile } from '@/services/userGoalSyncService';
import {
  isHealthProfileComplete,
  isOnboardingCompleteFromUserDoc,
} from '@/lib/healthProfile';
import { PROFILE_BOOT_FAILSAFE_MS } from '@/lib/bootstrapConstants';
import { bootLog } from '@/lib/onboardingDebug';
import { flowLog } from '@/lib/flowLog';

const UserProfileContext = createContext(null);

/**
 * Single place for `users/{uid}` + `users/{uid}/profile/main` listeners.
 * Avoids mounting two React effects (useUser + useUserHealthProfile) that each subscribed — RN Firestore
 * can throw "Target ID already exists" when attach/teardown races.
 */
export function UserProfileProvider({ children }) {
  const { user, generation: authGeneration } = useAuth();
  const [userData, setUserData] = useState(null);
  const [mainHealthProfile, setMainHealthProfile] = useState(null);
  const [mainProfileReady, setMainProfileReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streamError, setStreamError] = useState(null);
  const [profileResolved, setProfileResolved] = useState(false);
  const [profileExists, setProfileExists] = useState(null);
  const [retryToken, setRetryToken] = useState(0);
  const prevUidRef = useRef(null);
  const goalLoadLoggedRef = useRef(false);
  /** Auth-session pin: async resolutions from a prior session never write state into a new one. */
  const sessionGenRef = useRef(authGeneration ?? 0);
  /**
   * Single source of truth for "is a profile bootstrap currently running?" — scoped by
   * `${uid}:${retryToken}`. Prevents a second `runBootstrap()` from starting while the first
   * is still in flight (e.g. rapid `user?.uid` flicker, Fast Refresh re-mount, or retry called
   * while the initial getDoc is pending).
   */
  const bootstrapInProgressRef = useRef(/** @type {string | null} */ (null));
  /**
   * Uid of the currently attached users/{uid} + profile/main listener pair. This is the
   * explicit assertion the spec calls `activeProfileListenerRef`. The underlying
   * subscribe*Document buckets already dedupe by `projectId::uid`, but we keep this ref so
   * logs and guards can clearly say "listener already attached for uid X, skipping".
   */
  const activeProfileListenerRef = useRef(/** @type {string | null} */ (null));

  useEffect(() => {
    sessionGenRef.current = authGeneration ?? 0;
  }, [authGeneration]);

  useEffect(() => {
    if (!user) {
      if (__DEV__) {
        console.log('[PROFILE] auth cleared — resetting profile state');
      }
      /**
       * CRITICAL: detach every surviving users/{uid} + profile/main onSnapshot SYNCHRONOUSLY.
       * The per-bucket grace destroyTimer (~2.8–3.5s) is only safe within ONE auth session.
       * If a watch stream is still attached when Firebase Auth flips to null, the next server
       * WATCH_CHANGE arriving for the dead session drives WatchChangeAggregator into an
       * unknown target and hard-asserts (ca9) from the Firestore async queue — an error that
       * bypasses onSnapshot's error callback and crashes the RN runtime in a loop.
       */
      evictAllMainProfileListenerBuckets('logout');
      evictAllUsersRootListenerBuckets('logout');
      prevUidRef.current = null;
      goalLoadLoggedRef.current = false;
      bootstrapInProgressRef.current = null;
      if (activeProfileListenerRef.current && __DEV__) {
        console.log('[PROFILE] listener cleared on logout', {
          uid: `${String(activeProfileListenerRef.current).slice(0, 8)}…`,
        });
      }
      activeProfileListenerRef.current = null;
      setUserData(null);
      setMainHealthProfile(null);
      setMainProfileReady(false);
      setLoading(false);
      setStreamError(null);
      setProfileResolved(false);
      setProfileExists(null);
      /** Fresh slate for the NEXT sign-in — no stale retryToken from the previous session. */
      setRetryToken(0);
      flowLog('AUTH_USER_FOUND', { uid: null });
      return undefined;
    }

    const uid = user.uid;
    const uidChanged = prevUidRef.current !== uid;
    if (uidChanged) {
      /** Belt-and-suspenders: also evict on session swap (uid A → uid B without a null step). */
      if (prevUidRef.current != null) {
        evictAllMainProfileListenerBuckets('session_swap');
        evictAllUsersRootListenerBuckets('session_swap');
      }
      prevUidRef.current = uid;
      goalLoadLoggedRef.current = false;
      bootstrapInProgressRef.current = null;
      activeProfileListenerRef.current = null;
      setUserData(null);
      setMainHealthProfile(null);
      setMainProfileReady(false);
      setProfileExists(null);
    }

    flowLog('AUTH_USER_FOUND', { uid });
    flowLog('APP_BOOT_START', { scope: 'UserProfileProvider', uid });
    flowLog('PROFILE_LOAD_START', { uid, source: 'UserProfileProvider', retryToken });
    flowLog('LOADING_START', { scope: 'user_profile_bootstrap' });
    setLoading(true);
    setStreamError(null);
    setProfileResolved(false);

    /** One enqueue per sign-in, not two from parallel listener attach (avoids RN async-queue fail after signOut/disableNetwork). */
    void enableNetwork(db).catch(() => {});

    let cancelled = false;
    let bootstrapClosed = false;
    let unsubUsers = null;
    let unsubMain = null;
    let mainAttachTimer = null;
    let failSafeTimer = null;
    let liveAttachScheduled = false;
    /** Pin this effect to the auth generation captured at mount. Any callback that resolves after
     *  a logout/login swap (generation bump) is ignored even if `cancelled` is still false on the
     *  same tick. */
    const effectGeneration = sessionGenRef.current;
    const isStale = () => cancelled || sessionGenRef.current !== effectGeneration;

    /**
     * Stagger second doc listen: RN WebChannel/long-poll + two targets within ~300ms wedges TargetState (ca9).
     * iOS used 320ms before — too tight; align with Android-scale delay for native.
     */
    const msStaggerMainAfterUsersListen =
      Platform.OS === 'web'
        ? __DEV__
          ? 1500
          : 600
        : 2200;

    /** Native + web: one frame/tick after bootstrap before first onSnapshot (reduces queue contention). */
    const deferLiveListenersMs =
      Platform.OS === 'web' ? (__DEV__ ? 200 : 80) : __DEV__ ? 120 : 50;

    const clearFailSafe = () => {
      if (failSafeTimer != null) {
        clearTimeout(failSafeTimer);
        failSafeTimer = null;
      }
    };

    const attachLiveListeners = () => {
      if (isStale() || liveAttachScheduled) return;
      /**
       * Spec guard: never attach a second listener pair for a uid that already has one.
       * The underlying shared-bucket in `firestoreUserDoc` / `firestoreMainProfileDoc`
       * already dedupes by `projectId::uid`, but this ref makes the invariant explicit here.
       */
      if (activeProfileListenerRef.current === uid) {
        if (__DEV__) {
          console.log('[PROFILE] listener already active — skipping duplicate attach', {
            uid: `${uid.slice(0, 8)}…`,
          });
        }
        return;
      }
      liveAttachScheduled = true;
      activeProfileListenerRef.current = uid;
      if (__DEV__) {
        console.log('[PROFILE] listener attach → users_root', {
          uid: `${uid.slice(0, 8)}…`,
          authGen: effectGeneration,
        });
      }

      unsubUsers = subscribeUsersRootDocument(db, uid, {
        onData: (snap) => {
          if (isStale()) return;
          const exists = snap.exists();
          setProfileExists(exists);
          setUserData(exists ? { id: snap.id, ...snap.data() } : null);
          setLoading(false);
          setStreamError(null);
          if (__DEV__) {
            console.log('[PROFILE] users_root snapshot', {
              uid: `${uid.slice(0, 8)}…`,
              exists,
              onboardingCompleted: exists ? (snap.data()?.onboardingCompleted ?? null) : null,
            });
          }
          flowLog('PROFILE_LOAD_SUCCESS', {
            uid,
            path: 'users_root',
            exists,
            source: 'onSnapshot',
          });
        },
        onHardError: (err) => {
          if (isStale()) return;
          flowLog('PROFILE_LOAD_FAILED', {
            uid,
            path: 'users_root',
            message: err?.message || String(err),
            source: 'onSnapshot',
          });
          setProfileExists(null);
          setStreamError(err?.message || String(err));
          setLoading(false);
        },
      });

      mainAttachTimer = setTimeout(() => {
        mainAttachTimer = null;
        if (isStale()) return;
        if (__DEV__) {
          console.log('[PROFILE] listener attach → profile_main', {
            uid: `${uid.slice(0, 8)}…`,
          });
        }
        unsubMain = subscribeMainProfileDocument(db, uid, {
          onData: (snap) => {
            if (isStale()) return;
            setMainHealthProfile(snap.exists() ? snap.data() : null);
            setMainProfileReady(true);
          },
          onHardError: (err) => {
            if (isStale()) return;
            flowLog('PROFILE_LOAD_FAILED', {
              uid,
              path: 'profile_main',
              message: err?.message || String(err),
              source: 'onSnapshot',
            });
            setMainHealthProfile(null);
            setMainProfileReady(true);
          },
        });
      }, msStaggerMainAfterUsersListen);
    };

    /**
     * One-time getDoc bootstrap only (no watch targets). Then defer onSnapshot so startup never
     * overlaps listener attach with parallel getDoc recovery (RN "Target ID already exists").
     */
    const closeBootstrap = (patch) => {
      if (isStale() || bootstrapClosed) return;
      bootstrapClosed = true;
      clearFailSafe();
      if (patch && typeof patch === 'object') {
        if ('userPayload' in patch) setUserData(patch.userPayload);
        if ('mainPayload' in patch) setMainHealthProfile(patch.mainPayload);
        if ('userExists' in patch) setProfileExists(patch.userExists);
        if ('streamError' in patch) setStreamError(patch.streamError);
      }
      setProfileResolved(true);
      setLoading(false);
      setMainProfileReady(true);
      if (__DEV__) {
        console.log('[PROFILE] bootstrap closed', {
          uid,
          reason: patch?.reason || 'getDoc_bootstrap',
          userExists: patch?.userExists ?? null,
          hasMain: !!patch?.mainPayload,
        });
      }
      flowLog('LOADING_END', {
        scope: 'user_profile_bootstrap',
        reason: patch?.reason || 'getDoc_bootstrap',
      });
      setTimeout(() => {
        if (!isStale()) attachLiveListeners();
      }, deferLiveListenersMs);
    };

    failSafeTimer = setTimeout(() => {
      if (isStale() || bootstrapClosed) return;
      bootLog('UserProfileProvider: failsafe — unblock + live listeners');
      flowLog('PROFILE_GET_FAILED', { uid, reason: 'failsafe_timeout' });
      flowLog('PROFILE_LOAD_FAILED', { uid, reason: 'failsafe_timeout' });
      closeBootstrap({ reason: 'failsafe_timeout' });
    }, PROFILE_BOOT_FAILSAFE_MS);

    const runBootstrap = async () => {
      const bootKey = `${uid}:${retryToken}`;
      if (bootstrapInProgressRef.current === bootKey) {
        if (__DEV__) {
          console.log('[PROFILE] bootstrap already in progress — skipping duplicate', {
            uid: `${uid.slice(0, 8)}…`,
            retryToken,
          });
        }
        return;
      }
      bootstrapInProgressRef.current = bootKey;
      flowLog('PROFILE_GET_START', { uid, retryToken });
      if (__DEV__) {
        console.log('[PROFILE] fetch started', {
          uid: `${uid.slice(0, 8)}…`,
          retryToken,
          authGen: effectGeneration,
        });
      }
      try {
        const uRef = doc(db, 'users', uid);
        const mRef = doc(db, 'users', uid, 'profile', 'main');
        const [u, m] = await Promise.all([readDocResilient(uRef), readDocResilient(mRef)]);
        if (isStale() || bootstrapClosed) return;
        clearFailSafe();
        /**
         * If `readDocResilient` reports `reliable:false`, both the live read and the cache read
         * failed — `exists:false` is a placeholder, NOT a real answer. Do NOT claim
         * `profileExists` in that case; leave the decision to the live listener. This was the
         * root cause of the "onboarding flicker on re-login" bug: when the Firestore async queue
         * was wedged after a previous session, the fabricated `exists:false` made the gate route
         * an existing user to onboarding for a few hundred ms until the live snapshot arrived.
         */
        const userReliable = u.reliable !== false;
        const mainReliable = m.reliable !== false;
        const userPayload = userReliable && u.exists ? { id: u.id, ...u.data() } : null;
        const mainPayload = mainReliable && m.exists ? m.data() : null;
        if (__DEV__) {
          console.log('[PROFILE] fetch success', {
            uid,
            profileExists: userReliable ? u.exists : 'unknown',
            profileMainExists: mainReliable ? m.exists : 'unknown',
            onboardingCompleted: userPayload?.onboardingCompleted ?? null,
            userReliable,
            mainReliable,
          });
        }
        flowLog('PROFILE_GET_SUCCESS', {
          uid,
          usersExists: userReliable ? u.exists : null,
          profileMainExists: mainReliable ? m.exists : null,
          userReliable,
          mainReliable,
        });
        const patch = {
          userPayload,
          mainPayload,
          streamError: null,
          reason: userReliable ? 'getDoc_ok' : 'getDoc_unreliable',
        };
        /** Only claim `profileExists` when the read was actually reliable. */
        if (userReliable) patch.userExists = u.exists;
        closeBootstrap(patch);
      } catch (e) {
        if (isStale() || bootstrapClosed) return;
        clearFailSafe();
        const msg = e?.message || String(e);
        if (__DEV__) {
          console.warn('[PROFILE] fetch failed', { uid: `${uid.slice(0, 8)}…`, message: msg });
        }
        flowLog('PROFILE_GET_FAILED', { uid, message: msg });
        /**
         * Do NOT set `userExists:false` on a thrown read — we genuinely do not know. Let the
         * live listener decide. The gate's `profileExists === null` branch keeps the splash
         * visible until the listener fires (or until the absolute failsafe trips).
         */
        closeBootstrap({
          userPayload: null,
          mainPayload: null,
          streamError: msg,
          reason: 'getDoc_throw',
        });
      } finally {
        /** Release the in-progress latch for this (uid, retryToken) key. A later retry
         *  (bumping `retryToken`) will use a new bootKey and run freely. */
        if (bootstrapInProgressRef.current === bootKey) {
          bootstrapInProgressRef.current = null;
        }
      }
    };

    void runBootstrap();

    return () => {
      cancelled = true;
      clearFailSafe();
      if (mainAttachTimer != null) clearTimeout(mainAttachTimer);
      if (typeof unsubUsers === 'function') {
        if (__DEV__) {
          console.log('[PROFILE] listener unsub → users_root', {
            uid: `${uid.slice(0, 8)}…`,
          });
        }
        unsubUsers();
      }
      if (typeof unsubMain === 'function') {
        if (__DEV__) {
          console.log('[PROFILE] listener unsub → profile_main', {
            uid: `${uid.slice(0, 8)}…`,
          });
        }
        unsubMain();
      }
      /** The listener pair is gone; let a future effect run re-attach. */
      if (activeProfileListenerRef.current === uid) {
        activeProfileListenerRef.current = null;
      }
    };
  }, [user?.uid, retryToken]);

  const resolvedGoals = useMemo(() => {
    if (!userData) return null;
    return mergeRootGoalsWithMainProfile(userData, mainHealthProfile);
  }, [userData, mainHealthProfile]);

  /** Root flags OR field-based root doc OR canonical profile/main (isProfileComplete + health fields). */
  const onboardingComplete = useMemo(
    () =>
      isOnboardingCompleteFromUserDoc(userData) || isHealthProfileComplete(mainHealthProfile),
    [userData, mainHealthProfile],
  );

  useEffect(() => {
    if (!user?.uid || userData == null || !mainProfileReady || goalLoadLoggedRef.current) return;
    goalLoadLoggedRef.current = true;
    flowLog('PROFILE_LOAD_SUCCESS', {
      uid: user.uid,
      phase: 'both_streams_ready',
      profileMainExists: !!mainHealthProfile,
      onboardingComplete,
    });
  }, [user?.uid, userData, mainProfileReady, mainHealthProfile, onboardingComplete]);

  const retry = useCallback(() => {
    flowLog('PROFILE_LOAD_START', { reason: 'user_retry' });
    goalLoadLoggedRef.current = false;
    setRetryToken((t) => t + 1);
  }, []);

  const saveProfile = useCallback(
    async (profileData) => {
      if (!user) return;
      flowLog('PROFILE_SAVE_START', { scope: 'saveProfile', uid: user.uid });
      if (__DEV__) {
        console.log('[PROFILE] write started (saveProfile)', { uid: `${user.uid.slice(0, 8)}…` });
      }
      try {
        await updateUserProfile(user.uid, profileData);
        setUserData((prev) => ({ ...prev, profile: profileData }));
        flowLog('PROFILE_SAVE_SUCCESS', { scope: 'saveProfile', uid: user.uid });
        if (__DEV__) {
          console.log('[PROFILE] write completed (saveProfile)', { uid: `${user.uid.slice(0, 8)}…` });
        }
      } catch (e) {
        flowLog('PROFILE_SAVE_FAILED', { scope: 'saveProfile', uid: user.uid, message: e?.message });
        throw e;
      }
    },
    [user],
  );

  const saveGoals = useCallback(
    async (goals) => {
      if (!user) return;
      flowLog('PROFILE_SAVE_START', { scope: 'saveGoals', uid: user.uid });
      if (__DEV__) {
        console.log('[PROFILE] write started (saveGoals)', { uid: `${user.uid.slice(0, 8)}…` });
      }
      try {
        await updateUserGoals(user.uid, goals);
        setUserData((prev) => ({ ...prev, goals }));
        flowLog('PROFILE_SAVE_SUCCESS', { scope: 'saveGoals', uid: user.uid });
        if (__DEV__) {
          console.log('[PROFILE] write completed (saveGoals)', { uid: `${user.uid.slice(0, 8)}…` });
        }
      } catch (e) {
        flowLog('PROFILE_SAVE_FAILED', { scope: 'saveGoals', uid: user.uid, message: e?.message });
        throw e;
      }
    },
    [user],
  );

  const savePreferences = useCallback(
    async (preferences) => {
      if (!user) return;
      flowLog('PROFILE_SAVE_START', { scope: 'savePreferences', uid: user.uid });
      if (__DEV__) {
        console.log('[PROFILE] write started (savePreferences)', { uid: `${user.uid.slice(0, 8)}…` });
      }
      try {
        await updateUserPreferences(user.uid, preferences);
        setUserData((prev) => ({ ...prev, preferences }));
        flowLog('PROFILE_SAVE_SUCCESS', { scope: 'savePreferences', uid: user.uid });
        if (__DEV__) {
          console.log('[PROFILE] write completed (savePreferences)', { uid: `${user.uid.slice(0, 8)}…` });
        }
      } catch (e) {
        flowLog('PROFILE_SAVE_FAILED', { scope: 'savePreferences', uid: user.uid, message: e?.message });
        throw e;
      }
    },
    [user],
  );

  const patchUser = useCallback(
    async (partial, mainProfileMerge = null) => {
      if (!user) return;
      flowLog('PROFILE_SAVE_START', { scope: 'patchUser' });
      try {
        await patchUserDocument(user.uid, partial);
        if (mainProfileMerge && typeof mainProfileMerge === 'object') {
          await mergeMainHealthProfile(user.uid, mainProfileMerge);
        }
        await syncProfilesFromUserDoc(user.uid);
        setUserData((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          if (partial.displayName !== undefined) next.displayName = partial.displayName;
          if (partial.photoURL !== undefined) next.photoURL = partial.photoURL;
          if (partial.profile && typeof partial.profile === 'object') {
            next.profile = { ...(next.profile || {}), ...partial.profile };
          }
          if (partial.goals && typeof partial.goals === 'object') {
            next.goals = { ...(next.goals || {}), ...partial.goals };
          }
          if (partial.preferences && typeof partial.preferences === 'object') {
            next.preferences = { ...(next.preferences || {}), ...partial.preferences };
          }
          return next;
        });
        if (mainProfileMerge && typeof mainProfileMerge === 'object') {
          setMainHealthProfile((prev) => ({
            ...(prev && typeof prev === 'object' ? prev : {}),
            ...mainProfileMerge,
          }));
        }
        flowLog('PROFILE_SAVE_SUCCESS', { scope: 'patchUser' });
      } catch (e) {
        flowLog('PROFILE_SAVE_FAILED', { scope: 'patchUser', message: e?.message });
        throw e;
      }
    },
    [user],
  );

  const value = useMemo(
    () => ({
      userData,
      mainHealthProfile,
      mainProfileReady,
      resolvedGoals,
      loading,
      /** Spec-name alias (same semantics as `loading`): profile bootstrap is in progress. */
      profileLoading: loading,
      error: streamError,
      profileResolved,
      profileExists,
      onboardingComplete,
      /** Spec-name alias of `onboardingComplete` — explicit for consumers. */
      onboardingCompleted: onboardingComplete,
      retry,
      saveProfile,
      saveGoals,
      savePreferences,
      patchUser,
    }),
    [
      userData,
      mainHealthProfile,
      mainProfileReady,
      resolvedGoals,
      loading,
      streamError,
      profileResolved,
      profileExists,
      onboardingComplete,
      retry,
      saveProfile,
      saveGoals,
      savePreferences,
      patchUser,
    ],
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfileContext() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error('useUserProfileContext must be used within UserProfileProvider');
  }
  return ctx;
}
