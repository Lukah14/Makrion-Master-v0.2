import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthChange, signOutUser } from '@/services/authService';
import { bootLog, bootStage } from '@/lib/onboardingDebug';
import { flowLog } from '@/lib/flowLog';
import { AUTH_BOOT_FAILSAFE_MS } from '@/lib/bootstrapConstants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const authResolvedRef = useRef(false);
  const prevUidRef = useRef(/** @type {string | null} */ (null));

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
      setLoading(true);
      flowLog('AUTH_LISTENER_ATTACH');
      bootLog('auth listener started');

      failsafe = setTimeout(() => {
        if (authResolvedRef.current) return;
        flowLog('LOADING_SET_FALSE', { reason: 'AUTH_FAILSAFE' });
        bootLog(
          `auth failsafe (${AUTH_BOOT_FAILSAFE_MS}ms): no callback — setLoading(false), continue unauthenticated`,
        );
        setLoading(false);
        bootLog('loading finished', 'auth failsafe');
      }, AUTH_BOOT_FAILSAFE_MS);

      unsubscribe = onAuthChange((firebaseUser) => {
        authResolvedRef.current = true;
        clearTimeout(failsafe);
        const nextUid = firebaseUser?.uid ?? null;
        if (__DEV__) {
          const prev = prevUidRef.current;
          if (prev !== nextUid) {
            console.log('[AUTH_SESSION]', {
              fromUid: prev ? `${prev.slice(0, 8)}…` : null,
              toUid: nextUid ? `${nextUid.slice(0, 8)}…` : null,
            });
          }
          prevUidRef.current = nextUid;
        } else {
          prevUidRef.current = nextUid;
        }
        if (firebaseUser?.uid) {
          flowLog('AUTH_USER_FOUND', firebaseUser.uid);
          bootLog('auth user detected', firebaseUser.uid);
        } else {
          flowLog('AUTH_NO_USER');
          bootLog('no auth user');
        }
        setUser(firebaseUser);
        flowLog('LOADING_SET_FALSE', { reason: 'AUTH_RESOLVED' });
        setLoading(false);
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

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
