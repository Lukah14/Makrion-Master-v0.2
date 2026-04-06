/**
 * Numeric habit condition types (wizard labels ↔ stored canon ↔ completion math).
 */

export const NUMERIC_CONDITION = {
  AT_LEAST: 'at_least',
  LESS_THAN: 'less_than',
  EXACTLY: 'exactly',
  ANY_VALUE: 'any_value',
};

const DISPLAY_TO_CANON = {
  'At least': NUMERIC_CONDITION.AT_LEAST,
  'Less than': NUMERIC_CONDITION.LESS_THAN,
  Exactly: NUMERIC_CONDITION.EXACTLY,
  'Any value': NUMERIC_CONDITION.ANY_VALUE,
};

const CANON_TO_DISPLAY = {
  [NUMERIC_CONDITION.AT_LEAST]: 'At least',
  [NUMERIC_CONDITION.LESS_THAN]: 'Less than',
  [NUMERIC_CONDITION.EXACTLY]: 'Exactly',
  [NUMERIC_CONDITION.ANY_VALUE]: 'Any value',
};

export function displayLabelToConditionType(label) {
  if (label != null && DISPLAY_TO_CANON[label] != null) return DISPLAY_TO_CANON[label];
  return NUMERIC_CONDITION.AT_LEAST;
}

export function conditionTypeToDisplayLabel(canon) {
  return CANON_TO_DISPLAY[canon] || 'At least';
}

/**
 * Normalize stored habit field to canon (supports legacy / alternate keys).
 */
export function normalizeNumericConditionType(habit) {
  if (!habit || habit.type !== 'numeric') return NUMERIC_CONDITION.AT_LEAST;

  const raw =
    habit.conditionType ??
    habit.numericConditionType ??
    habit.numericCondition ??
    habit.evaluation?.conditionType ??
    habit.evaluation?.numericCondition;

  if (typeof raw !== 'string') return NUMERIC_CONDITION.AT_LEAST;

  const r = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (r === 'at_least' || r === 'atleast' || r === 'gte' || r === 'minimum') {
    return NUMERIC_CONDITION.AT_LEAST;
  }
  if (r === 'less_than' || r === 'lessthan' || r === 'lt' || r === 'below') {
    return NUMERIC_CONDITION.LESS_THAN;
  }
  if (r === 'exactly' || r === 'equal' || r === 'equals' || r === 'eq') {
    return NUMERIC_CONDITION.EXACTLY;
  }
  if (r === 'any_value' || r === 'anyvalue' || r === 'any') {
    return NUMERIC_CONDITION.ANY_VALUE;
  }

  return NUMERIC_CONDITION.AT_LEAST;
}

/** Numeric habit with "Any value" — value-only tracking, not daily completion. */
export function isNumericAnyValueHabit(habit) {
  return habit?.type === 'numeric' && normalizeNumericConditionType(habit) === NUMERIC_CONDITION.ANY_VALUE;
}

/** Habits that count toward X/Y "completed today" and strike-style completion stats. */
export function habitCountsTowardDailyCompletion(habit) {
  return !isNumericAnyValueHabit(habit);
}

/**
 * Target for comparisons; null when any_value or missing.
 */
export function getNumericTargetValue(habit) {
  const cond = normalizeNumericConditionType(habit);
  if (cond === NUMERIC_CONDITION.ANY_VALUE) return null;

  const t = habit?.target ?? habit?.targetValue ?? habit?.evaluation?.targetValue;
  const n = Number(t);
  if (!Number.isFinite(n)) return 1;
  return n;
}

/**
 * Raw completion row: whether an "Any value" habit has an explicit daily log (including 0).
 * Legacy rows: isCompleted true without progressValue → treat as logged value 1.
 * @param {object|null|undefined} completion
 */
export function anyValueNumericDayHasEntry(completion) {
  if (!completion) return false;
  if (completion.progressValue !== undefined && completion.progressValue !== null) {
    const n = Number(completion.progressValue);
    if (Number.isFinite(n) && n >= 0) return true;
  }
  if (completion.isCompleted === true || completion.completed === true) return true;
  return false;
}

