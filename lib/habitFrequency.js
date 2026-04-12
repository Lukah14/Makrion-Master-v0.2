/**
 * Habit frequency — canonical Firestore `repeat` shape, validation, UI state derive/build.
 * Weekday wizard indices: 1 = Monday … 7 = Sunday (matches WizardStepSchedule).
 * Firestore daysOfWeek: 0 = Sunday … 6 = Saturday (JS Date.getDay()).
 */

import { parseDateKey, toDateKey } from '@/lib/dateKey';

/** @typedef {'daily'|'specific_days_week'|'specific_days_month'|'specific_days_year'|'some_days_period'|'repeat'} RepeatRuleId */

/** @typedef {{ month: number, day: number }} YearlyDatePart */

/** @typedef {{ repeatRule: RepeatRuleId, repeatDays: number[], yearlyDates: YearlyDatePart[], cadenceCount: number, cadenceUnit: 'week'|'month'|'year', intervalEvery: number }} FrequencyFormState */

export function wizardWeekdayToJsDow(w) {
  const n = Number(w);
  if (n === 7) return 0;
  if (n >= 1 && n <= 6) return n;
  return null;
}

export function jsDowToWizardWeekday(js) {
  const n = Number(js);
  if (n === 0) return 7;
  if (n >= 1 && n <= 6) return n;
  return 1;
}

/**
 * @param {number} year
 * @param {number} month 1-12
 */
export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Clamp day for month (handles invalid Feb 30 etc.)
 * @param {number} month 1-12
 * @param {number} day
 * @param {number} refYear
 */
export function clampMonthDay(month, day, refYear = new Date().getFullYear()) {
  const m = Math.max(1, Math.min(12, Math.floor(Number(month)) || 1));
  const dim = daysInMonth(refYear, m);
  const d = Math.max(1, Math.min(dim, Math.floor(Number(day)) || 1));
  return { month: m, day: d };
}

/** English month keys for stable storage (no locale in Firestore). */
export const MONTH_KEYS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

export function monthIndexFromKey(key) {
  const k = String(key || '').toLowerCase();
  const i = MONTH_KEYS.indexOf(k);
  if (i >= 0) return i + 1;
  const n = parseInt(k, 10);
  if (n >= 1 && n <= 12) return n;
  return 1;
}

/**
 * @param {FrequencyFormState} s
 * @returns {{ ok: boolean, message?: string }}
 */
export function validateFrequencyFormState(s) {
  const rule = s?.repeatRule || 'daily';
  if (rule === 'daily') return { ok: true };
  if (rule === 'repeat') {
    const n =
      s.intervalEvery === '' || s.intervalEvery == null
        ? NaN
        : Math.floor(Number(s.intervalEvery));
    if (!Number.isFinite(n) || n < 1) return { ok: false, message: 'Repeat interval must be at least 1 day.' };
    return { ok: true };
  }
  if (rule === 'specific_days_week') {
    const days = Array.isArray(s.repeatDays) ? s.repeatDays.filter((d) => d >= 1 && d <= 7) : [];
    if (days.length < 1) return { ok: false, message: 'Pick at least one weekday.' };
    return { ok: true };
  }
  if (rule === 'specific_days_month') {
    const days = Array.isArray(s.repeatDays) ? s.repeatDays.filter((d) => d >= 1 && d <= 31) : [];
    if (days.length < 1) return { ok: false, message: 'Pick at least one day of the month.' };
    return { ok: true };
  }
  if (rule === 'specific_days_year') {
    const yd = Array.isArray(s.yearlyDates) ? s.yearlyDates : [];
    if (yd.length < 1) return { ok: false, message: 'Add at least one yearly date.' };
    for (const p of yd) {
      if (!p || p.month < 1 || p.month > 12 || p.day < 1 || p.day > 31) {
        return { ok: false, message: 'Each yearly date needs a valid month and day.' };
      }
    }
    return { ok: true };
  }
  if (rule === 'some_days_period') {
    const c =
      s.cadenceCount === '' || s.cadenceCount == null
        ? NaN
        : Math.floor(Number(s.cadenceCount));
    const u = s.cadenceUnit;
    if (!Number.isFinite(c) || c < 1) return { ok: false, message: 'Enter how many days per period (at least 1).' };
    if (!['week', 'month', 'year'].includes(u)) return { ok: false, message: 'Pick week, month, or year.' };
    if (u === 'week' && c > 7) return { ok: false, message: 'At most 7 days per week.' };
    if (u === 'month' && c > 31) return { ok: false, message: 'At most 31 days per month.' };
    if (u === 'year' && c > 366) return { ok: false, message: 'At most 366 days per year.' };
    return { ok: true };
  }
  return { ok: true };
}

