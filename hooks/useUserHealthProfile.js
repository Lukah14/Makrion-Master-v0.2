import { useEffect, useState, useMemo, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { isOnboardingCompleteFromUserDoc } from '@/lib/healthProfile';
import { onboardingLog } from '@/lib/onboardingDebug';

/**
 * Live onboarding status from users/{uid} (same doc as useUser — always allowed by owner rules).
 */
export function useUserHealthProfile() {
  const { user } = useAuth();
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setUserDoc(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setUserDoc(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err?.message || String(err));
        setLoading(false);
      },
    );

    return unsub;
  }, [user?.uid, retryToken]);

  const complete = useMemo(() => isOnboardingCompleteFromUserDoc(userDoc), [userDoc]);

  useEffect(() => {
    if (!user?.uid) return;
    onboardingLog('useUserHealthProfile: complete =', complete, {
      profileCompleted: userDoc?.profileCompleted,
      onboardingCompleted: userDoc?.onboardingCompleted,
    });
  }, [user?.uid, complete, userDoc?.profileCompleted, userDoc?.onboardingCompleted]);

  const retry = useCallback(() => {
    setRetryToken((t) => t + 1);
  }, []);

  return { profile: userDoc, loading, error, complete, retry };
}
