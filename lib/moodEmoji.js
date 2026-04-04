/**
 * Map 1–10 mood rating to an emoji for memorable moments UI.
 * @param {number|null|undefined} rating
 * @returns {string}
 */
export function moodRatingToEmoji(rating) {
  if (rating == null || rating === 0) return '\uD83D\uDE10';
  if (rating <= 2) return '\uD83D\uDE1E';
  if (rating <= 4) return '\uD83D\uDE15';
  if (rating <= 6) return '\uD83D\uDE10';
  if (rating <= 8) return '\uD83D\uDE0A';
  return '\uD83E\uDD29';
}
