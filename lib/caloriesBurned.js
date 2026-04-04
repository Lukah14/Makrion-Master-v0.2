/**
 * caloriesBurned = (kcalsPerHour80kg / 60) * durationMinutes * (userWeightKg / 80)
 * @param {{ kcalsPerHour80kg: unknown, durationMinutes: unknown, userWeightKg?: unknown }} p
 * @returns {number|null}
 */
export function estimateCaloriesBurnedFromKcalPerHour80kg(p) {
  const kcalHr = Number(p?.kcalsPerHour80kg);
  const minutes = Number(p?.durationMinutes);
  let weight = Number(p?.userWeightKg);
  if (!Number.isFinite(kcalHr) || kcalHr <= 0) return null;
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  if (!Number.isFinite(weight) || weight <= 0) weight = 80;
  const raw = (kcalHr / 60) * minutes * (weight / 80);
  return Math.round(raw * 10) / 10;
}
