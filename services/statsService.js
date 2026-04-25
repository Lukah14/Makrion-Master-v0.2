/**
 * Firestore Stats service — users/{uid}/stats/main
 *
 * Exact field names (per spec):
 *   currentActivityStreak / bestActivityStreak
 *   currentHabitTrackerStreak / bestHabitTrackerStreak
 *   currentNutritionStreak / bestNutritionStreak
 *   ActivityStrikesComputedForDate / HabitTrackerStrikesComputedForDate / NutritionStrikesComputedForDate
 *   ActivityStrikesUpdatedAt / HabitTrackerStrikesUpdatedAt / NutritionStrikesUpdatedAt
 *
 * Streak increment rules:
 *  - Each module tracks its own streak independently.
 *  - A streak increments at most once per calendar day (idempotent via ComputedForDate).
 *  - Only today's dateKey can increase a streak (past edits are ignored by callers).
 *  - If ComputedForDate is older than yesterday, the current streak resets to 0 on next earn.
 *  - Best streak is never decreased.
 *
 * Missed-day reset:
 *  - ensureUserStats() reads stats and resets any current streak whose ComputedForDate
 *    is older than yesterday. Called on app open / dashboard load.
 */

import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { todayDateKey, addDaysToDateKey } from '@/lib/dateKey';

// ─── Constants ──────────────────────────────────────────────────────────────

export const DEFAULT_STATS = {
  currentActivityStreak: 0,
  bestActivityStreak: 0,
  currentHabitTrackerStreak: 0,
  bestHabitTrackerStreak: 0,
  currentNutritionStreak: 0,
  bestNutritionStreak: 0,
  ActivityStrikesComputedForDate: null,
  HabitTrackerStrikesComputedForDate: null,
  NutritionStrikesComputedForDate: null,
  ActivityStrikesUpdatedAt: null,
  HabitTrackerStrikesUpdatedAt: null,
  NutritionStrikesUpdatedAt: null,
};

const MODULES = [
  {
    computed: 'NutritionStrikesComputedForDate',
    current: 'currentNutritionStreak',
    updatedAt: 'NutritionStrikesUpdatedAt',
  },
  {
    computed: 'ActivityStrikesComputedForDate',
    current: 'currentActivityStreak',
    updatedAt: 'ActivityStrikesUpdatedAt',
  },
  {
    computed: 'HabitTrackerStrikesComputedForDate',
    current: 'currentHabitTrackerStreak',
    updatedAt: 'HabitTrackerStrikesUpdatedAt',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statsRef(uid) {
  return doc(db, 'users', uid, 'stats', 'main');
}

function clampNonNegInt(n) {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Read the stats document. Returns DEFAULT_STATS if missing.
 */
export async function getUserStats(uid) {
  if (!uid) return { ...DEFAULT_STATS };
  const snap = await getDoc(statsRef(uid));
  if (!snap.exists()) return { ...DEFAULT_STATS };
  return { ...DEFAULT_STATS, ...snap.data() };
}

/**
 * Ensure users/{uid}/stats/main exists with all required fields.
 * Creates the document if missing.
 * Merges any missing default fields without overwriting existing values.
 * Resets current streak to 0 for any module whose ComputedForDate is older than yesterday.
 */
export async function ensureUserStats(uid) {
  if (!uid) return;
  const ref = statsRef(uid);
  const today = todayDateKey();
  const yesterday = addDaysToDateKey(today, -1);

  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...DEFAULT_STATS, createdAt: serverTimestamp() }, { merge: true });
    return;
  }

  const data = snap.data() || {};
  const updates = {};

  // Merge any missing default fields (backward compat)
  for (const [key, defVal] of Object.entries(DEFAULT_STATS)) {
    if (data[key] === undefined) {
      updates[key] = defVal;
    }
  }

  // Missed-day reset: if computedDate is older than yesterday, reset current streak
  for (const mod of MODULES) {
    const computedDate = data[mod.computed] || null;
    const current = clampNonNegInt(data[mod.current]);
    if (computedDate && computedDate !== today && computedDate !== yesterday && current > 0) {
      updates[mod.current] = 0;
      updates[mod.updatedAt] = serverTimestamp();
    }
  }

  if (Object.keys(updates).length > 0) {
    await setDoc(ref, updates, { merge: true });
  }
}

/**
 * Internal: increment a single module's streak for the given dateKey.
 * Uses a Firestore transaction to prevent double-increments.
 *
 * Streak logic:
 *  A) If computedForDate === dateKey → already earned today, no-op.
 *  B) If computedForDate === yesterday → consecutive day, +1.
 *  C) If computedForDate is null → first day ever, set to 1.
 *  D) Otherwise (missed days) → reset to 1.
 *  E) best = max(best, current).
 */
