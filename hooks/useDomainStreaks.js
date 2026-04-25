import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { todayDateKey, parseDateKey, toDateKey } from '@/lib/dateKey';
import {
  dateKeysInclusive,
  computeDashboardCurrentStreak,
  computeBestStreakInRange,
} from '@/lib/dashboardStreak';
import { getDomainStrikeMapsForKeys } from '@/services/domainStrikeService';
import { saveDomainStrikesSnapshot } from '@/services/streakSnapshotService';
import { ensureUserStats } from '@/services/statsService';

const LOOKBACK_DAYS = 365;
const STREAK_COLD_START_DELAY_MS = 800;
/** Cheap clock tick — checks if `todayDateKey()` rolled over to a new day. */
const MIDNIGHT_TICK_MS = 30_000;

/**
 * Per-domain and unified streaks derived from real Firestore daily data.
 *
 * Returns standardised field names used across the entire app:
 *   currentNutritionStreak / bestNutritionStreak
 *   currentActivityStreak  / bestActivityStreak
 *   currentHabitTrackerStreak / bestHabitTrackerStreak
 *   currentStreak          / bestStreak   (unified — any domain counts)
 *
 * @param {number} [refreshKey]  Bump after any save (calendarRefreshKey) to refetch.
 */
export function useDomainStreaks(refreshKey = 0) {
  const { user } = useAuth();
  const streakColdStartPendingRef = useRef(true);
  const lastSavedStrikesRef = useRef(null);
  const generationRef = useRef(0);
  const todayKeyRef = useRef(todayDateKey());

  // Unified
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Per-domain current
  const [currentNutritionStreak, setCurrentNutritionStreak] = useState(0);
  const [currentActivityStreak, setCurrentActivityStreak] = useState(0);
  const [currentHabitTrackerStreak, setCurrentHabitTrackerStreak] = useState(0);

  // Per-domain best
  const [bestNutritionStreak, setBestNutritionStreak] = useState(0);
  const [bestActivityStreak, setBestActivityStreak] = useState(0);
  const [bestHabitTrackerStreak, setBestHabitTrackerStreak] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    lastSavedStrikesRef.current = null;
  }, [user?.uid]);

  const load = useCallback(async () => {
    const gen = generationRef.current;

    if (!user?.uid) {
      if (__DEV__) console.log('[STRIKE] load skipped — no user');
      setCurrentStreak(0);
      setBestStreak(0);
      setCurrentNutritionStreak(0);
      setCurrentActivityStreak(0);
      setCurrentHabitTrackerStreak(0);
      setBestNutritionStreak(0);
      setBestActivityStreak(0);
      setBestHabitTrackerStreak(0);
      setLoading(false);
      setError(null);
      return;
    }

    const uid = user.uid;
    if (__DEV__) console.log('[STRIKE] LOAD_START', { uid: uid.slice(0, 8) });
    setLoading(true);
    setError(null);

    // Ensure stats/main doc exists and reset any stale current streaks (fire-and-forget)
    void ensureUserStats(uid).catch(() => {});

    try {
      const todayKey = todayDateKey();
      todayKeyRef.current = todayKey;
      const startD = parseDateKey(todayKey);
      startD.setDate(startD.getDate() - LOOKBACK_DAYS);
      const startKey = toDateKey(startD);
      const keys = dateKeysInclusive(startKey, todayKey);

      if (__DEV__) console.log('[STRIKE] querying', { days: keys.length, startKey, todayKey });

      const { nutritionMap, activityMap, habitMap } = await getDomainStrikeMapsForKeys(uid, keys);

      if (gen !== generationRef.current) {
        if (__DEV__) console.log('[STRIKE] load result discarded — user changed during query');
        return;
      }

      // Unified: a day "counts" if any domain logged a valid entry
      const unifiedMap = new Map();
      for (const k of keys) {
        unifiedMap.set(
          k,
          Boolean(nutritionMap.get(k) || activityMap.get(k) || habitMap.get(k)),
        );
      }

      // Unified streaks
      const cur = computeDashboardCurrentStreak(unifiedMap, todayKey);
      const best = computeBestStreakInRange(keys, unifiedMap);

      // Per-domain current streaks
      const curN = computeDashboardCurrentStreak(nutritionMap, todayKey);
      const curA = computeDashboardCurrentStreak(activityMap, todayKey);
      const curH = computeDashboardCurrentStreak(habitMap, todayKey);

      // Per-domain best streaks
      const bestN = computeBestStreakInRange(keys, nutritionMap);
      const bestA = computeBestStreakInRange(keys, activityMap);
      const bestH = computeBestStreakInRange(keys, habitMap);

      if (__DEV__) {
        console.log('[STRIKE] CALCULATED', {
          unified: { current: cur, best },
          nutrition: { current: curN, best: bestN },
          activity: { current: curA, best: bestA },
          habitTracker: { current: curH, best: bestH },
        });
      }

      setCurrentStreak(cur);
      setBestStreak(best);
      setCurrentNutritionStreak(curN);
      setCurrentActivityStreak(curA);
      setCurrentHabitTrackerStreak(curH);
      setBestNutritionStreak(bestN);
      setBestActivityStreak(bestA);
      setBestHabitTrackerStreak(bestH);

      // Save snapshot to Firestore (fire-and-forget) when values changed
      const prev = lastSavedStrikesRef.current;
      const todayNutritionCompleted = Boolean(nutritionMap.get(todayKey));
      const todayActivityCompleted = Boolean(activityMap.get(todayKey));
      const todayHabitCompleted = Boolean(habitMap.get(todayKey));

      if (
        !prev
        || prev.dateKey !== todayKey
        || prev.curN !== curN
        || prev.curA !== curA
        || prev.curH !== curH
        || prev.bestN !== bestN
        || prev.bestA !== bestA
        || prev.bestH !== bestH
      ) {
        lastSavedStrikesRef.current = { dateKey: todayKey, curN, curA, curH, bestN, bestA, bestH };
        void saveDomainStrikesSnapshot(uid, {
          // Unified (backward compat)
          currentStreak: cur,
          bestStreak: best,
          // Per-domain — exact required names
          currentNutritionStreak: curN,
          bestNutritionStreak: bestN,
          currentActivityStreak: curA,
          bestActivityStreak: bestA,
          currentHabitTrackerStreak: curH,
          bestHabitTrackerStreak: bestH,
          dateKey: todayKey,
          // Daily completion flags for dailyLogs
          nutritionCompleted: todayNutritionCompleted,
          activityCompleted: todayActivityCompleted,
          habitTrackerCompleted: todayHabitCompleted,
        }).catch(() => {});
      }
    } catch (e) {
      if (gen !== generationRef.current) {
        if (__DEV__) console.log('[STRIKE] load error discarded — user changed during query');
        return;
      }
      const msg = e?.message || String(e);
      if (__DEV__) console.warn('[STRIKE] LOAD_ERROR', msg);
      setError(msg);
      setCurrentStreak(0);
      setBestStreak(0);
      setCurrentNutritionStreak(0);
      setCurrentActivityStreak(0);
      setCurrentHabitTrackerStreak(0);
      setBestNutritionStreak(0);
      setBestActivityStreak(0);
      setBestHabitTrackerStreak(0);
    } finally {
      if (gen === generationRef.current) {
        setLoading(false);
        if (__DEV__) console.log('[STRIKE] LOAD_END');
      }
    }
  }, [user?.uid]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    generationRef.current += 1;

    if (!user?.uid) {
      streakColdStartPendingRef.current = true;
      setCurrentStreak(0);
      setBestStreak(0);
      setCurrentNutritionStreak(0);
      setCurrentActivityStreak(0);
      setCurrentHabitTrackerStreak(0);
      setBestNutritionStreak(0);
      setBestActivityStreak(0);
      setBestHabitTrackerStreak(0);
      setLoading(false);
      setError(null);
      if (__DEV__) console.log('[STRIKE] user signed out — state reset');
      return undefined;
    }
    streakColdStartPendingRef.current = true;
    if (__DEV__) console.log('[STRIKE] cold-start timer armed', { delay: STREAK_COLD_START_DELAY_MS });
    const t = setTimeout(() => {
      streakColdStartPendingRef.current = false;
      void loadRef.current();
    }, STREAK_COLD_START_DELAY_MS);
    return () => clearTimeout(t);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    if (streakColdStartPendingRef.current && refreshKey === 0) return;
    void load();
  }, [refreshKey, load, user?.uid]);

  /**
   * Real calendar-day rollover: when the local YYYY-MM-DD changes (e.g. user keeps the app
   * open across midnight), recompute.
   */
  useEffect(() => {
    if (!user?.uid) return undefined;

    const checkRollover = (reason) => {
      const now = todayDateKey();
      if (now !== todayKeyRef.current) {
        if (__DEV__) {
          console.log('[STRIKE] day rollover detected', {
            from: todayKeyRef.current,
            to: now,
            reason,
          });
        }
        todayKeyRef.current = now;
        void loadRef.current();
      }
    };

    const interval = setInterval(() => checkRollover('interval'), MIDNIGHT_TICK_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkRollover('appstate_active');
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [user?.uid]);

  return {
    // Unified (any domain counts; kept for backward compat)
    currentStreak,
    bestStreak,
    // Per-domain — exact standardised names used across the whole app
    currentNutritionStreak,
    bestNutritionStreak,
    currentActivityStreak,
    bestActivityStreak,
    currentHabitTrackerStreak,
    bestHabitTrackerStreak,
    // Legacy aliases — map to domain-specific for any consumer that still uses old names
    nutritionStreak: currentNutritionStreak,
    activityStreak: currentActivityStreak,
    habitTrackerStreak: currentHabitTrackerStreak,
    loading,
    error,
    reload: load,
  };
}
