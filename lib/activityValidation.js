/**
 * Minimal activity log validation: name, duration (minutes), calories burned.
 */

function n(v) {
  if (v === '' || v == null) return null;
  const x = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(x) ? x : null;
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

const DURATION_EMPTY_MSG =
  'Enter time in minutes (numbers only), for example 15, 30, or 45.';
const DURATION_INVALID_MSG = 'Time must be a valid number of minutes.';
const DURATION_NON_POSITIVE_MSG = 'Time must be greater than zero.';

const CALORIES_EMPTY_MSG = 'Enter calories burned (kcal).';
const CALORIES_INVALID_MSG = 'Calories must be a valid number.';

/**
 * @param {Record<string, unknown>} raw
 * @returns {{ ok: true, values: { name: string, durationMinutes: number, caloriesBurned: number } } | { ok: false, message: string }}
 */
export function validateSimpleActivityForm(raw) {
  const name = String(raw.name || '').trim();
  if (!name) {
    return { ok: false, message: 'Enter an activity name.' };
  }

  const d = parseDurationMinutesRequired(raw.durationMinutes);
  if (!d.ok) {
    if (d.reason === 'empty') return { ok: false, message: DURATION_EMPTY_MSG };
    if (d.reason === 'invalid') return { ok: false, message: DURATION_INVALID_MSG };
    return { ok: false, message: DURATION_NON_POSITIVE_MSG };
  }

  if (raw.caloriesBurned === '' || raw.caloriesBurned == null) {
    return { ok: false, message: CALORIES_EMPTY_MSG };
  }
  const cal = n(raw.caloriesBurned);
  if (cal == null) return { ok: false, message: CALORIES_INVALID_MSG };
  if (cal < 0) return { ok: false, message: 'Calories cannot be negative.' };

  return {
    ok: true,
    values: {
      name,
      durationMinutes: d.minutes,
      caloriesBurned: Math.round(cal * 10) / 10,
    },
  };
}