async function updateModuleStreak({
  uid,
  currentField,
  bestField,
  computedForDateField,
  updatedAtField,
  dateKey,
}) {
  if (!uid || !dateKey) return null;

  const ref = statsRef(uid);
  const yesterday = addDaysToDateKey(dateKey, -1);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? (snap.data() || {}) : {};

    const prevComputedDate = data[computedForDateField] ?? null;

    // A) Already earned today
    if (prevComputedDate === dateKey) return data;

    const oldCurrent = clampNonNegInt(data[currentField]);
    const oldBest = clampNonNegInt(data[bestField]);

    let newCurrent;
    if (prevComputedDate === null || prevComputedDate === undefined) {
      // C) First day ever
      newCurrent = 1;
    } else if (prevComputedDate === yesterday) {
      // B) Consecutive day
      newCurrent = oldCurrent + 1;
    } else {
      // D) Missed days — reset and start fresh
      newCurrent = 1;
    }

    // E) Best streak never decreases
    const newBest = Math.max(oldBest, newCurrent);

    const patch = {
      [currentField]: newCurrent,
      [bestField]: newBest,
      [computedForDateField]: dateKey,
      [updatedAtField]: serverTimestamp(),
    };

    if (!snap.exists()) {
      tx.set(ref, { ...DEFAULT_STATS, ...patch, createdAt: serverTimestamp() });
    } else {
      tx.set(ref, patch, { merge: true });
    }

    return { ...data, ...patch };
  });
}

/**
 * Call after user successfully logs food for today.
 * Only call when dateKey === todayDateKey() to prevent past-date cheating.
 */
export async function updateNutritionStreak(uid, dateKey) {
  if (!uid || !dateKey) return;
  try {
    await updateModuleStreak({
      uid,
      currentField: 'currentNutritionStreak',
      bestField: 'bestNutritionStreak',
      computedForDateField: 'NutritionStrikesComputedForDate',
      updatedAtField: 'NutritionStrikesUpdatedAt',
      dateKey,
    });
  } catch (e) {
    if (__DEV__) console.warn('[stats] updateNutritionStreak error', e?.message || e);
  }
}

/**
 * Call after user successfully logs an activity for today.
 * Only call when dateKey === todayDateKey() to prevent past-date cheating.
 */
export async function updateActivityStreak(uid, dateKey) {
  if (!uid || !dateKey) return;
  try {
    await updateModuleStreak({
      uid,
      currentField: 'currentActivityStreak',
      bestField: 'bestActivityStreak',
      computedForDateField: 'ActivityStrikesComputedForDate',
      updatedAtField: 'ActivityStrikesUpdatedAt',
      dateKey,
    });
  } catch (e) {
    if (__DEV__) console.warn('[stats] updateActivityStreak error', e?.message || e);
  }
}

/**
 * Call after user completes/progresses at least one habit for today.
 * Only call when dateKey === todayDateKey() to prevent past-date cheating.
 */
export async function updateHabitTrackerStreak(uid, dateKey) {
  if (!uid || !dateKey) return;
  try {
    await updateModuleStreak({
      uid,
      currentField: 'currentHabitTrackerStreak',
      bestField: 'bestHabitTrackerStreak',
      computedForDateField: 'HabitTrackerStrikesComputedForDate',
      updatedAtField: 'HabitTrackerStrikesUpdatedAt',
      dateKey,
    });
  } catch (e) {
    if (__DEV__) console.warn('[stats] updateHabitTrackerStreak error', e?.message || e);
  }
}

/**
 * Convenience: update all three module streaks for today simultaneously.
 * Useful after a comprehensive re-sync.
 */
export async function recomputeAllStreaksForToday(uid) {
  if (!uid) return;
  const dateKey = todayDateKey();
  await Promise.all([
    updateNutritionStreak(uid, dateKey),
    updateActivityStreak(uid, dateKey),
    updateHabitTrackerStreak(uid, dateKey),
  ]);
}

/**
 * Write a full computed stats snapshot to users/{uid}/stats/main.
 * Called by useDomainStreaks after full 365-day recompute.
 * Does NOT use transactions (idempotent full overwrite of all streak fields).
 */
export async function saveStatsSnapshot(uid, snapshot) {
  if (!uid) return;
  const {
    currentNutritionStreak = 0,
    bestNutritionStreak = 0,
    currentActivityStreak = 0,
    bestActivityStreak = 0,
    currentHabitTrackerStreak = 0,
    bestHabitTrackerStreak = 0,
    dateKey = '',
  } = snapshot || {};

  const dk = String(dateKey || '').slice(0, 10) || null;
  const now = serverTimestamp();

  await setDoc(
    statsRef(uid),
    {
      currentNutritionStreak: clampNonNegInt(currentNutritionStreak),
      bestNutritionStreak: clampNonNegInt(bestNutritionStreak),
      NutritionStrikesComputedForDate: dk,
      NutritionStrikesUpdatedAt: now,

      currentActivityStreak: clampNonNegInt(currentActivityStreak),
      bestActivityStreak: clampNonNegInt(bestActivityStreak),
      ActivityStrikesComputedForDate: dk,
      ActivityStrikesUpdatedAt: now,

      currentHabitTrackerStreak: clampNonNegInt(currentHabitTrackerStreak),
      bestHabitTrackerStreak: clampNonNegInt(bestHabitTrackerStreak),
      HabitTrackerStrikesComputedForDate: dk,
      HabitTrackerStrikesUpdatedAt: now,
    },
    { merge: true },
  );
}
