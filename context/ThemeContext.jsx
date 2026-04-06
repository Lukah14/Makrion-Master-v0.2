import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors as LightColors, DarkColors } from '@/constants/colors';

const ThemeContext = createContext(null);

export const APPEARANCE_STORAGE_KEY = '@makrion/appearance';

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState('light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(APPEARANCE_STORAGE_KEY);
        if (!cancelled && (v === 'light' || v === 'dark' || v === 'system')) {
          setPreferenceState(v);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback(async (p) => {
    const next = p === 'dark' || p === 'system' || p === 'light' ? p : 'light';
    setPreferenceState(next);
    try {
      await AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const resolvedScheme =
    preference === 'system' ? systemScheme || 'light' : preference;

  const isDark = resolvedScheme === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  const value = useMemo(
    () => ({
      colors,
      isDark,
      preference,
      setPreference,
      themeHydrated: hydrated,
    }),
    [colors, isDark, preference, setPreference, hydrated],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
