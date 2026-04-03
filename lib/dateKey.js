/**
 * Strict "YYYY-MM-DD" date-key helpers used by all day-specific collections.
 */

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalise any Date object or ISO string to "YYYY-MM-DD" in local time.
 * @param {Date|string} date
 * @returns {string}
 */
export function toDateKey(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** @returns {string} today's dateKey */
export function todayDateKey() {
  return toDateKey(new Date());
}

/**
 * Parse a "YYYY-MM-DD" string back to a Date (midnight local).
 * @param {string} dateKey
 * @returns {Date}
 */
export function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * @param {string} str
 * @returns {boolean}
 */
export function isValidDateKey(str) {
  if (!DATE_KEY_RE.test(str)) return false;
  const d = parseDateKey(str);
  return toDateKey(d) === str;
}

/**
 * Return an inclusive array of dateKeys between startKey and endKey.
 * @param {string} startKey
 * @param {string} endKey
 * @returns {string[]}
 */
export function dateKeyRange(startKey, endKey) {
  const keys = [];
  const cur = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  while (cur <= end) {
    keys.push(toDateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}
