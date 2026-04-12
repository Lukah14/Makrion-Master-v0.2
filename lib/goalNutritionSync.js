/**
 * Single source of truth math: calories ↔ macros, goal timeline from energy balance.
 * kcal = protein*4 + carbs*4 + fat*9
 */

import { todayDateKey, parseDateKey, toDateKey } from '@/lib/dateKey';
import {
  SEX,
  estimateTdee,
  calorieTargetFromGoal,
  macrosFromCaloriesAndGoal,
  kcalFromMacros,
  MAIN_GOAL,
} from '@/lib/healthProfile';

/** ~7700 kcal per kg body fat (common heuristic) */
export const KCAL_PER_KG_WEIGHT_CHANGE = 7700;

export function sexForBmr(sex) {
  return sex === SEX.FEMALE ? SEX.FEMALE : SEX.MALE;
}

export function addCalendarDaysToDateKey(dateKey, days) {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/**
 * Signed kg change per week: negative = losing weight, positive = gaining (energy balance).
 * (dailyCalories - tdee) * 7 / 7700
 */
export function signedWeeklyChangeKgFromEnergy(tdee, dailyCalories) {
  const t = Number(tdee);
  const c = Number(dailyCalories);
  if (!Number.isFinite(t) || !Number.isFinite(c) || t <= 0 || c <= 0) return null;
  const raw = ((c - t) * 7) / KCAL_PER_KG_WEIGHT_CHANGE;
  return Math.round(raw * 100) / 100;
}

/** Minimum |kg/wk| used only to estimate week count when energy balance implies a tiny pace (avoids ÷0). */
const MIN_ABS_WEEKLY_KG_FOR_WEEK_ESTIMATE = 0.03;

/**
 * Weeks to reach target weight from current, given signed weekly change in kg.
 * Uses actual signedWeeklyKg for direction checks; for duration uses a floor pace when |weekly| is tiny.
 */
export function estimateWeeksToGoal(currentKg, targetKg, signedWeeklyKg, mainGoal) {
  if (mainGoal === MAIN_GOAL.MAINTAIN_WEIGHT) return null;
  const cur = Number(currentKg);
  const tgt = Number(targetKg);
  const delta = tgt - cur;
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.05) return null;
  if (signedWeeklyKg == null || !Number.isFinite(signedWeeklyKg)) return null;
  if (Math.abs(signedWeeklyKg) < 0.0001) return null;
  if (delta > 0 && signedWeeklyKg <= 0) return null;
  if (delta < 0 && signedWeeklyKg >= 0) return null;
  const paceForWeeks =
    Math.abs(signedWeeklyKg) < MIN_ABS_WEEKLY_KG_FOR_WEEK_ESTIMATE
      ? Math.sign(signedWeeklyKg) * MIN_ABS_WEEKLY_KG_FOR_WEEK_ESTIMATE
      : signedWeeklyKg;
  return Math.min(260, Math.max(1, Math.ceil(Math.abs(delta) / Math.abs(paceForWeeks))));
}

/**
 * Snap macro grams so 4p+4c+9f equals targetKcal (iterative).
 */
export function alignMacrosToCalorieTarget(proteinG, carbsG, fatG, targetKcal) {
  let p = Math.max(0, Math.round(Number(proteinG) || 0));
  let c = Math.max(0, Math.round(Number(carbsG) || 0));
  let f = Math.max(0, Math.round(Number(fatG) || 0));
  const target = Math.round(Number(targetKcal) || 0);
  if (target < 400) {
    return { proteinG: p, carbsG: c, fatG: f, calories: kcalFromMacros(p, c, f) };
  }

  for (let i = 0; i < 24; i += 1) {
    const k = kcalFromMacros(p, c, f);
    const diff = target - k;
    if (diff === 0) break;
    const carbStep = Math.round(diff / 4);
    if (carbStep !== 0) {
      c = Math.max(0, c + carbStep);
      continue;
    }
    const fatStep = Math.round(diff / 9);
    if (fatStep !== 0) {
      f = Math.max(0, f + fatStep);
      continue;
    }
    p = Math.max(0, p + (diff > 0 ? 1 : -1));
  }

  return { proteinG: p, carbsG: c, fatG: f, calories: kcalFromMacros(p, c, f) };
}

/**
 * When user changes calorie target, scale macros proportionally; fallback to goal-based split.
 */
