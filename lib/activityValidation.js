/**
 * Simple activity validation: time | distance | reps
 */

export const ACTIVITY_TYPE_VALUES = ['time', 'distance', 'reps'];

function n(v) {
  if (v === '' || v == null) return null;
  const x = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(x) ? x : null;
}

function positiveInt(v) {
  const x = n(v);
  if (x == null) return null;
  const i = Math.floor(x);
  return i > 0 ? i : null;
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, minutes: number } | { ok: false, reason: 'empty'|'invalid'|'nonPositive' }}
 */
export function parseDurationMinutesRequired(raw) {
  if (raw === '' || raw == null || (typeof raw === 'string' && !raw.trim())) {
    return { ok: false, reason: 'empty' };
  }
  const x = n(raw);
  if (x == null) return { ok: false, reason: 'invalid' };
  if (x <= 0) return { ok: false, reason: 'nonPositive' };
  return { ok: true, minutes: x };
}

/**
 * Optional duration (reps flow). Empty OK; if present must be valid positive.
 * @param {unknown} raw
 * @returns {{ ok: true, minutes: number|null } | { ok: false, reason: 'invalid'|'nonPositive' }}
 */
export function parseDurationMinutesOptional(raw) {
  if (raw === '' || raw == null || (typeof raw === 'string' && !raw.trim())) {
    return { ok: true, minutes: null };
  }
  const x = n(raw);
  if (x == null) return { ok: false, reason: 'invalid' };
  if (x <= 0) return { ok: false, reason: 'nonPositive' };
  return { ok: true, minutes: x };
}

const DURATION_EMPTY_MSG =
  'Enter duration in minutes (numbers only), for example 15, 30, or 45.';
const DURATION_INVALID_MSG = 'Duration must be a valid number of minutes.';
const DURATION_NON_POSITIVE_MSG = 'Duration must be greater than zero.';

/**
 * @param {string} type
 * @param {Record<string, unknown>} raw
 * @returns {{ ok: true, values: Object } | { ok: false, message: string }}
 */
export function validateActivityForm(type, raw) {
  const name = String(raw.name || '').trim();
  if (!name) {
    return { ok: false, message: 'Enter an activity name.' };
  }

  const distanceKm = n(raw.distanceKm);
  const sets = positiveInt(raw.sets);
  const repsPerSet = positiveInt(raw.repsPerSet);

  const hasDistance = distanceKm != null && distanceKm > 0;

  switch (type) {
    case 'time': {
      const d = parseDurationMinutesRequired(raw.durationMinutes);
      if (!d.ok) {
        if (d.reason === 'empty') return { ok: false, message: DURATION_EMPTY_MSG };
        if (d.reason === 'invalid') return { ok: false, message: DURATION_INVALID_MSG };
        return { ok: false, message: DURATION_NON_POSITIVE_MSG };
      }
      return {
        ok: true,
        values: {
          type: 'time',
          name,
          durationMinutes: d.minutes,
          distanceKm: null,
          sets: null,
          repsPerSet: null,
        },
      };
    }
    case 'distance': {
      const d = parseDurationMinutesRequired(raw.durationMinutes);
      if (!d.ok) {
        if (d.reason === 'empty') return { ok: false, message: DURATION_EMPTY_MSG };
        if (d.reason === 'invalid') return { ok: false, message: DURATION_INVALID_MSG };
        return { ok: false, message: DURATION_NON_POSITIVE_MSG };
      }
      if (!hasDistance) {
        return { ok: false, message: 'Enter distance in kilometers (a positive number).' };
      }
      return {
        ok: true,
        values: {
          type: 'distance',
          name,
          durationMinutes: d.minutes,
          distanceKm,
          sets: null,
          repsPerSet: null,
        },
      };
    }
    case 'reps':
      if (sets == null || repsPerSet == null) {
        return { ok: false, message: 'Add sets and reps per set.' };
      }
      {
        const d = parseDurationMinutesOptional(raw.durationMinutes);
        if (!d.ok) {
          if (d.reason === 'invalid') return { ok: false, message: DURATION_INVALID_MSG };
          return { ok: false, message: DURATION_NON_POSITIVE_MSG };
        }
        return {
          ok: true,
          values: {
            type: 'reps',
            name,
            sets,
            repsPerSet,
            durationMinutes: d.minutes,
            distanceKm: null,
          },
        };
      }
    default:
      return { ok: false, message: 'Choose a valid activity type.' };
  }
}
