import { useEffect, useRef } from 'react';
import { useUserProfileContext } from '@/context/UserProfileContext';
import { onboardingLog, bootLog } from '@/lib/onboardingDebug';
import { flowLog } from '@/lib/flowLog';

/**
 * Onboarding / gate fields — same Firestore streams as {@link useUser} (no second `users/{uid}` listener).
 */
export function useUserHealthProfile() {
  const ctx = useUserProfileContext();
  const {
    userData,
    loading,
    error,
    onboardingComplete: complete,
    retry,
    profileResolved,
    profileExists,
  } = ctx;

  const prevRef = useRef({});

  useEffect(() => {
    if (!userData?.id && !profileResolved) return;
    const key = `${complete}:${profileResolved}`;
    if (prevRef.current.key === key) return;
    prevRef.current.key = key;
    flowLog(complete ? 'PROFILE_COMPLETE' : 'PROFILE_INCOMPLETE', {
      uid: userData?.id,
      profileCompleted: userData?.profileCompleted,
      onboardingCompleted: userData?.onboardingCompleted,
      fromMainProfile: complete && !userData?.profileCompleted,
    });
    bootLog(complete ? 'profile complete' : 'profile incomplete', {
      profileCompleted: userData?.profileCompleted,
      onboardingCompleted: userData?.onboardingCompleted,
    });
    if (__DEV__) {
      onboardingLog('useUserHealthProfile: complete =', complete, {
        profileCompleted: userData?.profileCompleted,
        onboardingCompleted: userData?.onboardingCompleted,
      });
    }
  }, [complete, profileResolved, userData?.id, userData?.profileCompleted, userData?.onboardingCompleted]);

  return {
    profile: userData,
    loading,
    error,
    complete,
    retry,
    profileResolved,
    profileExists,
  };
}
