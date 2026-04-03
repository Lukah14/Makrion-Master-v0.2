import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { todayDateKey, isValidDateKey } from '@/lib/dateKey';

const NutritionDateContext = createContext(null);

export function NutritionDateProvider({ children }) {
  const { user } = useAuth();
  const [dateKey, setDateKeyState] = useState(todayDateKey);

  useEffect(() => {
    if (!user) {
      setDateKeyState(todayDateKey());
    }
  }, [user?.uid]);

  const setDateKey = useCallback((key) => {
    if (typeof key === 'string' && isValidDateKey(key)) {
      setDateKeyState(key);
    }
  }, []);

  const goToToday = useCallback(() => {
    setDateKeyState(todayDateKey());
  }, []);

  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const bumpCalendarRefresh = useCallback(() => {
    setCalendarRefreshKey((k) => k + 1);
  }, []);

  const value = useMemo(
    () => ({
      dateKey,
      setDateKey,
      goToToday,
      calendarRefreshKey,
      bumpCalendarRefresh,
    }),
    [dateKey, setDateKey, goToToday, calendarRefreshKey, bumpCalendarRefresh]
  );

  return (
    <NutritionDateContext.Provider value={value}>
      {children}
    </NutritionDateContext.Provider>
  );
}

export function useNutritionDate() {
  const ctx = useContext(NutritionDateContext);
  if (!ctx) {
    throw new Error('useNutritionDate must be used within NutritionDateProvider');
  }
  return ctx;
}

/** Global selected day for Dashboard, Nutrition, Activity, Habits, Water, Progress. */
export function useSelectedDate() {
  return useNutritionDate();
}
