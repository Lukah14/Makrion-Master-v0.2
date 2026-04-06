/**
 * Batch-read food logs for Progress (users/{uid}/foodLogs/{date}/entries).
 */

import { listFoodLogEntries, calcDailySummary } from '@/services/foodLogService';
import { dateKeyRange, addDaysToDateKey } from '@/lib/dateKey';
import { getProgressPeriodRange } from '@/lib/progressPeriods';

const CONCURRENCY = 10;

/** True if at least one non-planned entry with logged amount (streak / “meaningful” day). */
export function hasMeaningfulLoggedFoodEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return false;
  for (const e of entries) {
    if (e?.status === 'planned') continue;
    const g = Number(e?.grams);
    const k = Number(e?.nutrientsSnapshot?.kcal);
    if (Number.isFinite(g) && g > 0) return true;
    if (Number.isFinite(k) && k > 0) return true;
  }
  return false;
}

/**
 * @param {string} uid
 * @param {string} startKey YYYY-MM-DD
 * @param {string} endKey YYYY-MM-DD
 * @returns {Promise<Map<string, { kcal: number, protein: number, carbs: number, fat: number, hasMeaningfulLog: boolean }>>}
 */
export async function fetchDailyNutritionTotalsMap(uid, startKey, endKey) {
  const map = new Map();
  if (!uid || endKey < startKey) return map;
  const keys = dateKeyRange(startKey, endKey);
  for (let i = 0; i < keys.length; i += CONCURRENCY) {
    const chunk = keys.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (dk) => {
        try {
          const entries = await listFoodLogEntries(uid, dk);
          const s = calcDailySummary(entries);
          const kcal = Number(s.totalsLogged?.kcal) || 0;
          const protein = Number(s.totalsLogged?.protein) || 0;
          const carbs = Number(s.totalsLogged?.carbs) || 0;
          const fat = Number(s.totalsLogged?.fat) || 0;
          const hasMeaningfulLog = hasMeaningfulLoggedFoodEntries(entries) || kcal > 0;
          return { dk, kcal, protein, carbs, fat, hasMeaningfulLog };
        } catch {
          return {
            dk,
            kcal: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            hasMeaningfulLog: false,
          };
        }
      }),
    );
    for (const r of results) {
      map.set(r.dk, {
        kcal: r.kcal,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        hasMeaningfulLog: r.hasMeaningfulLog,
      });
    }
  }
  return map;
}

/** Streak / active day: meaningful logged entries or positive logged kcal total. */
export function isNutritionLoggedDay(totals) {
  if (!totals) return false;
  if (totals.hasMeaningfulLog === true) return true;
  return (totals.kcal ?? 0) > 0;
}

/** Calendar days of history to load for current / best streak (not for weekly averages). */
export const NUTRITION_STREAK_LOOKBACK_DAYS = 366;

/**
 * Single bounded fetch for Nutrition Progress: streak window + current ISO week (for chart / averages).
 * Avoids ~3y scans; uses users/{uid}/foodLogs/{date}/entries via listFoodLogEntries.
 *
 * @param {string} uid
 * @param {string} todayKey YYYY-MM-DD
 * @returns {Promise<{ map: Map<string, { kcal: number, protein: number, carbs: number, fat: number, hasMeaningfulLog: boolean }>, week: { start: string, end: string, statsEnd: string, label: string } }>}
 */
export async function fetchNutritionProgressBundle(uid, todayKey) {
  const week = getProgressPeriodRange('this_week', todayKey);
  const streakStart = addDaysToDateKey(todayKey, -NUTRITION_STREAK_LOOKBACK_DAYS);
  const map = await fetchDailyNutritionTotalsMap(uid, streakStart, week.end);
  return { map, week };
}
