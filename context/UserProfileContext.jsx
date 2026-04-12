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
import { subscribeUsersRootDocument } from '@/lib/firestoreUserDoc';
import { subscribeMainProfileDocument } from '@/lib/firestoreMainProfileDoc';
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
  const { user } = useAuth();
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

  useEffect(() => {
    if (!user) {
      prevUidRef.current = null;
      goalLoadLoggedRef.current = false;
      setUserData(null);
      setMainHealthProfile(null);
      setMainProfileReady(false);
      setLoading(false);
      setStreamError(null);
      setProfileResolved(false);
      setProfileExists(null);
      flowLog('AUTH_USER_FOUND', { uid: null });
      return undefined;
    }

    const uid = user.uid;
    const uidChanged = prevUidRef.current !== uid;
    if (uidChanged) {
      prevUidRef.current = uid;
      goalLoadLoggedRef.current = false;
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
      if (cancelled || liveAttachScheduled) return;
      liveAttachScheduled = true;

      unsubUsers = subscribeUsersRootDocument(db, uid, {
        onData: (snap) => {
          const exists = snap.exists();
          setProfileExists(exists);
          setUserData(exists ? { id: snap.id, ...snap.data() } : null);
          setLoading(false);
          setStreamError(null);
          flowLog('PROFILE_LOAD_SUCCESS', {
            uid,
            path: 'users_root',
            exists,
            source: 'onSnapshot',
          });
        },
        onHardError: (err) => {
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
        if (cancelled) return;
        unsubMain = subscribeMainProfileDocument(db, uid, {
          onData: (snap) => {
            setMainHealthProfile(snap.exists() ? snap.data() : null);
            setMainProfileReady(true);
          },
          onHardError: (err) => {
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
      if (cancelled || bootstrapClosed) return;
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
      flowLog('LOADING_END', {
        scope: 'user_profile_bootstrap',
        reason: patch?.reason || 'getDoc_bootstrap',
      });
      setTimeout(() => {
        if (!cancelled) attachLiveListeners();
      }, deferLiveListenersMs);
    };

    failSafeTimer = setTimeout(() => {
      if (cancelled || bootstrapClosed) return;
      bootLog('UserProfileProvider: failsafe — unblock + live listeners');
      flowLog('PROFILE_GET_FAILED', { uid, reason: 'failsafe_timeout' });
      flowLog('PROFILE_LOAD_FAILED', { uid, reason: 'failsafe_timeout' });
      closeBootstrap({ reason: 'failsafe_timeout' });
    }, PROFILE_BOOT_FAILSAFE_MS);

    const runBootstrap = async () => {
      flowLog('PROFILE_GET_START', { uid, retryToken });
      try {
        const uRef = doc(db, 'users', uid);
        const mRef = doc(db, 'users', uid, 'profile', 'main');
        const [u, m] = await Promise.all([readDocResilient(uRef), readDocResilient(mRef)]);
        if (cancelled || bootstrapClosed) return;
        clearFailSafe();
        const userPayload = u.exists ? { id: u.id, ...u.data() } : null;
        const mainPayload = m.exists ? m.data() : null;
        flowLog('PROFILE_GET_SUCCESS', {
          uid,
          usersExists: u.exists,
          profileMainExists: m.exists,
        });
        closeBootstrap({
          userExists: u.exists,
          userPayload,
          mainPayload,
          streamError: null,
          reason: 'getDoc_ok',
        });
      } catch (e) {
        if (cancelled || bootstrapClosed) return;
        clearFailSafe();
        const msg = e?.message || String(e);
        flowLog('PROFILE_GET_FAILED', { uid, message: msg });
        closeBootstrap({
          userExists: false,
          userPayload: null,
          mainPayload: null,
          streamError: msg,
          reason: 'getDoc_throw',
        });
      }
    };

    void runBootstrap();

    return () => {
      cancelled = true;
      clearFailSafe();
      if (mainAttachTimer != null) clearTimeout(mainAttachTimer);
      if (typeof unsubUsers === 'function') unsubUsers();
      if (typeof unsubMain === 'function') unsubMain();
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
      flowLog('PROFILE_SAVE_START', { scope: 'saveProfile' });
      try {
        await updateUserProfile(user.uid, profileData);
        setUserData((prev) => ({ ...prev, profile: profileData }));
        flowLog('PROFILE_SAVE_SUCCESS', { scope: 'saveProfile' });
      } catch (e) {
        flowLog('PROFILE_SAVE_FAILED', { scope: 'saveProfile', message: e?.message });
        throw e;
      }
    },
    [user],
  );

  const saveGoals = useCallback(
    async (goals) => {
      if (!user) return;
      flowLog('PROFILE_SAVE_START', { scope: 'saveGoals' });
      try {
        await updateUserGoals(user.uid, goals);
        setUserData((prev) => ({ ...prev, goals }));
        flowLog('PROFILE_SAVE_SUCCESS', { scope: 'saveGoals' });
      } catch (e) {
        flowLog('PROFILE_SAVE_FAILED', { scope: 'saveGoals', message: e?.message });
        throw e;
      }
    },
    [user],
  );

  const savePreferences = useCallback(
    async (preferences) => {
      if (!user) return;
      flowLog('PROFILE_SAVE_START', { scope: 'savePreferences' });
      try {
        await updateUserPreferences(user.uid, preferences);
        setUserData((prev) => ({ ...prev, preferences }));
        flowLog('PROFILE_SAVE_SUCCESS', { scope: 'savePreferences' });
      } catch (e) {
        flowLog('PROFILE_SAVE_FAILED', { scope: 'savePreferences', message: e?.message });
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
      error: streamError,
      profileResolved,
      profileExists,
      onboardingComplete,
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
