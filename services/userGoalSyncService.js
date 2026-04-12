/**
 * Single write path for users/{uid}/profile/main + users/{uid} profile & goals mirrors.
 */

import { doc, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUserDocument, syncProfilesFromUserDoc } from '@/services/userService';
import { getMainHealthProfile } from '@/services/userHealthProfileService';
import { onboardingFlowLog } from '@/lib/onboardingDebug';
import { flowLog } from '@/lib/flowLog';
import {
  SEX,
  MAIN_GOAL,
  activityLevelToLabel,
  mainGoalToAppGoalType,
  isOnboardingCompleteFromUserDoc,
  kcalFromMacros,
} from '@/lib/healthProfile';
import {
  activityLabelToEnum,
  appGoalTypeToMainGoal,
  sexCanonicalToUi,
} from '@/lib/settingsProfileBridge';
import { computeFullHealthSync, alignMacrosToCalorieTarget } from '@/lib/goalNutritionSync';
import { isFirestoreTargetIdError } from '@/lib/firestoreRnErrors';

function mainProfileRef(uid) {
  return doc(db, 'users', uid, 'profile', 'main');
}

function userRef(uid) {
  return doc(db, 'users', uid);
}

function stripUndefinedKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

function finiteNum(n, fallback) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

/**
 * Merge `users/{uid}.goals` with `users/{uid}/profile/main` so the app prefers canonical nutrition + timeline.
 * Preserves unrelated goal keys (steps, water, …).
 */
export function mergeRootGoalsWithMainProfile(userDoc, mainDoc) {
  const base = userDoc?.goals && typeof userDoc.goals === 'object' ? userDoc.goals : {};
  const g = { ...base };
  const m = mainDoc && typeof mainDoc === 'object' ? mainDoc : null;
  if (!m) return g;

  const pickNum = (...vals) => {
    for (const v of vals) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  };

  const dailyCal = pickNum(m.dailyCaloriesTarget, g.calories, g.calorieTarget);
  if (dailyCal !== undefined) {
    const r = Math.round(dailyCal);
    g.calories = r;
    g.calorieTarget = r;
  }

  const p = pickNum(m.proteinGoalG, g.protein, g.proteinGoal);
  if (p !== undefined) g.protein = Math.round(p);

  const c = pickNum(m.carbsGoalG, g.carbs, g.carbsGoal);
  if (c !== undefined) g.carbs = Math.round(c);

  const f = pickNum(m.fatGoalG, g.fat, g.fatGoal);
  if (f !== undefined) g.fat = Math.round(f);

  const tw = pickNum(m.targetWeightKg, g.targetWeight);
  if (tw !== undefined) g.targetWeight = tw;

  const cw = pickNum(
    m.currentWeightKg,
    g.currentWeight,
    userDoc?.profile?.currentWeight,
    userDoc?.profile?.weight,
  );
  if (cw !== undefined) g.currentWeight = cw;

  const wks = m.goalTimelineWeeks ?? g.goalTimelineWeeks ?? g.weeksToGoal;
  if (wks != null && Number.isFinite(Number(wks))) {
    const wi = Math.round(Number(wks));
    g.goalTimelineWeeks = wi;
    g.weeksToGoal = wi;
  }

  if (m.expectedWeeklyChangeKg != null && Number.isFinite(Number(m.expectedWeeklyChangeKg))) {
    g.expectedWeeklyChangeKg = Number(m.expectedWeeklyChangeKg);
  }
  if (m.estimatedGoalDate != null && m.estimatedGoalDate !== '') {
    g.estimatedGoalDate = m.estimatedGoalDate;
  }

  if (
    m.mainGoal === MAIN_GOAL.LOSE_WEIGHT ||
    m.mainGoal === MAIN_GOAL.MAINTAIN_WEIGHT ||
    m.mainGoal === MAIN_GOAL.BUILD_MUSCLE
  ) {
    g.type = mainGoalToAppGoalType(m.mainGoal);
  }

  return g;
}