export function scaleMacrosProportionallyToCalories(proteinG, carbsG, fatG, targetKcal, mainGoal, weightKg) {
  const target = Math.round(Number(targetKcal) || 0);
  const p0 = Math.max(0, Number(proteinG) || 0);
  const c0 = Math.max(0, Number(carbsG) || 0);
  const f0 = Math.max(0, Number(fatG) || 0);
  const old = kcalFromMacros(p0, c0, f0);

  if (old < 50 || target < 400) {
    const m = macrosFromCaloriesAndGoal(target, mainGoal, weightKg);
    return alignMacrosToCalorieTarget(m.proteinG, m.carbsG, m.fatG, target);
  }

  const r = target / old;
  const np = Math.max(0, Math.round(p0 * r));
  const nc = Math.max(0, Math.round(c0 * r));
  const nf = Math.max(0, Math.round(f0 * r));
  return alignMacrosToCalorieTarget(np, nc, nf, target);
}

/**
 * Recommended calories + macros from physiology (TDEE + goal), fully aligned to kcal math.
 */
export function computeRecommendedBundle(mainGoal, tdee, currentWeightKg) {
  const recCal = calorieTargetFromGoal(mainGoal, tdee);
  const m = macrosFromCaloriesAndGoal(recCal, mainGoal, currentWeightKg);
  const aligned = alignMacrosToCalorieTarget(m.proteinG, m.carbsG, m.fatG, recCal);
  return {
    recommendedCalories: recCal,
    recommendedProteinG: aligned.proteinG,
    recommendedCarbsG: aligned.carbsG,
    recommendedFatG: aligned.fatG,
  };
}

/**
 * @typedef {object} CanonicalHealthInput
 * @property {string} mainGoal
 * @property {string} sex
 * @property {number} age
 * @property {number} heightCm
 * @property {number} currentWeightKg
 * @property {number} targetWeightKg
 * @property {string} activityLevel
 * @property {number} [proteinGoalG]
 * @property {number} [carbsGoalG]
 * @property {number} [fatGoalG]
 * @property {number} [goalTimelineWeeks] when set (e.g. onboarding), pins weeks + aligns pace to weight delta
 */

/**
 * @param {CanonicalHealthInput} canonical
 * @param {'recommend'|{ type: 'nutrition', edited: 'calories'|'macros', calories: number, proteinG: number, carbsG: number, fatG: number }} syncKind
 */
