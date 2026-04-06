import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/hooks/useUser';
import { getStepEntry, upsertStepEntry } from '@/services/stepEntryService';
import { patchUserDocument, syncProfilesFromUserDoc } from '@/services/userService';

export const DEFAULT_STEPS_GOAL = 10000;

function parseNonNegativeInt(v) {
  const n = Math.floor(Number(String(v).replace(/\s/g, '')));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parsePositiveInt(v) {
  const n = Math.floor(Number(String(v).replace(/\s/g, '')));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Daily steps: users/{uid}/dailySteps/{dateKey} (falls back to legacy profiles/.../daily_logs).
 * Goal: users/{uid}.goals.stepsGoal (default 10000).
 * @param {string} dateKey  YYYY-MM-DD
 * @param {number} [refreshKey]  Pass calendarRefreshKey to reload after cross-screen saves.
 */
export function useSteps(dateKey, refreshKey = 0) {
  const { user } = useAuth();
  const { userData } = useUser();
  const [steps, setSteps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const goal = useMemo(() => {
    const g = Number(userData?.goals?.stepsGoal);
    if (Number.isFinite(g) && g > 0) return Math.floor(g);
    return DEFAULT_STEPS_GOAL;
  }, [userData?.goals?.stepsGoal]);

  const load = useCallback(async () => {
    if (!user?.uid || !dateKey) {
      setSteps(0);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const row = await getStepEntry(user.uid, dateKey);
      setSteps(row?.steps ?? 0);
    } catch (e) {
      setError(e?.message || String(e));
      setSteps(0);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, dateKey, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSteps = useCallback(
    async (raw) => {
      if (!user?.uid || !dateKey) throw new Error('Sign in and pick a date.');
      const n = parseNonNegativeInt(raw);
      if (n === null) throw new Error('Enter a valid whole number (0 or more).');
      await upsertStepEntry(user.uid, dateKey, n);
      setSteps(n);
    },
    [user?.uid, dateKey],
  );

  const saveGoal = useCallback(
    async (raw) => {
      if (!user?.uid) throw new Error('You must be signed in.');
      const n = parsePositiveInt(raw);
      if (n === null) throw new Error('Goal must be a positive whole number.');
      await patchUserDocument(user.uid, { goals: { stepsGoal: n } });
      await syncProfilesFromUserDoc(user.uid);
    },
    [user?.uid],
  );

  const stepProgressPercent = useMemo(() => {
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((steps / goal) * 100));
  }, [steps, goal]);

  return {
    steps,
    goal,
    loading,
    error,
    stepProgressPercent,
    reload: load,
    saveSteps,
    saveGoal,
  };
}
