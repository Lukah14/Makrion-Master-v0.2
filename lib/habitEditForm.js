/**
 * Helpers for Habit Detail Edit — derive wizard-shaped fields from Firestore habits.
 */

import { toDateKey, isValidDateKey } from '@/lib/dateKey';
import {
  deriveFrequencyStateFromHabit,
  formatHabitFrequencyLabelFromState,
} from '@/lib/habitFrequency';

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
 * Legacy shape for callers that only need repeatRule + repeatDays.
 * @param {object} habit
 * @returns {{ repeatRule: string, repeatDays: number[] }}
 */
export function deriveRepeatFromHabit(habit) {
  const s = deriveFrequencyStateFromHabit(habit);
  if (s.repeatRule === 'specific_days_week' || s.repeatRule === 'specific_days_month') {
    return { repeatRule: s.repeatRule, repeatDays: s.repeatDays };
  }
  if (s.repeatRule === 'some_days_period') {
    return { repeatRule: s.repeatRule, repeatDays: [s.cadenceCount] };
  }
  if (s.repeatRule === 'repeat') {
    return { repeatRule: 'repeat', repeatDays: [s.intervalEvery] };
  }
  return { repeatRule: s.repeatRule, repeatDays: [] };
}

/** @deprecated use formatHabitFrequencyLabelFromState(deriveFrequencyStateFromHabit(h)) */
export const HABIT_FREQUENCY_LABELS = {
  daily: 'Every day',
  specific_days_week: 'Specific days',
  specific_days_month: 'Monthly',
  specific_days_year: 'Yearly',
  some_days_period: 'Periodic',
  repeat: 'Repeat',
};

/**
 * Human-readable frequency for list/detail cards.
 * @param {object|null|undefined} habit
 * @returns {string}
 */
export function formatHabitFrequencyLabel(habit) {
  if (!habit) return 'Every day';
  return formatHabitFrequencyLabelFromState(deriveFrequencyStateFromHabit(habit));
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

export { deriveFrequencyStateFromHabit, formatHabitFrequencyLabelFromState } from '@/lib/habitFrequency';