/**
 * When the device is "online" but the Firestore stream is wedged, `batch.commit()` may never resolve
 * even though the write is already in the local cache (onSnapshot shows hasPendingWrites: true).
 * For onboarding completion we accept a cache-consistent complete `users/{uid}` doc and continue.
 */
const COMMIT_SERVER_FAST_MS = 12000;
const COMMIT_SERVER_TOTAL_MS = 55000;

async function readUserRootFromCache(uid) {
  const snap = await getDoc(userRef(uid), { source: 'cache' });
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

async function commitBatchAllowingLocalOnboardingComplete(batch, uid) {
  const commitP = batch.commit();

  const first = await Promise.race([
    commitP.then(() => 'server'),
    new Promise((r) => setTimeout(() => r('stall'), COMMIT_SERVER_FAST_MS)),
  ]);
  if (first === 'server') {
    return 'server';
  }

  flowLog('PROFILE_SAVE_COMMIT_STALL', { uid, ms: COMMIT_SERVER_FAST_MS });
  const early = await readUserRootFromCache(uid);
  if (early && isOnboardingCompleteFromUserDoc(early)) {
    flowLog('PROFILE_SAVE_LOCAL_ACK', { uid, phase: 'fast', hasPendingWritesHint: true });
    void commitP.catch((e) =>
      flowLog('PROFILE_SAVE_BACKGROUND_COMMIT_ERR', { uid, code: e?.code, message: e?.message }),
    );
    return 'local_cache';
  }

  const remain = Math.max(3000, COMMIT_SERVER_TOTAL_MS - COMMIT_SERVER_FAST_MS);
  const second = await Promise.race([
    commitP.then(() => 'server'),
    new Promise((r) => setTimeout(() => r('stall2'), remain)),
  ]);
  if (second === 'server') {
    return 'server_slow';
  }

  const late = await readUserRootFromCache(uid);
  if (late && isOnboardingCompleteFromUserDoc(late)) {
    flowLog('PROFILE_SAVE_LOCAL_ACK', { uid, phase: 'extended' });
    void commitP.catch((e) =>
      flowLog('PROFILE_SAVE_BACKGROUND_COMMIT_ERR', { uid, code: e?.code, message: e?.message }),
    );
    return 'local_cache_late';
  }

  void commitP.catch(() => {});
  throw new Error(
    'Could not confirm save with Firestore (network may be unstable). Check your connection and tap Save again.',
  );
}

const PROFILE_COMMIT_TARGET_ID_ATTEMPTS = 4;

/**
 * A failed batch.commit() invalidates the batch; on RN "Target ID already exists" rebuild and retry.
 */
async function commitProfileWritesWithTargetIdRetry(uid, setOnboardingComplete, buildBatch) {
  let lastErr;
  for (let attempt = 1; attempt <= PROFILE_COMMIT_TARGET_ID_ATTEMPTS; attempt++) {
    try {
      const batch = buildBatch();
      if (setOnboardingComplete === true) {
        const via = await commitBatchAllowingLocalOnboardingComplete(batch, uid);
        flowLog('PROFILE_SAVE_COMMIT_DONE', { uid, via, attempt });
      } else {
        await batch.commit();
      }
      return;
    } catch (e) {
      lastErr = e;
      if (!isFirestoreTargetIdError(e) || attempt >= PROFILE_COMMIT_TARGET_ID_ATTEMPTS) {
        throw e;
      }
      const delayMs = Math.min(4000, 350 * Math.pow(2, attempt - 1));
      flowLog('PROFILE_SAVE_TARGET_ID_RETRY', { uid, attempt, delayMs });
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

/**
 * Build canonical health input from Firestore + optional overrides.
 */
export function mergeCanonicalHealthInput(userDoc, mainDoc, overrides = {}) {
  const p = userDoc?.profile || {};
  const g = userDoc?.goals || {};
  const m = mainDoc || {};

  const mainGoal =
    overrides.mainGoal ??
    m.mainGoal ??
    appGoalTypeToMainGoal(g.type);

  let sex = overrides.sex ?? m.sex;
  if (!sex) {
    const sx = String(p.sex || '').toLowerCase();
    if (sx === 'female' || sx === 'f') sex = 'female';
    else sex = 'male';
  }

  const ageRaw = overrides.age ?? m.age ?? p.age ?? 30;
  const heightRaw = overrides.heightCm ?? m.heightCm ?? p.height ?? 170;
  const currentWeightKg = finiteNum(
    overrides.currentWeightKg ??
      m.currentWeightKg ??
      p.currentWeight ??
      p.weight ??
      g.currentWeight ??
      70,
    70,
  );
  const targetWeightKg = finiteNum(
    overrides.targetWeightKg ?? m.targetWeightKg ?? g.targetWeight,
    currentWeightKg,
  );
  const activityLevel =
    overrides.activityLevel ?? m.activityLevel ?? activityLabelToEnum(p.activityLevel);

  const proteinGoalG = finiteNum(overrides.proteinGoalG ?? m.proteinGoalG ?? g.protein, 100);
  const carbsGoalG = finiteNum(overrides.carbsGoalG ?? m.carbsGoalG ?? g.carbs, 200);
  const fatGoalG = finiteNum(overrides.fatGoalG ?? m.fatGoalG ?? g.fat, 60);
  const dailyCaloriesTarget = finiteNum(
    overrides.dailyCaloriesTarget ?? m.dailyCaloriesTarget ?? g.calories ?? g.calorieTarget,
    2000,
  );

  /** Only from explicit overrides (onboarding); do not read stale weeks from subdocs for normal syncs. */
  let goalTimelineWeeks;
  if (overrides.goalTimelineWeeks != null && Number.isFinite(Number(overrides.goalTimelineWeeks))) {
    goalTimelineWeeks = Math.min(260, Math.max(1, Math.round(Number(overrides.goalTimelineWeeks))));
  }

  const out = {
    mainGoal,
    sex,
    age: Math.round(finiteNum(ageRaw, 30)),
    heightCm: finiteNum(heightRaw, 170),
    currentWeightKg,
    targetWeightKg,
    activityLevel,
    proteinGoalG,
    carbsGoalG,
    fatGoalG,
    dailyCaloriesTarget,
  };
  if (goalTimelineWeeks !== undefined) {
    out.goalTimelineWeeks = goalTimelineWeeks;
  }
  return out;
}

/**
 * Persist synced health + nutrition + timeline to profile/main and users/{uid}.
 *
 * @param {string} uid
 * @param {'personal'|'nutrition'|'goals_weight'} opType
 * @param {object} [payload]
 * @param {string} [payload.displayName]
 * @param {object} [payload.mainOverrides]
 * @param {{ edited: 'calories'|'macros', calories: number, proteinG: number, carbsG: number, fatG: number }} [payload.nutrition]
 * @param {boolean} [payload.setOnboardingComplete] set profile/main isProfileComplete + root flags
 * @param {boolean} [payload.skipDependentReads] skip getUserDocument/getMainHealthProfile (onboarding save with full mainOverrides)
 */
export async function syncUserHealthGoals(uid, opType, payload = {}) {
  const skipRead = payload.skipDependentReads === true;
  if (skipRead) {
    onboardingFlowLog('syncUserHealthGoals: skipDependentReads (no pre-write Firestore reads)');
  }
  const userDoc = skipRead ? {} : (await getUserDocument(uid)) || {};
  const mainDoc = skipRead ? {} : (await getMainHealthProfile(uid)) || {};

  const overrides = { ...(payload.mainOverrides || {}) };
  const canonicalBase = mergeCanonicalHealthInput(userDoc, mainDoc, overrides);

  const syncKind =
    opType === 'nutrition' && payload.nutrition
      ? { type: 'nutrition', ...payload.nutrition }
      : 'recommend';

  const computed = computeFullHealthSync(canonicalBase, syncKind);

  let dailyCaloriesTarget = Math.round(finiteNum(computed.dailyCaloriesTarget, 0));
  let proteinGoalG = Math.round(finiteNum(computed.proteinGoalG, 0));
  let carbsGoalG = Math.round(finiteNum(computed.carbsGoalG, 0));
  let fatGoalG = Math.round(finiteNum(computed.fatGoalG, 0));

  const macroKcal = kcalFromMacros(proteinGoalG, carbsGoalG, fatGoalG);
  if (dailyCaloriesTarget >= 400 && Math.abs(macroKcal - dailyCaloriesTarget) > 2) {
    flowLog('GOAL_SAVE_MACRO_ALIGN', { macroKcal, dailyCaloriesTarget });
    const al = alignMacrosToCalorieTarget(proteinGoalG, carbsGoalG, fatGoalG, dailyCaloriesTarget);
    proteinGoalG = al.proteinG;
    carbsGoalG = al.carbsG;
    fatGoalG = al.fatG;
    dailyCaloriesTarget = al.calories;
  }

  const appGoalType = mainGoalToAppGoalType(canonicalBase.mainGoal);
  const prevProfile = userDoc.profile || {};
  const prevGoals = userDoc.goals || {};

  const profileSexUi = payload.profileSexUi ?? sexCanonicalToUi(canonicalBase.sex);

  const profilePatch = stripUndefinedKeys({
    ...prevProfile,
    sex: profileSexUi,
    age: canonicalBase.age,
    height: canonicalBase.heightCm,
    weight: canonicalBase.currentWeightKg,
    currentWeight: canonicalBase.currentWeightKg,
    activityLevel: activityLevelToLabel(canonicalBase.activityLevel),
  });

  const goalsPatch = stripUndefinedKeys({
    ...prevGoals,
    type: appGoalType,
    startWeight: prevGoals.startWeight ?? canonicalBase.currentWeightKg,
    currentWeight: canonicalBase.currentWeightKg,
    targetWeight: canonicalBase.targetWeightKg,
    calorieTarget: dailyCaloriesTarget,
    calories: dailyCaloriesTarget,
    protein: proteinGoalG,
    carbs: carbsGoalG,
    fat: fatGoalG,
    goalTimelineWeeks: computed.goalTimelineWeeks ?? null,
    weeksToGoal: computed.goalTimelineWeeks ?? null,
    expectedWeeklyChangeKg:
      computed.expectedWeeklyChangeKg != null && Number.isFinite(Number(computed.expectedWeeklyChangeKg))
        ? Number(computed.expectedWeeklyChangeKg)
        : null,
    estimatedGoalDate: computed.estimatedGoalDate ?? null,
  });

  const mainSex = canonicalBase.sex === SEX.FEMALE ? SEX.FEMALE : SEX.MALE;

  const recTdee = finiteNum(computed.recommendedTdee, NaN);
  const recCal = finiteNum(computed.recommendedCalories, NaN);

  /** @type {Record<string, unknown>} */
  const mainPayload = stripUndefinedKeys({
    mainGoal: canonicalBase.mainGoal,
    sex: mainSex,
    age: canonicalBase.age,
    heightCm: canonicalBase.heightCm,
    currentWeightKg: canonicalBase.currentWeightKg,
    targetWeightKg: canonicalBase.targetWeightKg,
    activityLevel: canonicalBase.activityLevel,
    recommendedTdee: Number.isFinite(recTdee) ? Math.round(recTdee) : null,
    recommendedCalories: Number.isFinite(recCal) ? Math.round(recCal) : null,
    recommendedProteinG: Math.round(finiteNum(computed.recommendedProteinG, 0)),
    recommendedCarbsG: Math.round(finiteNum(computed.recommendedCarbsG, 0)),
    recommendedFatG: Math.round(finiteNum(computed.recommendedFatG, 0)),
    dailyCaloriesTarget,
    proteinGoalG,
    carbsGoalG,
    fatGoalG,
    expectedWeeklyChangeKg:
      computed.expectedWeeklyChangeKg != null && Number.isFinite(Number(computed.expectedWeeklyChangeKg))
        ? Number(computed.expectedWeeklyChangeKg)
        : null,
    goalTimelineWeeks: computed.goalTimelineWeeks ?? null,
    estimatedGoalDate: computed.estimatedGoalDate ?? null,
    updatedAt: serverTimestamp(),
  });

  if (payload.setOnboardingComplete) {
    mainPayload.isProfileComplete = true;
  }

  if (mainDoc?.createdAt) {
    mainPayload.createdAt = mainDoc.createdAt;
  } else {
    mainPayload.createdAt = serverTimestamp();
  }

  /** setDoc+merge avoids updateDoc (reads / missing-doc edge cases when SDK reports offline). */
  const rootWrite = stripUndefinedKeys({
    profile: profilePatch,
    goals: goalsPatch,
    updatedAt: serverTimestamp(),
  });
  if (payload.displayName !== undefined && String(payload.displayName).trim()) {
    rootWrite.displayName = String(payload.displayName).trim();
  }
  if (payload.setOnboardingComplete) {
    rootWrite.profileCompleted = true;
    rootWrite.onboardingCompleted = true;
  }

  const goalPaths = [`users/${uid}`, `users/${uid}/profile/main`];
  flowLog('GOAL_SAVE_START', { uid, opType });
  flowLog('GOAL_SAVE_PATH', { paths: goalPaths });
  flowLog('GOAL_SAVE_PAYLOAD', {
    mainGoal: mainPayload.mainGoal,
    dailyCaloriesTarget: mainPayload.dailyCaloriesTarget,
    proteinGoalG: mainPayload.proteinGoalG,
    carbsGoalG: mainPayload.carbsGoalG,
    fatGoalG: mainPayload.fatGoalG,
    macroKcalCheck: kcalFromMacros(mainPayload.proteinGoalG, mainPayload.carbsGoalG, mainPayload.fatGoalG),
    goalTimelineWeeks: mainPayload.goalTimelineWeeks,
    expectedWeeklyChangeKg: mainPayload.expectedWeeklyChangeKg,
  });

  /**
   * Single batch: users/{uid} and users/{uid}/profile/main commit together.
   * Avoids a root snapshot firing without profileCompleted flags while subdoc already updated (or vice versa).
   */
  flowLog('PROFILE_SAVE_START', { uid, opType, setOnboardingComplete: !!payload.setOnboardingComplete });
  try {
    await commitProfileWritesWithTargetIdRetry(
      uid,
      payload.setOnboardingComplete === true,
      () => {
        const batch = writeBatch(db);
        batch.set(mainProfileRef(uid), mainPayload, { merge: true });
        batch.set(userRef(uid), rootWrite, { merge: true });
        return batch;
      },
    );
  } catch (e) {
    flowLog('PROFILE_SAVE_FAILED', { uid, code: e?.code, message: e?.message || String(e) });
    flowLog('GOAL_SAVE_FAILED', { uid, code: e?.code, message: e?.message || String(e) });
    throw e;
  }
  flowLog('PROFILE_SAVE_SUCCESS', { uid, paths: [`users/${uid}`, `users/${uid}/profile/main`] });
  flowLog('GOAL_SAVE_SUCCESS', { uid, paths: goalPaths });
  if (payload.setOnboardingComplete) {
    flowLog('PROFILE_COMPLETE_FLAG_SET', { uid, profileCompleted: true, onboardingCompleted: true });
  }

  const mirror = async () => {
    try {
      await syncProfilesFromUserDoc(uid);
    } catch (e) {
      onboardingFlowLog(
        'syncProfilesFromUserDoc failed (non-blocking — users + profile/main already saved)',
        e?.code,
        e?.message,
      );
    }
  };

  if (skipRead) {
    void mirror();
  } else {
    await mirror();
  }
}