/**
 * Build Firestore `repeat` + flat fields for habit documents.
 * @param {Partial<FrequencyFormState> & { repeatRule?: string, repeatDays?: number[] }} raw
 */
export function buildHabitRepeatDocument(raw) {
  const repeatRule = raw.repeatRule || 'daily';
  const repeatDays = Array.isArray(raw.repeatDays) ? raw.repeatDays : [];
  const yearlyDates = Array.isArray(raw.yearlyDates) ? raw.yearlyDates.map((p) => clampMonthDay(p.month, p.day)) : [];
  const cadenceCount =
    raw.cadenceCount === '' || raw.cadenceCount == null
      ? 1
      : Math.max(1, Math.floor(Number(raw.cadenceCount)) || 1);
  const cadenceUnit = ['week', 'month', 'year'].includes(raw.cadenceUnit) ? raw.cadenceUnit : 'week';
  const intervalEvery =
    raw.intervalEvery === '' || raw.intervalEvery == null
      ? 1
      : Math.max(1, Math.floor(Number(raw.intervalEvery)) || 1);

  /** @type {Record<string, unknown>} */
  let repeat;

  switch (repeatRule) {
    case 'specific_days_week': {
      const daysOfWeek = repeatDays
        .map(wizardWeekdayToJsDow)
        .filter((n) => n != null && n >= 0 && n <= 6);
      repeat = {
        mode: 'weekly',
        daysOfWeek: daysOfWeek.length ? [...new Set(daysOfWeek)].sort((a, b) => a - b) : null,
        daysOfMonth: null,
        yearlyDates: null,
        cadence: null,
        intervalDays: null,
      };
      break;
    }
    case 'specific_days_month': {
      const dom = repeatDays.map(Number).filter((n) => n >= 1 && n <= 31);
      repeat = {
        mode: 'monthly',
        daysOfWeek: null,
        daysOfMonth: dom.length ? [...new Set(dom)].sort((a, b) => a - b) : null,
        yearlyDates: null,
        cadence: null,
        intervalDays: null,
      };
      break;
    }
    case 'specific_days_year':
      repeat = {
        mode: 'yearly_dates',
        daysOfWeek: null,
        daysOfMonth: null,
        yearlyDates: yearlyDates.length ? yearlyDates : null,
        cadence: null,
        intervalDays: null,
      };
      break;
    case 'some_days_period':
      repeat = {
        mode: 'periodic_count',
        daysOfWeek: null,
        daysOfMonth: null,
        yearlyDates: null,
        cadence: { count: cadenceCount, unit: cadenceUnit },
        intervalDays: null,
      };
      break;
    case 'repeat':
      repeat = {
        mode: 'interval_days',
        daysOfWeek: null,
        daysOfMonth: null,
        yearlyDates: null,
        cadence: null,
        intervalDays: intervalEvery,
      };
      break;
    default:
      repeat = {
        mode: 'daily',
        daysOfWeek: null,
        daysOfMonth: null,
        yearlyDates: null,
        cadence: null,
        intervalDays: null,
      };
  }

  return {
    repeat,
    repeatRule,
    repeatDays: repeatRule === 'specific_days_week' || repeatRule === 'specific_days_month' ? repeatDays : [],
    yearlyDates: repeatRule === 'specific_days_year' ? yearlyDates : [],
    cadenceCount,
    cadenceUnit,
    intervalEvery,
  };
}

/**
 * Full frequency UI state from a habit (Firestore `repeat` is source of truth over flat repeatRule).
 * @param {object|null|undefined} habit
 * @returns {FrequencyFormState}
 */
