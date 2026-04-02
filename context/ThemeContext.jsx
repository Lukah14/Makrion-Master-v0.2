import { createContext, useContext, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Colors as LightColors, DarkColors } from '@/constants/colors';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState('light');

  const resolvedScheme =
    preference === 'system' ? systemScheme || 'light' : preference;

  const isDark = resolvedScheme === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  const value = useMemo(
    () => ({ colors, isDark, preference, setPreference }),
    [colors, isDark, preference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
