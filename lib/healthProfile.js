/**
 * Canonical health onboarding profile enums + validation + nutrition estimates.
 */

export const MAIN_GOAL = {
  LOSE_WEIGHT: 'lose_weight',
  MAINTAIN_WEIGHT: 'maintain_weight',
  BUILD_MUSCLE: 'build_muscle',
};

export const SEX = {
  MALE: 'male',
  FEMALE: 'female',
};

export const ACTIVITY_LEVEL = {
  SEDENTARY: 'sedentary',
  LIGHTLY_ACTIVE: 'lightly_active',
  MODERATELY_ACTIVE: 'moderately_active',
  VERY_ACTIVE: 'very_active',
  EXTREMELY_ACTIVE: 'extremely_active',
};

export const ACTIVITY_MULTIPLIER = {
  [ACTIVITY_LEVEL.SEDENTARY]: 1.2,
  [ACTIVITY_LEVEL.LIGHTLY_ACTIVE]: 1.375,
  [ACTIVITY_LEVEL.MODERATELY_ACTIVE]: 1.55,
  [ACTIVITY_LEVEL.VERY_ACTIVE]: 1.725,
  [ACTIVITY_LEVEL.EXTREMELY_ACTIVE]: 1.9,
};

const AGE_MIN = 13;
const AGE_MAX = 120;
const HEIGHT_CM_MIN = 100;
const HEIGHT_CM_MAX = 250;
const WEIGHT_KG_MIN = 30;
const WEIGHT_KG_MAX = 400;

export function lbsToKg(lbs) {
  return (Number(lbs) * 0.45359237);
}

export function kgToLbs(kg) {
  return Number(kg) / 0.45359237;
}

export function ftInToCm(ft, inches) {
  const totalIn = Number(ft) * 12 + Number(inches);
  return totalIn * 2.54;
}

export function cmToFtIn(cm) {
  const totalIn = Number(cm) / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return { ft, inch: Math.min(11, Math.max(0, inch)) };
}

/** BMR (Mifflin–St Jeor), weight kg, height cm, age years */
export function estimateBmrKg({ sex, weightKg, heightCm, age }) {
  const w = Number(weightKg);
  const h = Number(heightCm);
  const a = Number(age);
  const base = 10 * w + 6.25 * h - 5 * a;
  return sex === SEX.MALE ? base + 5 : base - 161;
}

export function estimateTdee({ sex, weightKg, heightCm, age, activityLevel }) {
  const bmr = estimateBmrKg({ sex, weightKg, heightCm, age });
  const m = ACTIVITY_MULTIPLIER[activityLevel] ?? 1.2;
  return Math.round(bmr * m);
}

/**
 * Daily calorie target from goal + TDEE.
 */
export function calorieTargetFromGoal(mainGoal, tdee) {
  const t = Math.round(tdee);
  if (mainGoal === MAIN_GOAL.LOSE_WEIGHT) return Math.max(1200, Math.round(t * 0.78));
  if (mainGoal === MAIN_GOAL.BUILD_MUSCLE) return Math.round(t + 300);
  return t;
}

/**
 * Rough macro split (g) from kcal and goal; totals may differ ±1–3% from kcal.
 */
export function macrosFromCaloriesAndGoal(calories, mainGoal, weightKg) {
  const kcal = Math.max(800, Math.round(Number(calories)));
  const w = Number(weightKg) || 70;
  let proteinRatio = 0.28;
  if (mainGoal === MAIN_GOAL.BUILD_MUSCLE) proteinRatio = 0.32;
  if (mainGoal === MAIN_GOAL.LOSE_WEIGHT) proteinRatio = 0.3;
  const proteinG = Math.round(Math.max(w * 1.4, (kcal * proteinRatio) / 4));
  const fatG = Math.round((kcal * 0.28) / 9);
  const carbG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));
  return { proteinG, carbsG: carbG, fatG, kcal };
}

/** Calories implied by macro grams (4/4/9 rule). */
export function kcalFromMacros(proteinG, carbsG, fatG) {
  const p = Math.max(0, Number(proteinG) || 0);
  const c = Math.max(0, Number(carbsG) || 0);
  const f = Math.max(0, Number(fatG) || 0);
  return Math.round(p * 4 + c * 4 + f * 9);
}