export function deriveFrequencyStateFromHabit(habit) {
  const r = habit?.repeat;
  if (r && typeof r === 'object' && r.mode) {
    switch (r.mode) {
      case 'daily':
      case 'weekdays':
        return {
          repeatRule: 'daily',
          repeatDays: [],
          yearlyDates: [],
          cadenceCount: 1,
          cadenceUnit: 'week',
          intervalEvery: 2,
        };
      case 'weekly': {
        const w = (r.daysOfWeek || []).map(jsDowToWizardWeekday).filter((n) => n >= 1 && n <= 7);
        return {
          repeatRule: 'specific_days_week',
          repeatDays: [...new Set(w)].sort((a, b) => a - b),
          yearlyDates: [],
          cadenceCount: 1,
          cadenceUnit: 'week',
          intervalEvery: 2,
        };
      }
      case 'monthly': {
        const dom = (r.daysOfMonth || []).map(Number).filter((n) => n >= 1 && n <= 31);
        return {
          repeatRule: 'specific_days_month',
          repeatDays: [...new Set(dom)].sort((a, b) => a - b),
          yearlyDates: [],
          cadenceCount: 1,
          cadenceUnit: 'week',
          intervalEvery: 2,
        };
      }
      case 'yearly_dates': {
        const yd = Array.isArray(r.yearlyDates) ? r.yearlyDates.map((p) => clampMonthDay(p.month, p.day)) : [];
        return {
          repeatRule: 'specific_days_year',
          repeatDays: [],
          yearlyDates: yd,
          cadenceCount: 1,
          cadenceUnit: 'week',
          intervalEvery: 2,
        };
      }
      case 'yearly': {
        const sk = habit?.schedule?.startDateKey;
        if (sk && typeof sk === 'string' && sk.length >= 10) {
          const d = parseDateKey(sk.slice(0, 10));
          const yd = clampMonthDay(d.getMonth() + 1, d.getDate());
          return {
            repeatRule: 'specific_days_year',
            repeatDays: [],
            yearlyDates: [yd],
            cadenceCount: 1,
            cadenceUnit: 'week',
            intervalEvery: 2,
          };
        }
        return {
          repeatRule: 'specific_days_year',
          repeatDays: [],
          yearlyDates: [],
          cadenceCount: 1,
          cadenceUnit: 'week',
          intervalEvery: 2,
        };
      }
      case 'periodic_count': {
        const c = r.cadence?.count ?? 1;
        const u = r.cadence?.unit === 'month' || r.cadence?.unit === 'year' ? r.cadence.unit : 'week';
        return {
          repeatRule: 'some_days_period',
          repeatDays: [],
          yearlyDates: [],
          cadenceCount: Math.max(1, Number(c) || 1),
          cadenceUnit: u,
          intervalEvery: 2,
        };
      }
      case 'interval_days': {
        const iv = Math.max(1, Number(r.intervalDays ?? r.interval) || 1);
        return {
          repeatRule: 'repeat',
          repeatDays: [],
          yearlyDates: [],
          cadenceCount: 1,
          cadenceUnit: 'week',
          intervalEvery: iv,
        };
      }
      case 'custom': {
        const iv = Math.max(1, Number(r.interval) || 2);
        return {
          repeatRule: 'repeat',
          repeatDays: [],
          yearlyDates: [],
          cadenceCount: 1,
          cadenceUnit: 'week',
          intervalEvery: iv,
        };
      }
      default:
        break;
    }
  }

  if (habit?.repeatRule) {
    return {
      repeatRule: habit.repeatRule,
      repeatDays: Array.isArray(habit.repeatDays) ? [...habit.repeatDays] : [],
      yearlyDates: Array.isArray(habit.yearlyDates)
        ? habit.yearlyDates.map((p) => clampMonthDay(p.month, p.day))
        : [],
      cadenceCount: Math.max(1, Number(habit.cadenceCount) || 1),
      cadenceUnit: ['week', 'month', 'year'].includes(habit.cadenceUnit) ? habit.cadenceUnit : 'week',
      intervalEvery: Math.max(1, Number(habit.intervalEvery) || 2),
    };
  }

  return {
    repeatRule: 'daily',
    repeatDays: [],
    yearlyDates: [],
    cadenceCount: 1,
    cadenceUnit: 'week',
    intervalEvery: 2,
  };
}

/** Monday = 0 … Sunday = 6 */
export function isoWeekdayIndexMon0(d) {
  const dow = d.getDay();
  return dow === 0 ? 6 : dow - 1;
}

export function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

/**
 * @param {Date} d
 * @param {Array<{ month: number, day: number }>} yearlyDates
 */
export function matchesYearlyDates(d, yearlyDates) {
  if (!Array.isArray(yearlyDates) || yearlyDates.length === 0) return false;
  const m = d.getMonth() + 1;
  const dom = d.getDate();
  const y = d.getFullYear();
  return yearlyDates.some((p) => {
    const { month, day } = clampMonthDay(p.month, p.day, y);
    return month === m && day === dom;
  });
}

/**
 * @param {object} habit
 * @param {string} dateKey
 */
