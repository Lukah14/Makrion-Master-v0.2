import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/hooks/useUser';
import { useTheme, APPEARANCE_STORAGE_KEY } from '@/context/ThemeContext';

/**
 * When Firestore users/{uid}.preferences.appearance is set, apply it (overrides local default after login).
 */
export default function AppearancePreferenceSync() {
  const { user } = useAuth();
  const { userData } = useUser();
  const { setPreference, themeHydrated } = useTheme();
  const appliedUid = useRef(null);

  useEffect(() => {
    if (!user?.uid || !themeHydrated) return;
    const a = userData?.preferences?.appearance;
    if (a !== 'light' && a !== 'dark' && a !== 'system') return;
    if (appliedUid.current === `${user.uid}:${a}`) return;
    appliedUid.current = `${user.uid}:${a}`;
    void (async () => {
      await setPreference(a);
      try {
        await AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, a);
      } catch {
        /* ignore */
      }
    })();
  }, [user?.uid, userData?.preferences?.appearance, setPreference, themeHydrated]);

  useEffect(() => {
    if (!user) appliedUid.current = null;
  }, [user]);

  return null;
}
