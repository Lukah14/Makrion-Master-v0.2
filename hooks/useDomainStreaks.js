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

const LOOKBACK_DAYS = 365;
const STREAK_COLD_START_DELAY_MS = 800;
/** Cheap clock tick — checks if `todayDateKey()` rolled over to a new day. */
const MIDNIGHT_TICK_MS = 30_000;

/**
 * Single shared "Current Strike" derived from real Firestore daily data.
 *
 * A day counts toward the streak if it has at least one valid saved entry in
 * **any** tracked domain (nutrition / activity / habit tracker). The current
 * strike walks backward from today and stops at the first missed day, so:
 *   - new valid entry today → strike grows immediately on next refresh,
 *   - no entry by next-day rollover → strike resets to 0.
 *
 * @param {number} [refreshKey]  Bump after any save (calendarRefreshKey) to refetch.
 */
export function useDomainStreaks(refreshKey = 0) {
  const { user } = useAuth();
  const streakColdStartPendingRef = useRef(true);
  const lastSavedStrikesRef = useRef(null);
  const generationRef = useRef(0);
  const todayKeyRef = useRef(todayDateKey());

  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [nutritionStreak, setNutritionStreak] = useState(0);
  const [activityStreak, setActivityStreak] = useState(0);
  const [habitTrackerStreak, setHabitTrackerStreak] = useState(0);
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
      setNutritionStreak(0);
      setActivityStreak(0);
      setHabitTrackerStreak(0);
      setLoading(false);
      setError(null);
      return;
    }

    const uid = user.uid;
    if (__DEV__) console.log('[STRIKE] LOAD_START', { uid: uid.slice(0, 8) });
    setLoading(true);
    setError(null);
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

      // Unified day-active map — a day "counts" if any domain logged a valid entry.
      const unifiedMap = new Map();
      for (const k of keys) {
        unifiedMap.set(
          k,
          Boolean(nutritionMap.get(k) || activityMap.get(k) || habitMap.get(k)),
        );
      }

      const cur = computeDashboardCurrentStreak(unifiedMap, todayKey);
      const best = computeBestStreakInRange(keys, unifiedMap);

      const n = computeDashboardCurrentStreak(nutritionMap, todayKey);
      const a = computeDashboardCurrentStreak(activityMap, todayKey);
      const h = computeDashboardCurrentStreak(habitMap, todayKey);

      if (__DEV__) {
        console.log('[STRIKE] CALCULATED', {
          currentStreak: cur,
          bestStreak: best,
          perDomain: { nutrition: n, activity: a, habitTracker: h },
        });
      }

      setCurrentStreak(cur);
      setBestStreak(best);
      setNutritionStreak(n);
      setActivityStreak(a);
      setHabitTrackerStreak(h);

      const prev = lastSavedStrikesRef.current;
      if (
        !prev
        || prev.dateKey !== todayKey
        || prev.cur !== cur
        || prev.n !== n
        || prev.a !== a
        || prev.h !== h
      ) {
        lastSavedStrikesRef.current = { dateKey: todayKey, cur, n, a, h };
        void saveDomainStrikesSnapshot(uid, {
          currentStreak: cur,
          bestStreak: best,
          nutritionStreak: n,
          activityStreak: a,
          habitTrackerStreak: h,
          dateKey: todayKey,
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
      setNutritionStreak(0);
      setActivityStreak(0);
      setHabitTrackerStreak(0);
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
      setNutritionStreak(0);
      setActivityStreak(0);
      setHabitTrackerStreak(0);
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
   * open across midnight), recompute. Without this the streak would keep pointing at
   * yesterday's `todayKey` and never reset.
   *
   * Two triggers, both cheap:
   *   - 30s interval polling `todayDateKey()`
   *   - AppState `active` (foregrounded after a long sleep — interval may have been throttled)
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
    currentStreak,
    bestStreak,
    nutritionStreak,
    activityStreak,
    habitTrackerStreak,
    loading,
    error,
    reload: load,
  };
}