export function computeFullHealthSync(canonical, syncKind) {
  const sexBmr = sexForBmr(canonical.sex);
  const tdee = estimateTdee({
    sex: sexBmr,
    weightKg: canonical.currentWeightKg,
    heightCm: canonical.heightCm,
    age: canonical.age,
    activityLevel: canonical.activityLevel,
  });

  const rec = computeRecommendedBundle(canonical.mainGoal, tdee, canonical.currentWeightKg);

  let dailyCaloriesTarget;
  let proteinGoalG;
  let carbsGoalG;
  let fatGoalG;

  if (syncKind && typeof syncKind === 'object' && syncKind.type === 'nutrition') {
    const edited = syncKind.edited === 'calories' ? 'calories' : 'macros';
    if (edited === 'macros') {
      const p0 = Math.max(0, Math.round(Number(syncKind.proteinG) || 0));
      const c0 = Math.max(0, Math.round(Number(syncKind.carbsG) || 0));
      const f0 = Math.max(0, Math.round(Number(syncKind.fatG) || 0));
      const fromMacros = kcalFromMacros(p0, c0, f0);
      if (!Number.isFinite(fromMacros) || fromMacros < 400) {
        dailyCaloriesTarget = rec.recommendedCalories;
        proteinGoalG = rec.recommendedProteinG;
        carbsGoalG = rec.recommendedCarbsG;
        fatGoalG = rec.recommendedFatG;
        const al = alignMacrosToCalorieTarget(proteinGoalG, carbsGoalG, fatGoalG, dailyCaloriesTarget);
        proteinGoalG = al.proteinG;
        carbsGoalG = al.carbsG;
        fatGoalG = al.fatG;
        dailyCaloriesTarget = al.calories;
      } else {
        const al = alignMacrosToCalorieTarget(p0, c0, f0, fromMacros);
        proteinGoalG = al.proteinG;
        carbsGoalG = al.carbsG;
        fatGoalG = al.fatG;
        dailyCaloriesTarget = al.calories;
      }
    } else {
      const cal = Math.round(Number(syncKind.calories) || 0);
      const al = scaleMacrosProportionallyToCalories(
        canonical.proteinGoalG ?? syncKind.proteinG,
        canonical.carbsGoalG ?? syncKind.carbsG,
        canonical.fatGoalG ?? syncKind.fatG,
        cal,
        canonical.mainGoal,
        canonical.currentWeightKg,
      );
      proteinGoalG = al.proteinG;
      carbsGoalG = al.carbsG;
      fatGoalG = al.fatG;
      dailyCaloriesTarget = al.calories;
    }
  } else {
    /**
     * Personal / weight-goal saves: keep the user's current calorie budget + macro split when possible,
     * then recompute expected weekly change from (TDEE, dailyCaloriesTarget) and timeline from weight gap.
     * Otherwise fall back to full recommendation (new users, missing data).
     */
    const storedCal = Math.round(Number(canonical.dailyCaloriesTarget) || 0);
    const macroKcal = kcalFromMacros(
      canonical.proteinGoalG,
      canonical.carbsGoalG,
      canonical.fatGoalG,
    );
    const useSavedNutritionBudget =
      Number.isFinite(storedCal) &&
      storedCal >= 600 &&
      storedCal <= 12000 &&
      Number.isFinite(macroKcal) &&
      macroKcal >= 250;

    if (useSavedNutritionBudget) {
      const al = scaleMacrosProportionallyToCalories(
        canonical.proteinGoalG,
        canonical.carbsGoalG,
        canonical.fatGoalG,
        storedCal,
        canonical.mainGoal,
        canonical.currentWeightKg,
      );
      proteinGoalG = al.proteinG;
      carbsGoalG = al.carbsG;
      fatGoalG = al.fatG;
      dailyCaloriesTarget = al.calories;
    } else {
      dailyCaloriesTarget = rec.recommendedCalories;
      proteinGoalG = rec.recommendedProteinG;
      carbsGoalG = rec.recommendedCarbsG;
      fatGoalG = rec.recommendedFatG;
      const al = alignMacrosToCalorieTarget(proteinGoalG, carbsGoalG, fatGoalG, dailyCaloriesTarget);
      proteinGoalG = al.proteinG;
      carbsGoalG = al.carbsG;
      fatGoalG = al.fatG;
      dailyCaloriesTarget = al.calories;
    }
  }

  /** Pace (kg/wk) from energy balance; onboarding can pin week count to match the summary step. */
  let expectedWeeklyChangeKg = signedWeeklyChangeKgFromEnergy(tdee, dailyCaloriesTarget);
  let goalTimelineWeeks = estimateWeeksToGoal(
    canonical.currentWeightKg,
    canonical.targetWeightKg,
    expectedWeeklyChangeKg,
    canonical.mainGoal,
  );

  if (
    canonical.mainGoal !== MAIN_GOAL.MAINTAIN_WEIGHT &&
    canonical.goalTimelineWeeks != null &&
    Number.isFinite(Number(canonical.goalTimelineWeeks))
  ) {
    const pw = Math.min(260, Math.max(1, Math.round(Number(canonical.goalTimelineWeeks))));
    goalTimelineWeeks = pw;
    const cur = Number(canonical.currentWeightKg);
    const tgt = Number(canonical.targetWeightKg);
    const delta = tgt - cur;
    if (Math.abs(delta) >= 0.05 && pw > 0) {
      expectedWeeklyChangeKg = Math.round((delta / pw) * 100) / 100;
    }
  }

  const estimatedGoalDate =
    goalTimelineWeeks != null ? addCalendarDaysToDateKey(todayDateKey(), goalTimelineWeeks * 7) : null;

  return {
    recommendedTdee: tdee,
    recommendedCalories: rec.recommendedCalories,
    recommendedProteinG: rec.recommendedProteinG,
    recommendedCarbsG: rec.recommendedCarbsG,
    recommendedFatG: rec.recommendedFatG,
    dailyCaloriesTarget,
    proteinGoalG,
    carbsGoalG,
    fatGoalG,
    expectedWeeklyChangeKg,
    goalTimelineWeeks,
    estimatedGoalDate,
  };
}
