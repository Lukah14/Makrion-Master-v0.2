/**
 * Habit scheduling helpers — determine whether a habit is active on a given date
 * based on its repeat rules and start/end boundaries.
 */

import { parseDateKey, toDateKey } from './dateKey';
import { isHabitScheduledOnDate } from './habitFrequency';

/**
 * Check whether a habit should appear for a given dateKey.
 * @param {object} habit
 * @param {string} dateKey  "YYYY-MM-DD"
 * @returns {boolean}
 */
export function isHabitActiveOnDate(habit, dateKey) {
  return isHabitScheduledOnDate(habit, dateKey);
}

/**
 * Filter a list of habits to only those active on a given date.
 * @param {object[]} habits
 * @param {string} dateKey
 * @returns {object[]}
 */
export function getActiveHabitsForDate(habits, dateKey) {
  return habits.filter((h) => isHabitActiveOnDate(h, dateKey));
}

/**
 * Return the next dateKey on or after `fromDateKey` when the habit is active.
 * @param {object} habit
 * @param {string} fromDateKey
 * @returns {string|null}
 */
export function getNextOccurrence(habit, fromDateKey) {
  const cur = parseDateKey(fromDateKey);
  for (let i = 0; i < 400; i += 1) {
    const key = toDateKey(cur);
    if (isHabitActiveOnDate(habit, key)) return key;
    cur.setDate(cur.getDate() + 1);
  }
  return null;
}
