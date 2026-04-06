import { parseDateKey, toDateKey, addDaysToDateKey, dateKeyRange } from '@/lib/dateKey';

/** @typedef {'this_week'|'last_week'|'week_2_ago'|'week_3_ago'|'days_30'|'days_90'|'months_6'|'year_1'|'all_time'} ProgressPeriodId */

export const PROGRESS_PERIOD_ORDER = /** @type {const} */ ([
  'this_week',
  'last_week',
  'week_2_ago',
  'week_3_ago',
  'days_30',
  'days_90',
  'months_6',
  'year_1',
  'all_time',
]);

export const PROGRESS_PERIOD_LABELS = {
  this_week: 'This week',
  last_week: 'Last week',
  week_2_ago: '2 wks. ago',
  week_3_ago: '3 wks. ago',
  days_30: '30 days',
  days_90: '90 days',
  months_6: '6 months',
  year_1: '1 year',
  all_time: 'All time',
};

/** Monday-based ISO week start for dateKey (local). */
export function startOfIsoWeekMonday(dateKey) {
  const d = parseDateKey(dateKey);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateKey(d);
}

export function endOfIsoWeekSunday(weekMondayKey) {
  const d = parseDateKey(weekMondayKey);
  d.setDate(d.getDate() + 6);
  return toDateKey(d);
}

/**
 * @param {ProgressPeriodId} periodId
 * @param {string} todayKey
 * @returns {{ start: string, end: string, statsEnd: string, label: string }}
 * statsEnd clips to today for averages (no future days).
 */
export function getProgressPeriodRange(periodId, todayKey) {
  const label = PROGRESS_PERIOD_LABELS[periodId] || periodId;
  const thisMonday = startOfIsoWeekMonday(todayKey);

  const clip = (end) => (end > todayKey ? todayKey : end);

  if (periodId === 'this_week') {
    const end = endOfIsoWeekSunday(thisMonday);
    return { start: thisMonday, end, statsEnd: clip(end), label };
  }
  if (periodId === 'last_week') {
    const start = addDaysToDateKey(thisMonday, -7);
    const end = addDaysToDateKey(thisMonday, -1);
    return { start, end, statsEnd: end, label };
  }
  if (periodId === 'week_2_ago') {
    const start = addDaysToDateKey(thisMonday, -14);
    const end = addDaysToDateKey(thisMonday, -8);
    return { start, end, statsEnd: end, label };
  }
  if (periodId === 'week_3_ago') {
    const start = addDaysToDateKey(thisMonday, -21);
    const end = addDaysToDateKey(thisMonday, -15);
    return { start, end, statsEnd: end, label };
  }
  if (periodId === 'days_30') {
    const start = addDaysToDateKey(todayKey, -29);
    return { start, end: todayKey, statsEnd: todayKey, label };
  }
  if (periodId === 'days_90') {
    const start = addDaysToDateKey(todayKey, -89);
    return { start, end: todayKey, statsEnd: todayKey, label };
  }
  if (periodId === 'months_6') {
    const start = addDaysToDateKey(todayKey, -182);
    return { start, end: todayKey, statsEnd: todayKey, label };
  }
  if (periodId === 'year_1') {
    const start = addDaysToDateKey(todayKey, -364);
    return { start, end: todayKey, statsEnd: todayKey, label };
  }
  if (periodId === 'all_time') {
    const start = addDaysToDateKey(todayKey, -1095);
    return { start, end: todayKey, statsEnd: todayKey, label };
  }

  const start = addDaysToDateKey(todayKey, -29);
  return { start, end: todayKey, statsEnd: todayKey, label };
}

export function countCalendarDaysInStatsRange(startKey, statsEndKey) {
  if (statsEndKey < startKey) return 0;
  return dateKeyRange(startKey, statsEndKey).length;
}