export function isHabitScheduledOnDate(habit, dateKey) {
  if (habit.isArchived) return false;

  const { schedule, repeat } = habit;

  if (schedule?.startDateKey && dateKey < schedule.startDateKey) return false;
  if (schedule?.endDateKey && dateKey > schedule.endDateKey) return false;

  if (!repeat || !repeat.mode) return true;

  const d = parseDateKey(dateKey);
  const dow = d.getDay();
  const dom = d.getDate();

  switch (repeat.mode) {
    case 'daily':
      return true;

    case 'weekdays':
      return dow >= 1 && dow <= 5;

    case 'weekly': {
      if (!Array.isArray(repeat.daysOfWeek) || repeat.daysOfWeek.length === 0) return false;
      return repeat.daysOfWeek.includes(dow);
    }

    case 'monthly': {
      if (!Array.isArray(repeat.daysOfMonth) || repeat.daysOfMonth.length === 0) return false;
      return repeat.daysOfMonth.includes(dom);
    }

    case 'yearly': {
      if (!schedule?.startDateKey) return true;
      const start = parseDateKey(schedule.startDateKey);
      return d.getMonth() === start.getMonth() && d.getDate() === start.getDate();
    }

    case 'yearly_dates':
      return matchesYearlyDates(d, repeat.yearlyDates || []);

    case 'periodic_count': {
      const c = Math.max(1, Math.floor(Number(repeat.cadence?.count)) || 1);
      const u = repeat.cadence?.unit === 'month' || repeat.cadence?.unit === 'year' ? repeat.cadence.unit : 'week';
      if (u === 'week') {
        const cap = Math.min(c, 7);
        return isoWeekdayIndexMon0(d) < cap;
      }
      if (u === 'month') {
        const dim = daysInMonth(d.getFullYear(), d.getMonth() + 1);
        const cap = Math.min(c, dim);
        return dom <= cap;
      }
      const doy = dayOfYear(d);
      const cap = Math.min(c, 366);
      return doy >= 1 && doy <= cap;
    }

    case 'interval_days':
    case 'custom': {
      const n = Math.max(
        1,
        Math.floor(Number(repeat.intervalDays ?? repeat.interval)) || 1,
      );
      if (!schedule?.startDateKey) return true;
      const start = parseDateKey(schedule.startDateKey);
      const diffMs = d.getTime() - start.getTime();
      const diffDays = Math.round(diffMs / 86400000);
      return diffDays >= 0 && diffDays % n === 0;
    }

    default:
      return true;
  }
}

/**
 * @param {Partial<FrequencyFormState>} state
 * @returns {string}
 */
export function formatHabitFrequencyLabelFromState(state) {
  const s = {
    repeatRule: state?.repeatRule || 'daily',
    repeatDays: Array.isArray(state?.repeatDays) ? state.repeatDays : [],
    yearlyDates: Array.isArray(state?.yearlyDates) ? state.yearlyDates : [],
    cadenceCount: Math.max(1, Number(state?.cadenceCount) || 1),
    cadenceUnit: state?.cadenceUnit || 'week',
    intervalEvery: Math.max(1, Number(state?.intervalEvery) || 1),
  };
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WEEKDAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (s.repeatRule === 'daily') return 'Every day';

  if (s.repeatRule === 'specific_days_week' && s.repeatDays.length) {
    const set = new Set(s.repeatDays.map(Number));
    if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return 'Weekdays';
    const names = s.repeatDays
      .map((d) => {
        const n = Number(d);
        return n >= 1 && n <= 7 ? WEEKDAY_ABBR[n - 1] : null;
      })
      .filter(Boolean);
    if (names.length) return `Specific days (${names.join(', ')})`;
    return 'Specific days of the week';
  }

  if (s.repeatRule === 'specific_days_month' && s.repeatDays.length) {
    const nums = s.repeatDays.map(Number).filter((x) => x >= 1 && x <= 31);
    if (nums.length === 1) return `Monthly (day ${nums[0]})`;
    if (nums.length) return `Monthly (${nums.slice(0, 4).join(', ')}${nums.length > 4 ? '…' : ''})`;
    return 'Specific days of the month';
  }

  if (s.repeatRule === 'specific_days_year') {
    if (!s.yearlyDates.length) return 'Specific days of the year';
    const parts = s.yearlyDates.map((p) => {
      const m = Math.max(1, Math.min(12, Number(p.month) || 1));
      const d = Math.max(1, Math.min(31, Number(p.day) || 1));
      return `${MONTH_NAMES[m - 1]} ${d}`;
    });
    return `Yearly (${parts.join(', ')})`;
  }

  if (s.repeatRule === 'some_days_period') {
    const u = s.cadenceUnit === 'month' ? 'month' : s.cadenceUnit === 'year' ? 'year' : 'week';
    const label = u === 'week' ? 'week' : u === 'month' ? 'month' : 'year';
    return `${s.cadenceCount} day${s.cadenceCount !== 1 ? 's' : ''} per ${label}`;
  }

  if (s.repeatRule === 'repeat') {
    return `Every ${s.intervalEvery} day${s.intervalEvery !== 1 ? 's' : ''}`;
  }

  return 'Every day';
}
