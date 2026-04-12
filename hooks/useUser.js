import { useUserProfileContext } from '@/context/UserProfileContext';

/**
 * User doc + profile/main streams and saves — backed by {@link UserProfileProvider} (single listener pair per uid).
 */
export function useUser() {
  const ctx = useUserProfileContext();
  const {
    userData,
    mainHealthProfile,
    mainProfileReady,
    resolvedGoals,
    loading,
    error,
    saveProfile,
    saveGoals,
    savePreferences,
    patchUser,
  } = ctx;
  return {
    userData,
    mainHealthProfile,
    mainProfileReady,
    resolvedGoals,
    loading,
    error,
    saveProfile,
    saveGoals,
    savePreferences,
    patchUser,
  };
}
