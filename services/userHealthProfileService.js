/**
 * users/{uid}/profile/main — required onboarding health profile.
 */

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { subscribeMainProfileDocument } from '@/lib/firestoreMainProfileDoc';
import { readDocResilient } from '@/lib/firestoreResilientRead';
import { onboardingLog, onboardingFlowLog } from '@/lib/onboardingDebug';
import { upsertWeightEntry } from '@/services/weightEntryService';
import { todayDateKey } from '@/lib/dateKey';
import { isHealthProfileComplete, MAIN_GOAL } from '@/lib/healthProfile';
import { patchUserDocument } from '@/services/userService';

function userRootRef(uid) {
  return doc(db, 'users', uid);
}

function mainProfileRef(uid) {
  return doc(db, 'users', uid, 'profile', 'main');
}

/**
 * @param {string} uid
 * @returns {Promise<object|null>}
 */
export async function getMainHealthProfile(uid) {
  const r = await readDocResilient(mainProfileRef(uid));
  if (!r.exists) return null;
  return r.data() || null;
}

/**
 * Merge fields into users/{uid}/profile/main (settings edits; keeps onboarding shape).
 * @param {string} uid
 * @param {Record<string, unknown>} data
 */
export async function mergeMainHealthProfile(uid, data) {
  await setDoc(
    mainProfileRef(uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/**
 * @param {string} uid
 * @param {(data: object|null) => void} onNext
 * @param {(err: Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeMainHealthProfile(uid, onNext, onError) {
  return subscribeMainProfileDocument(db, uid, {
    onData: (snap) => onNext(snap.exists() ? snap.data() : null),
    onHardError: (err) => onError?.(err),
  });
}

/**
 * Persist onboarding + mirror into users/{uid} for existing Progress / useUser consumers.
 * @param {string} uid
 * @param {object} draft mainGoal, sex, age, heightCm, currentWeightKg, targetWeightKg, activityLevel;
 *   optional proteinGoalG, carbsGoalG, fatGoalG, dailyCaloriesTarget, goalTimelineWeeks;
 *   optional preferencesUnits: 'metric'|'imperial' (stored under users/{uid}.preferences.units)
 */
export async function saveCompleteHealthProfile(uid, draft) {
  try {
    await saveCompleteHealthProfileInner(uid, draft);
  } catch (e) {
    onboardingLog('saveCompleteHealthProfile FAILED', e?.code, e?.message);
    throw e;
  }
}

async function saveCompleteHealthProfileInner(uid, draft) {
  const {
    mainGoal,
    sex,
    age,
    heightCm,
    currentWeightKg,
    targetWeightKg,
    activityLevel,
    proteinGoalG,
    carbsGoalG,
    fatGoalG,
    dailyCaloriesTarget: draftDailyCalories,
    goalTimelineWeeks: draftGoalTimelineWeeks,
    preferencesUnits,
  } = draft;

  const hasCustomMacros =
    Number.isFinite(Number(proteinGoalG)) &&
    Number.isFinite(Number(carbsGoalG)) &&
    Number.isFinite(Number(fatGoalG));

  const u = auth.currentUser;

  /**
   * Do not await ensureUserDocument (read + maybe create) — getDoc can hang on RN. A merge setDoc is enough.
   * Merge a minimal users/{uid} shell so setDoc(merge) in syncUserHealthGoals has a stable target.
   */
  if (u?.uid === uid) {
    await setDoc(
      userRootRef(uid),
      {
        uid: u.uid,
        email: u.email || '',
        displayName: u.displayName || '',
        photoURL: u.photoURL || '',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  /**
   * Do not call readDocResilient(users/{uid}) here — getDoc can hang indefinitely on RN when the
   * channel is wedged; ensureUserDocument + setDoc(merge) above already establish the root for writes.
   */

  const p = Math.round(Number(proteinGoalG));
  const c = Math.round(Number(carbsGoalG));
  const f = Math.round(Number(fatGoalG));

  onboardingFlowLog('write started: syncUserHealthGoals (setOnboardingComplete, skipDependentReads)');
  const { syncUserHealthGoals } = await import('@/services/userGoalSyncService');
  await syncUserHealthGoals(uid, hasCustomMacros ? 'nutrition' : 'goals_weight', {
    setOnboardingComplete: true,
    skipDependentReads: true,
    profileSexUi: sex === 'male' ? 'Male' : sex === 'female' ? 'Female' : 'Other',
    mainOverrides: {
      mainGoal,
      sex,
      age: Number(age),
      heightCm: Number(heightCm),
      currentWeightKg: Number(currentWeightKg),
      targetWeightKg: Number(targetWeightKg),
      activityLevel,
      ...(Number.isFinite(Number(draftDailyCalories)) && Number(draftDailyCalories) >= 400
        ? { dailyCaloriesTarget: Math.round(Number(draftDailyCalories)) }
        : {}),
      ...(hasCustomMacros ? { proteinGoalG: p, carbsGoalG: c, fatGoalG: f } : {}),
      ...(mainGoal !== MAIN_GOAL.MAINTAIN_WEIGHT &&
      draftGoalTimelineWeeks != null &&
      Number.isFinite(Number(draftGoalTimelineWeeks))
        ? {
            goalTimelineWeeks: Math.min(
              260,
              Math.max(1, Math.round(Number(draftGoalTimelineWeeks))),
            ),
          }
        : {}),
    },
    ...(hasCustomMacros
      ? {
          nutrition: {
            edited: 'macros',
            proteinG: p,
            carbsG: c,
            fatG: f,
            calories: 0,
          },
        }
      : {}),
  });

  if (preferencesUnits === 'metric' || preferencesUnits === 'imperial') {
    try {
      await patchUserDocument(uid, { preferences: { units: preferencesUnits } });
      onboardingFlowLog('preferences.units saved', preferencesUnits);
    } catch (e) {
      onboardingFlowLog('preferences.units save failed (non-fatal)', e?.code, e?.message);
    }
  }

  /**
   * Never await upsertWeightEntry on the onboarding critical path — it uses getDoc/getDocs which can
   * hang; weight sync is optional and can complete in the background after navigation.
   */
  void (async () => {
    try {
      await upsertWeightEntry(uid, {
        dateKey: todayDateKey(),
        weightKg: Number(currentWeightKg),
      });
      onboardingFlowLog('deferred weight entry OK');
    } catch (e) {
      onboardingFlowLog('deferred weight entry skipped/failed', e?.code, e?.message);
    }
  })();

  onboardingFlowLog('write succeeded: users/{uid} + profile/main + completion flags');
  onboardingLog('saveCompleteHealthProfile OK', {
    uid,
    profileCompleted: true,
    onboardingCompleted: true,
    paths: [`users/${uid}`, `users/${uid}/profile/main`],
  });
}

export { isHealthProfileComplete };
