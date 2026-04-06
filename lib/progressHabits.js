import { getActiveHabitsForDate } from '@/lib/habitSchedule';
import { mergeHabitWithDayCompletion } from '@/lib/habitDayState';
import { habitCountsTowardDailyCompletion } from '@/lib/habitNumericCondition';
import { dateKeyRange, addDaysToDateKey, parseDateKey, toDateKey } from '@/lib/dateKey';
import { startOfIsoWeekMonday } from '@/lib/progressPeriods';

/**
 * Habits shown for progress (exclude paused).
 */
export function getProgressHabitsForDate(habits, dateKey) {
  return getActiveHabitsForDate(habits, dateKey).filter((h) => !h.paused && !h.isPaused);
}

/**
 * @param {import('@/services/habitCompletionService').HabitCompletion[]} rows
 * @returns {Record<string, Record<string, object>>} dateKey -> habitId -> row
 */
export function indexCompletionsByDateAndHabit(rows) {
  /** @type {Record<string, Record<string, object>>} */
  const by = {};
  for (const row of rows || []) {
    const dk = row.dateKey != null ? String(row.dateKey).slice(0, 10) : '';
    const hid = row.habitId != null ? String(row.habitId) : '';
    if (!dk || !hid) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dk)) continue;
    if (!by[dk]) by[dk] = {};
    by[dk][hid] = row;
  }
  return by;
}

function dayBucket(byDateHabit, dateKey) {
  const dk = dateKey != null ? String(dateKey).slice(0, 10) : '';
  return byDateHabit[dk];
}

/** @typedef {'neutral'|'success'|'fail'} HabitStreakClass */

/**
 * neutral = no habits scheduled that day.
 * success = at least one scheduled habit has merged.completed (valid tracked result).
 * fail = scheduled habits exist but none completed yet.
 */
export function classifyHabitStreakDay(habits, dateKey, byDateHabit, todayKey) {
  const active = getProgressHabitsForDate(habits, dateKey).filter(habitCountsTowardDailyCompletion);
  if (active.length === 0) return 'neutral';
  for (const h of active) {
    const row = dayBucket(byDateHabit, dateKey)?.[String(h.id)];
    const merged = mergeHabitWithDayCompletion(h, row, {
      selectedDateKey: String(dateKey).slice(0, 10),
      todayDateKey: todayKey,
    });
    if (merged.completed) return 'success';
  }
  return 'fail';
}

/**
 * Walk backward from today: neutral days are skipped; success extends streak; fail ends it.
 * If today is not yet a success (still in progress), skip today so the streak reflects
 * completed days up to yesterday — same idea as nutrition/current-habit streak UX.
 */
export function computeHabitCurrentStreakWithNeutral(habits, todayKey, byDateHabit) {
  let n = 0;
  const d = parseDateKey(todayKey);
  for (let i = 0; i < 4000; i++) {
    const k = toDateKey(d);
    const c = classifyHabitStreakDay(habits, k, byDateHabit, todayKey);
    if (c === 'neutral') {
      d.setDate(d.getDate() - 1);
      continue;
    }
    if (c === 'success') {
      n++;
      d.setDate(d.getDate() - 1);
      continue;
    }
    if (c === 'fail' && k === todayKey) {
      d.setDate(d.getDate() - 1);
      continue;
    }
    break;
  }
  return n;
}

/**
 * Longest run of success days; neutral days neither extend nor break the run.
 */
export function computeHabitBestStreakWithNeutral(habits, startKey, endKey, todayKey, byDateHabit) {
  const keys = dateKeyRange(startKey, endKey);
  let best = 0;
  let run = 0;
  for (const k of keys) {
    const c = classifyHabitStreakDay(habits, k, byDateHabit, todayKey);
    if (c === 'neutral') continue;
    if (c === 'success') {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

/**
 * @returns {{ completed: number, total: number, pct: number }}
 */
export function habitDayCompletionFraction(habits, dateKey, byDateHabit, todayKey) {
  const active = getProgressHabitsForDate(habits, dateKey).filter(habitCountsTowardDailyCompletion);
  const total = active.length;
  if (total === 0) return { completed: 0, total: 0, pct: 0 };
  let completed = 0;
  for (const h of active) {
    const row = dayBucket(byDateHabit, dateKey)?.[String(h.id)];
    const merged = mergeHabitWithDayCompletion(h, row, {
      selectedDateKey: String(dateKey).slice(0, 10),
      todayDateKey: todayKey,
    });
    if (merged.completed) completed++;
  }
  return {
    completed,
    total,
    pct: Math.round((completed / total) * 100),
  };
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Week Mon–Sun for ISO week containing anchorDateKey.
 * @returns {{ dateKey: string, label: string, fraction: { completed: number, total: number, pct: number } }[]}
 */
export function buildWeekCompletionBreakdown(habits, anchorDateKey, byDateHabit, todayKey) {
  const monday = startOfIsoWeekMonday(anchorDateKey);
  const keys = dateKeyRange(monday, addDaysToDateKey(monday, 6));
  return keys.map((dateKey, i) => ({
    dateKey,
    label: WEEKDAY_SHORT[i] ?? '',
    fraction: habitDayCompletionFraction(habits, dateKey, byDateHabit, todayKey),
  }));
}