/**
 * Display / merge current for "Any value"; null = no log for that day.
 * @param {object|null|undefined} completion
 * @returns {number|null}
 */
export function anyValueNumericDayCurrent(completion) {
  if (!completion) return null;
  if (completion.progressValue !== undefined && completion.progressValue !== null) {
    const n = Number(completion.progressValue);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  if (completion.isCompleted === true || completion.completed === true) return 1;
  return null;
}

/**
 * Whether entered progress counts as completed for the day.
 * @param {number} enteredValue  progressValue (for any_value, 0 is a valid logged value)
 */
export function isNumericHabitSatisfied(enteredValue, conditionType, targetValue) {
  const v = Number(enteredValue);
  const hasPositiveNumber = Number.isFinite(v) && v > 0;

  if (conditionType === NUMERIC_CONDITION.ANY_VALUE) {
    if (enteredValue === null || enteredValue === undefined) return false;
    return Number.isFinite(v) && v >= 0;
  }

  const tgt = Number(targetValue);
  if (!Number.isFinite(tgt)) return false;

  if (conditionType === NUMERIC_CONDITION.AT_LEAST) {
    return hasPositiveNumber && v >= tgt;
  }
  if (conditionType === NUMERIC_CONDITION.LESS_THAN) {
    return hasPositiveNumber && v < tgt;
  }
  if (conditionType === NUMERIC_CONDITION.EXACTLY) {
    return hasPositiveNumber && v === tgt;
  }
  return hasPositiveNumber && v >= tgt;
}

/**
 * Progress bar 0–100 (best-effort; completion uses isNumericHabitSatisfied).
 */
export function numericHabitProgressPercent(current, conditionType, targetValue, completed) {
  if (conditionType === NUMERIC_CONDITION.ANY_VALUE) {
    return completed ? 100 : 0;
  }
  if (completed) return 100;
  const c = Number(current);
  if (!Number.isFinite(c) || c < 0) return 0;

  const tRaw = targetValue == null || !Number.isFinite(Number(targetValue)) ? 1 : Number(targetValue);
  const t = Math.max(tRaw, 1);

  if (conditionType === NUMERIC_CONDITION.AT_LEAST) {
    return Math.min(100, (Math.max(c, 0) / t) * 100);
  }
  if (conditionType === NUMERIC_CONDITION.LESS_THAN) {
    if (c <= 0) return 0;
    if (c >= t) return 0;
    const denom = Math.max(t - 1, 1);
    return Math.min(100, (c / denom) * 100);
  }
  if (conditionType === NUMERIC_CONDITION.EXACTLY) {
    if (c <= 0) return 0;
    if (c === t) return 100;
    const err = Math.abs(c - t);
    return Math.max(0, Math.min(95, 100 - (err / Math.max(t, 1)) * 100));
  }

  return Math.min(100, (Math.max(c, 0) / t) * 100);
}

/**
 * Suggested progressValue to mark habit “met” from quick-complete when not currently met.
 */
export function numericQuickCompleteValue(conditionType, targetValue, currentValue) {
  const cur = Number(currentValue) || 0;
  const tgt = targetValue == null ? null : Number(targetValue);

  switch (conditionType) {
    case NUMERIC_CONDITION.ANY_VALUE:
      return cur > 0 ? 0 : 1;
    case NUMERIC_CONDITION.AT_LEAST:
      return Math.max(tgt ?? 1, cur, 1);
    case NUMERIC_CONDITION.EXACTLY:
      return Number.isFinite(tgt) ? tgt : 1;
    case NUMERIC_CONDITION.LESS_THAN: {
      if (!Number.isFinite(tgt)) return 1;
      const below = Math.floor(tgt) - 1;
      if (below >= 1) return below;
      if (tgt > 1) return 1;
      return 1;
    }
    default:
      return Math.max(tgt ?? 1, 1);
  }
}
