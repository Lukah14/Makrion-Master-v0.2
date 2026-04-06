/**
 * users/{uid}/profile/main — required onboarding health profile.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { createUserDocument, ensureUserDocument, getUserDocument } from '@/services/userService';
import { onboardingLog } from '@/lib/onboardingDebug';
import { upsertWeightEntry } from '@/services/weightEntryService';
import { todayDateKey } from '@/lib/dateKey';
import {
  isHealthProfileComplete,
  estimateTdee,
  calorieTargetFromGoal,
  macrosFromCaloriesAndGoal,
  kcalFromMacros,
  mainGoalToAppGoalType,
  activityLevelToLabel,
} from '@/lib/healthProfile';

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
  const snap = await getDoc(mainProfileRef(uid));
  return snap.exists() ? snap.data() : null;
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
  return onSnapshot(
    mainProfileRef(uid),
    (snap) => onNext(snap.exists() ? snap.data() : null),
    (err) => onError?.(err),
  );
}

/**
 * Persist onboarding + mirror into users/{uid} for existing Progress / useUser consumers.
 * @param {string} uid
 * @param {object} draft mainGoal, sex, age, heightCm, currentWeightKg, targetWeightKg, activityLevel;
 *   optional proteinGoalG, carbsGoalG, fatGoalG, dailyCaloriesTarget, goalTimelineWeeks
 */
export async function saveCompleteHealthProfile(uid, draft) {
  try {
    return await saveCompleteHealthProfileInner(uid, draft);
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
    dailyCaloriesTarget,
    goalTimelineWeeks,
  } = draft;

  const tdee = estimateTdee({
    sex,
    weightKg: currentWeightKg,
    heightCm,
    age,
    activityLevel,
  });
  const recommendedCalories = calorieTargetFromGoal(mainGoal, tdee);
  const recommendedMacros = macrosFromCaloriesAndGoal(
    recommendedCalories,
    mainGoal,
    currentWeightKg,
  );

  const hasCustomMacros =
    Number.isFinite(Number(proteinGoalG)) &&
    Number.isFinite(Number(carbsGoalG)) &&
    Number.isFinite(Number(fatGoalG));

  let calorieTarget = recommendedCalories;
  let macros = { ...recommendedMacros };

  if (hasCustomMacros) {
    const p = Math.round(Number(proteinGoalG));
    const c = Math.round(Number(carbsGoalG));
    const f = Math.round(Number(fatGoalG));
    macros = { proteinG: p, carbsG: c, fatG: f, kcal: kcalFromMacros(p, c, f) };
    calorieTarget =
      Number.isFinite(Number(dailyCaloriesTarget)) && Number(dailyCaloriesTarget) > 0
        ? Math.round(Number(dailyCaloriesTarget))
        : macros.kcal;
  }

  const weeks =
    Number.isFinite(Number(goalTimelineWeeks)) && Number(goalTimelineWeeks) >= 1
      ? Math.min(260, Math.max(1, Math.round(Number(goalTimelineWeeks))))
      : null;

  const u = auth.currentUser;
  if (u?.uid === uid) {
    await ensureUserDocument(u);
  }

  let rootSnap = await getDoc(userRootRef(uid));
  if (!rootSnap.exists() && u && u.uid === uid) {
    await createUserDocument(u, {});
    rootSnap = await getDoc(userRootRef(uid));
  }
  if (!rootSnap.exists()) {
    const err = new Error(
      'Could not create your user document in Firebase. Sign out and sign in again, or check your connection.',
    );
    onboardingLog('saveCompleteHealthProfile abort: no users/{uid} doc', { uid });
    throw err;
  }

  const prevMain = await getDoc(mainProfileRef(uid));
  const createdAt = prevMain.exists() ? prevMain.data().createdAt : serverTimestamp();

  await setDoc(
    mainProfileRef(uid),
    {
      mainGoal,
      sex,
      age: Number(age),
      heightCm: Number(heightCm),
      currentWeightKg: Number(currentWeightKg),
      targetWeightKg: Number(targetWeightKg),
      activityLevel,
      isProfileComplete: true,
      recommendedTdee: tdee,
      recommendedCalories: recommendedCalories,
      recommendedProteinG: recommendedMacros.proteinG,
      recommendedCarbsG: recommendedMacros.carbsG,
      recommendedFatG: recommendedMacros.fatG,
      dailyCaloriesTarget: calorieTarget,
      proteinGoalG: macros.proteinG,
      carbsGoalG: macros.carbsG,
      fatGoalG: macros.fatG,
      ...(weeks != null ? { goalTimelineWeeks: weeks } : {}),
      createdAt,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const userDoc = await getUserDocument(uid);
  const prevProfile = userDoc?.profile || {};
  const prevGoals = userDoc?.goals || {};

  const appGoalType = mainGoalToAppGoalType(mainGoal);

  await updateDoc(userRootRef(uid), {
    profileCompleted: true,
    onboardingCompleted: true,
    profile: {
      ...prevProfile,
      sex: sex === 'male' ? 'Male' : 'Female',
      height: Number(heightCm),
      weight: Number(currentWeightKg),
      currentWeight: Number(currentWeightKg),
      activityLevel: activityLevelToLabel(activityLevel),
      age: Number(age),
    },
    goals: {
      ...prevGoals,
      type: appGoalType,
      startWeight: Number(currentWeightKg),
      currentWeight: Number(currentWeightKg),
      targetWeight: Number(targetWeightKg),
      calorieTarget,
      calories: calorieTarget,
      protein: macros.proteinG,
      carbs: macros.carbsG,
      fat: macros.fatG,
      ...(weeks != null ? { goalTimelineWeeks: weeks } : {}),
    },
    updatedAt: serverTimestamp(),
  });

  try {
    await upsertWeightEntry(uid, {
      dateKey: todayDateKey(),
      weightKg: Number(currentWeightKg),
    });
  } catch {
    /* weight log optional */
  }

  onboardingLog('saveCompleteHealthProfile OK', {
    uid,
    profileCompleted: true,
    onboardingCompleted: true,
    paths: [`users/${uid}`, `users/${uid}/profile/main`],
  });
}

export { isHealthProfileComplete };
