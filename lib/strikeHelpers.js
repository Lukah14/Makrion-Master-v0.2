/**
 * Determine whether the nutrition goal for a day is met.
 *
 * @param {{ consumed: number, target: number }} params
 *   consumed — total kcal consumed today
 *   target  — daily kcal goal
 * @returns {boolean}
 */
export function isNutritionStrikeComplete({ consumed, target }) {
  if (!target || target <= 0) return false;
  return consumed >= target;
}

/**
 * Determine whether the activity goal for a day is met.
 *
 * @param {{ burned: number, target: number }} params
 *   burned — total kcal burned today
 *   target — daily burn goal
 * @returns {boolean}
 */
export function isActivityStrikeComplete({ burned, target }) {
  if (!target || target <= 0) return false;
  return burned >= target;
}

/**
 * Determine whether all required habits are completed for the day.
 *
 * @param {Array} habits — full habit list (already filtered to today-relevant)
 * @returns {boolean}
 */
export function isHabitStrikeComplete(habits) {
  const required = habits.filter((h) => !h.isArchived && !h.isPaused);
  if (required.length === 0) return false;
  return required.every((h) => h.completed);
}

/**
 * Turn a flat array of boolean daily-completion flags (most-recent-first)
 * into a consecutive-day streak count.
 *
 * @param {boolean[]} completions
 * @returns {number}
 */
export function countStreak(completions) {
  let streak = 0;
  for (const done of completions) {
    if (!done) break;
    streak += 1;
  }
  return streak;
}
