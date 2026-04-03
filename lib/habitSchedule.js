/**
 * Habit scheduling helpers — determine whether a habit is active on a given date
 * based on its repeat rules and start/end boundaries.
 */

import { parseDateKey, toDateKey } from './dateKey';

/**
 * Check whether a habit should appear for a given dateKey.
 * @param {import('@/models/firestoreModels').Habit} habit
 * @param {string} dateKey  "YYYY-MM-DD"
 * @returns {boolean}
 */
export function isHabitActiveOnDate(habit, dateKey) {
  if (habit.isArchived) return false;

  const { schedule, repeat } = habit;

  if (schedule?.startDateKey && dateKey < schedule.startDateKey) return false;
  if (schedule?.endDateKey && dateKey > schedule.endDateKey) return false;

  if (!repeat || !repeat.mode) return true;

  const d = parseDateKey(dateKey);
  const dow = d.getDay(); // 0=Sun … 6=Sat

  switch (repeat.mode) {
    case 'daily':
      return true;

    case 'weekdays':
      return dow >= 1 && dow <= 5;

    case 'weekly':
      if (!Array.isArray(repeat.daysOfWeek) || repeat.daysOfWeek.length === 0) return true;
      return repeat.daysOfWeek.includes(dow);

    case 'monthly':
      if (!Array.isArray(repeat.daysOfMonth) || repeat.daysOfMonth.length === 0) return true;
      return repeat.daysOfMonth.includes(d.getDate());

    case 'yearly': {
      if (!schedule?.startDateKey) return true;
      const start = parseDateKey(schedule.startDateKey);
      return d.getMonth() === start.getMonth() && d.getDate() === start.getDate();
    }

    case 'custom': {
      if (!repeat.interval || repeat.interval <= 0) return true;
      if (!schedule?.startDateKey) return true;
      const start = parseDateKey(schedule.startDateKey);
      const diffMs = d.getTime() - start.getTime();
      const diffDays = Math.round(diffMs / 86400000);
      return diffDays >= 0 && diffDays % repeat.interval === 0;
    }

    default:
      return true;
  }
}

/**
 * Filter a list of habits to only those active on a given date.
 * @param {import('@/models/firestoreModels').Habit[]} habits
 * @param {string} dateKey
 * @returns {import('@/models/firestoreModels').Habit[]}
 */
export function getActiveHabitsForDate(habits, dateKey) {
  return habits.filter((h) => isHabitActiveOnDate(h, dateKey));
}

/**
 * Return the next dateKey on or after `fromDateKey` when the habit is active.
 * Searches up to 400 days ahead to cover yearly schedules.
 * @param {import('@/models/firestoreModels').Habit} habit
 * @param {string} fromDateKey
 * @returns {string|null}
 */
export function getNextOccurrence(habit, fromDateKey) {
  const cur = parseDateKey(fromDateKey);
  for (let i = 0; i < 400; i++) {
    const key = toDateKey(cur);
    if (isHabitActiveOnDate(habit, key)) return key;
    cur.setDate(cur.getDate() + 1);
  }
  return null;
}