export function mainGoalToAppGoalType(mainGoal) {
  if (mainGoal === MAIN_GOAL.LOSE_WEIGHT) return 'Fat Loss';
  if (mainGoal === MAIN_GOAL.BUILD_MUSCLE) return 'Muscle Gain';
  return 'Maintain';
}

export function activityLevelToLabel(level) {
  const map = {
    [ACTIVITY_LEVEL.SEDENTARY]: 'Sedentary',
    [ACTIVITY_LEVEL.LIGHTLY_ACTIVE]: 'Lightly Active',
    [ACTIVITY_LEVEL.MODERATELY_ACTIVE]: 'Moderately Active',
    [ACTIVITY_LEVEL.VERY_ACTIVE]: 'Very Active',
    [ACTIVITY_LEVEL.EXTREMELY_ACTIVE]: 'Extremely Active',
  };
  return map[level] || 'Sedentary';
}

/**
 * @param {object|null|undefined} data Firestore users/{uid}/profile/main
 */
export function isHealthProfileComplete(data) {
  if (!data || typeof data !== 'object') return false;
  const g = data.mainGoal;
  if (g !== MAIN_GOAL.LOSE_WEIGHT && g !== MAIN_GOAL.MAINTAIN_WEIGHT && g !== MAIN_GOAL.BUILD_MUSCLE) {
    return false;
  }
  if (data.sex !== SEX.MALE && data.sex !== SEX.FEMALE) return false;
  const age = Number(data.age);
  if (!Number.isFinite(age) || age < AGE_MIN || age > AGE_MAX) return false;
  const h = Number(data.heightCm);
  if (!Number.isFinite(h) || h < HEIGHT_CM_MIN || h > HEIGHT_CM_MAX) return false;
  const cw = Number(data.currentWeightKg);
  if (!Number.isFinite(cw) || cw < WEIGHT_KG_MIN || cw > WEIGHT_KG_MAX) return false;
  const tw = Number(data.targetWeightKg);
  if (!Number.isFinite(tw) || tw < WEIGHT_KG_MIN || tw > WEIGHT_KG_MAX) return false;
  const a = data.activityLevel;
  if (!Object.values(ACTIVITY_LEVEL).includes(a)) return false;
  if (data.isProfileComplete !== true) return false;
  return true;
}

/**
 * Onboarding gate using merged `users/{uid}` (avoids subcollection reads that may be blocked by rules).
 * Matches fields written by saveCompleteHealthProfile. Field-based only (not only profileCompleted flag).
 */
function rootCompletionFlagsTrue(data) {
  const p = data?.profileCompleted;
  const o = data?.onboardingCompleted;
  return (p === true || p === 'true') && (o === true || o === 'true');
}

export function isOnboardingCompleteFromUserDoc(data) {
  if (!data || typeof data !== 'object') return false;
  // Written by saveCompleteHealthProfile — fastest path once Firestore delivers the update.
  if (rootCompletionFlagsTrue(data)) return true;
  const p = data.profile || {};
  const g = data.goals || {};
  const sex = String(p.sex || '').trim();
  if (!sex) return false;
  const age = Number(p.age);
  if (!Number.isFinite(age) || age < AGE_MIN || age > AGE_MAX) return false;
  const h = Number(p.height);
  if (!Number.isFinite(h) || h < HEIGHT_CM_MIN || h > HEIGHT_CM_MAX) return false;
  const cw = Number(p.currentWeight ?? p.weight ?? g.currentWeight);
  if (!Number.isFinite(cw) || cw < WEIGHT_KG_MIN || cw > WEIGHT_KG_MAX) return false;
  const tw = Number(g.targetWeight);
  if (!Number.isFinite(tw) || tw < WEIGHT_KG_MIN || tw > WEIGHT_KG_MAX) return false;
  const act = String(p.activityLevel || '').trim();
  if (!act) return false;
  const goalType = String(g.type || '').trim();
  if (!goalType) return false;
  return true;
}
