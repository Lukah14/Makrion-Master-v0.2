import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { todayDateKey, parseDateKey, toDateKey } from '@/lib/dateKey';
import { dateKeysInclusive, computeDashboardCurrentStreak } from '@/lib/dashboardStreak';
import { getDayDomainStrikeFlags } from '@/services/domainStrikeService';

const LOOKBACK_DAYS = 400;
const CHUNK = 8;

/**
 * Current consecutive-day strikes for Nutrition, Activity, and Habit Tracker (ends at real today).
 * @param {number} [refreshKey]  Bump when daily data changes (e.g. calendarRefreshKey).
 */
export function useDomainStreaks(refreshKey = 0) {
  const { user } = useAuth();
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

      const nutritionMap = new Map();
      const activityMap = new Map();
      const habitMap = new Map();

      for (let i = 0; i < keys.length; i += CHUNK) {
        const slice = keys.slice(i, i + CHUNK);
        const flagsList = await Promise.all(
          slice.map((k) => getDayDomainStrikeFlags(user.uid, k)),
        );
        slice.forEach((k, idx) => {
          const f = flagsList[idx];
          nutritionMap.set(k, f.nutrition);
          activityMap.set(k, f.activity);
          habitMap.set(k, f.habitTracker);
        });
      }

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
    load();
  }, [load]);

  return {
    nutritionStreak,
    activityStreak,
    habitTrackerStreak,
    loading,
    error,
    reload: load,
  };
}
