/**
 * Monthly calendar grid helpers (local timezone).
 */

import { toDateKey, parseDateKey, dateKeyRange } from '@/lib/dateKey';
import { CALENDAR_LOCALE } from '@/lib/calendarLocale';

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * @param {number} year
 * @param {number} monthIndex 0-11
 * @returns {{ year: number, monthIndex: number, label: string }}
 */
export function monthLabel(year, monthIndex) {
  const d = new Date(year, monthIndex, 1);
  const label = d.toLocaleString(CALENDAR_LOCALE, { month: 'long', year: 'numeric' });
  return { year, monthIndex, label };
}

/**
 * Format a dateKey for calendar entry cards (English labels only).
 */
export function formatCalendarDateLine(dateKey) {
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString(CALENDAR_LOCALE, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * First Monday-aligned grid cell for the month (may be previous month).
 */
export function gridStartDate(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const dow = first.getDay(); // 0 Sun .. 6 Sat
  const mondayBased = dow === 0 ? 6 : dow - 1; // Mon=0
  const start = new Date(first);
  start.setDate(first.getDate() - mondayBased);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * 6 rows × 7 cols = 42 cells covering the month-aligned grid.
 * @param {number} year
 * @param {number} monthIndex
 * @returns {Array<{ dateKey: string, day: number, inMonth: boolean, date: Date }>}
 */
export function buildMonthGridCells(year, monthIndex) {
  const start = gridStartDate(year, monthIndex);
  const cells = [];
  const cur = new Date(start);
  for (let i = 0; i < 42; i++) {
    const dateKey = toDateKey(cur);
    const inMonth = cur.getMonth() === monthIndex;
    cells.push({
      dateKey,
      day: cur.getDate(),
      inMonth,
      date: new Date(cur),
    });
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}

export function getMonthDateKeyRange(year, monthIndex) {
  const first = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const last = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startKey: first, endKey: last, keys: dateKeyRange(first, last) };
}

export { WEEKDAY_SHORT };

/**
 * Parse YYYY-MM-DD to { year, monthIndex }
 */
export function yearMonthFromDateKey(dateKey) {
  const d = parseDateKey(dateKey);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}
