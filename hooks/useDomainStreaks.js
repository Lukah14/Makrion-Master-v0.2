import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { todayDateKey, parseDateKey, toDateKey } from '@/lib/dateKey';
import { dateKeysInclusive, computeDashboardCurrentStreak } from '@/lib/dashboardStreak';
import { getDomainStrikeMapsForKeys } from '@/services/domainStrikeService';

const LOOKBACK_DAYS = 400;
/** Let profile + dashboard listeners attach before ~hundreds of getDocs (reduces RN Firestore wedging). */
const STREAK_COLD_START_DELAY_MS = 2200;

/**
 * Current consecutive-day strikes for Nutrition, Activity, and Habit Tracker (ends at real today).
 * @param {number} [refreshKey]  Bump when daily data changes (e.g. calendarRefreshKey).
 */
export function useDomainStreaks(refreshKey = 0) {
  const { user } = useAuth();
  const streakColdStartPendingRef = useRef(true);
  const [nutritionStreak, setNutritionStreak] = useState(0);
  const [activityStreak, setActivityStreak] = useState(0);
  const [habitTrackerStreak, setHabitTrackerStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user?.uid) {
      setNutritionStreak(0);
      setActivityStreak(0);
      setHabitTrackerStreak(0);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const todayKey = todayDateKey();
      const startD = parseDateKey(todayKey);
      startD.setDate(startD.getDate() - LOOKBACK_DAYS);
      const startKey = toDateKey(startD);
      const keys = dateKeysInclusive(startKey, todayKey);

      const { nutritionMap, activityMap, habitMap } = await getDomainStrikeMapsForKeys(
        user.uid,
        keys,
      );

      setNutritionStreak(computeDashboardCurrentStreak(nutritionMap, todayKey));
      setActivityStreak(computeDashboardCurrentStreak(activityMap, todayKey));
      setHabitTrackerStreak(computeDashboardCurrentStreak(habitMap, todayKey));
    } catch (e) {
      setError(e?.message || String(e));
      setNutritionStreak(0);
      setActivityStreak(0);
      setHabitTrackerStreak(0);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, refreshKey]);

  useEffect(() => {
    if (!user?.uid) {
      streakColdStartPendingRef.current = true;
      void load();
      return undefined;
    }
    if (!streakColdStartPendingRef.current) {
      void load();
      return undefined;
    }
    const t = setTimeout(() => {
      streakColdStartPendingRef.current = false;
      void load();
    }, STREAK_COLD_START_DELAY_MS);
    return () => clearTimeout(t);
  }, [load, user?.uid]);

  return {
    nutritionStreak,
    activityStreak,
    habitTrackerStreak,
    loading,
    error,
    reload: load,
  };
}
