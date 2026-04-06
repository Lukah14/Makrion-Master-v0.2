/**
 * Helpers for Habit Detail Edit — derive wizard-shaped fields from Firestore habits.
 */

import { toDateKey, isValidDateKey } from '@/lib/dateKey';

export function defaultEmojiForCategory(categoryName) {
  const emojiMap = {
    Health: '\uD83D\uDCA7',
    Nutrition: '\uD83E\uDD66',
    Movement: '\uD83D\uDCAA',
    Mind: '\uD83E\uDDD8',
    Study: '\uD83D\uDCDA',
    Work: '\uD83D\uDCBC',
    Home: '\uD83C\uDFE0',
    Outdoor: '\uD83C\uDFD5\uFE0F',
    Art: '\uD83C\uDFA8',
    Sports: '\u26BD',
    Social: '\uD83D\uDCAC',
    Finance: '\uD83D\uDCB0',
    Entertainment: '\uD83C\uDFAC',
    Meditation: '\uD83E\uDDD8',
  };
  return emojiMap[categoryName] || '\u2B50';
}

/**
 * @param {object} habit
 * @returns {{ repeatRule: string, repeatDays: number[] }}
 */
export function deriveRepeatFromHabit(habit) {
  if (habit?.repeatRule) {
    return {
      repeatRule: habit.repeatRule,
      repeatDays: Array.isArray(habit.repeatDays) ? [...habit.repeatDays] : [],
    };
  }
  const r = habit?.repeat;
  if (!r?.mode) return { repeatRule: 'daily', repeatDays: [] };
  switch (r.mode) {
    case 'daily':
    case 'weekdays':
      return { repeatRule: 'daily', repeatDays: [] };
    case 'weekly':
      return {
        repeatRule: 'specific_days_week',
        repeatDays: (r.daysOfWeek || [])
          .map((d) => (Number(d) === 0 ? 7 : Number(d)))
          .filter((n) => n >= 1 && n <= 7)
          .sort((a, b) => a - b),
      };
    case 'monthly':
      return {
        repeatRule: 'specific_days_month',
        repeatDays: [...(r.daysOfMonth || [])]
          .map(Number)
          .filter((n) => n >= 1 && n <= 31)
          .sort((a, b) => a - b),
      };
    case 'yearly':
      return { repeatRule: 'specific_days_year', repeatDays: [] };
    case 'custom':
      return {
        repeatRule: 'some_days_period',
        repeatDays: r.interval ? [Math.max(1, Number(r.interval) || 2)] : [2],
      };
    default:
      return { repeatRule: 'daily', repeatDays: [] };
  }
}

/**
 * @param {object} habit
 * @returns {{ startDateKey: string, endDateKey: string | null }}
 */
export function deriveStartEndKeysFromHabit(habit) {
  const start =
    (habit?.schedule?.startDateKey && String(habit.schedule.startDateKey).slice(0, 10)) ||
    (typeof habit?.startDate === 'string' && habit.startDate.length >= 10
      ? habit.startDate.slice(0, 10)
      : null) ||
    toDateKey(new Date());
  const endRaw =
    habit?.schedule?.endDateKey ||
    (typeof habit?.endDate === 'string' && habit.endDate.length >= 10 ? habit.endDate.slice(0, 10) : null);
  const endDateKey = endRaw && isValidDateKey(String(endRaw).slice(0, 10)) ? String(endRaw).slice(0, 10) : null;
  return { startDateKey: start, endDateKey };
}

export function normalizeDateKeyInput(str) {
  const s = String(str || '').trim().slice(0, 10);
  return isValidDateKey(s) ? s : null;
}
