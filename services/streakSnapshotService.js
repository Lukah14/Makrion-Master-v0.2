/**
 * Persist the per-domain streak breakdown on users/{uid} (snapshot for cross-device sync).
 * Source of truth remains derived from daily logs; this is a snapshot only.
 *
 * Exact Firestore field names used (under stats.*):
 *   currentNutritionStreak / bestNutritionStreak
 *   currentActivityStreak  / bestActivityStreak
 *   currentHabitTrackerStreak / bestHabitTrackerStreak
 *   NutritionStrikesComputedForDate / NutritionStrikesUpdatedAt
 *   ActivityStrikesComputedForDate  / ActivityStrikesUpdatedAt
 *   HabitTrackerStrikesComputedForDate / HabitTrackerStrikesUpdatedAt
 *
 * Also writes legacy fields (currentStreak, bestStreak, nutritionStreak, activityStreak,
 * habitTrackerStreak, strikesComputedForDate, strikesUpdatedAt) for backward compatibility.
 */

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ensureUserRootShell } from '@/services/userService';
import { saveStatsSnapshot } from '@/services/statsService';

function clampNonNegInt(n) {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

/**
 * @param {string} uid
 * @param {{
 *   currentStreak?: number,
 *   bestStreak?: number,
 *   currentNutritionStreak?: number,
 *   bestNutritionStreak?: number,
 *   currentActivityStreak?: number,
 *   bestActivityStreak?: number,
 *   currentHabitTrackerStreak?: number,
 *   bestHabitTrackerStreak?: number,
 *   dateKey?: string,
 *   nutritionCompleted?: boolean,
 *   activityCompleted?: boolean,
 *   habitTrackerCompleted?: boolean,
 * }} snapshot
 */
export async function saveDomainStrikesSnapshot(uid, snapshot) {
  if (!uid || typeof uid !== 'string') return;
  const {
    currentStreak = 0,
    bestStreak = 0,
    currentNutritionStreak = 0,
    bestNutritionStreak = 0,
    currentActivityStreak = 0,
    bestActivityStreak = 0,
    currentHabitTrackerStreak = 0,
    bestHabitTrackerStreak = 0,
    dateKey = '',
    nutritionCompleted = false,
    activityCompleted = false,
    habitTrackerCompleted = false,
  } = snapshot || {};

  await ensureUserRootShell(uid);

  const cur = clampNonNegInt(currentStreak);
  const best = clampNonNegInt(bestStreak);
  const curN = clampNonNegInt(currentNutritionStreak);
  const bestN = clampNonNegInt(bestNutritionStreak);
  const curA = clampNonNegInt(currentActivityStreak);
  const bestA = clampNonNegInt(bestActivityStreak);
  const curH = clampNonNegInt(currentHabitTrackerStreak);
  const bestH = clampNonNegInt(bestHabitTrackerStreak);
  const dk = String(dateKey || '').slice(0, 10) || null;
  const now = serverTimestamp();

  const userRef = doc(db, 'users', uid);

  // Write streak snapshot to users/{uid} under stats.*
  // Uses setDoc with merge:true to avoid overwriting unrelated fields
  await setDoc(
    userRef,
    {
      stats: {
        // ── Exact standardised names (required by spec) ──────────────────
        currentNutritionStreak: curN,
        bestNutritionStreak: bestN,
        NutritionStrikesComputedForDate: dk,
        NutritionStrikesUpdatedAt: now,

        currentActivityStreak: curA,
        bestActivityStreak: bestA,
        ActivityStrikesComputedForDate: dk,
        ActivityStrikesUpdatedAt: now,

        currentHabitTrackerStreak: curH,
        bestHabitTrackerStreak: bestH,
        HabitTrackerStrikesComputedForDate: dk,
        HabitTrackerStrikesUpdatedAt: now,

        // ── Legacy / backward-compat fields ──────────────────────────────
        currentStreak: cur,
        bestStreak: best,
        streak: cur,
        nutritionStreak: curN,
        activityStreak: curA,
        habitTrackerStreak: curH,
        strikesComputedForDate: dk,
        strikesUpdatedAt: now,
      },
      updatedAt: now,
    },
    { merge: true },
  );

  // Mirror the computed snapshot to users/{uid}/stats/main (canonical stats document)
  void saveStatsSnapshot(uid, {
    currentNutritionStreak: curN,
    bestNutritionStreak: bestN,
    currentActivityStreak: curA,
    bestActivityStreak: bestA,
    currentHabitTrackerStreak: curH,
    bestHabitTrackerStreak: bestH,
    dateKey: dk,
  }).catch(() => {});

  // Also persist today's daily completion flags into users/{uid}/dailyLogs/{dateKey}
  // so that streak recalculation helpers can read them without re-fetching all sub-collections.
  if (dk) {
    const dailyRef = doc(db, 'users', uid, 'dailyLogs', dk);
    await setDoc(
      dailyRef,
      {
        dateKey: dk,
        nutritionCompleted: Boolean(nutritionCompleted),
        activityCompleted: Boolean(activityCompleted),
        habitTrackerCompleted: Boolean(habitTrackerCompleted),
        streakSnapshotUpdatedAt: now,
      },
      { merge: true },
    );
  }
}
