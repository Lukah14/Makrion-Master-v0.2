import { parseDateKey, toDateKey } from './dateKey';
import {
  normalizeNumericConditionType,
  getNumericTargetValue,
  isNumericHabitSatisfied,
  anyValueNumericDayHasEntry,
  anyValueNumericDayCurrent,
  NUMERIC_CONDITION,
} from './habitNumericCondition';

/**
 * Merge habit templates with per-day habit_completions rows and derive tracking status.
 *
 * Missed heuristic: for a past calendar day (dateKey < today), if the habit is not completed
 * and not in progress, treat as missed. Explicit Firestore trackingStatus === 'missed' wins first.
 */

/** Interpret habit.target + unit as seconds for timer habits. */
export function timerTargetToSeconds(habit) {
  const t = Number(habit.target) || 1;
  const u = (habit.unit || '').toLowerCase();
  if (u.includes('hour') || u === 'h') return Math.round(t * 3600);
  if (u.includes('sec')) return Math.round(t);
  return Math.round(t * 60);
}

/** Display divisor to show elapsed/target in the habit's unit (minutes by default). */
export function timerDisplayDivisor(habit) {
  const u = (habit.unit || '').toLowerCase();
  if (u.includes('hour') || u === 'h') return 3600;
  if (u.includes('sec')) return 1;
  return 60;
}

/** Convert stored elapsed seconds to display amount (matches habit.target unit). */
export function elapsedSecondsToDisplay(elapsedSec, habit) {
  const div = timerDisplayDivisor(habit);
  return elapsedSec / div;
}

export function mergeChecklistItems(templateItems, checklistState) {
  if (!Array.isArray(templateItems)) return [];
  const stateMap = new Map(
    (checklistState || []).map((x) => [String(x.id), !!x.completed]),
  );
  return templateItems.map((item) => ({
    ...item,
    completed: stateMap.has(String(item.id)) ? stateMap.get(String(item.id)) : false,
  }));
}

/**
 * @param {object} habit  Firestore habit template
 * @param {object|null|undefined} completion  Raw completion doc for that day (or mapped row)
 * @param {{ selectedDateKey: string, todayDateKey: string, timerRunning?: boolean }} options
 */
export function mergeHabitWithDayCompletion(habit, completion, options) {
  const type = habit.type;

  if (type === 'yesno') {
    const done = completion?.isCompleted === true || completion?.completed === true;
    return { ...habit, completed: done, current: done ? 1 : 0, target: 1 };
  }

  if (type === 'numeric') {
    const conditionType = normalizeNumericConditionType(habit);
    const targetVal = getNumericTargetValue(habit);

    if (conditionType === NUMERIC_CONDITION.ANY_VALUE) {
      const hasEntry = anyValueNumericDayHasEntry(completion);
      const current = anyValueNumericDayCurrent(completion);
      return {
        ...habit,
        conditionType,
        current,
        target: null,
        completed: false,
        numericDayHasEntry: hasEntry,
      };
    }

    let current = completion?.progressValue != null ? Number(completion.progressValue) : 0;
    if (!Number.isFinite(current) || current < 0) current = 0;
    const done = isNumericHabitSatisfied(current, conditionType, targetVal);
    const targetForUi =
      targetVal == null ? null : Math.max(Number(targetVal) || 1, 1);
    return {
      ...habit,
      conditionType,
      current,
      target: targetForUi,
      completed: done,
    };
  }

  if (type === 'timer') {
    const elapsedSec = completion?.progressValue != null ? Number(completion.progressValue) : 0;
    const safeElapsed = !Number.isFinite(elapsedSec) || elapsedSec < 0 ? 0 : elapsedSec;
    const targetSec = timerTargetToSeconds(habit);
    const div = timerDisplayDivisor(habit);
    const current = safeElapsed / div;
    const targetDisplay = targetSec / div;
    const done = safeElapsed >= targetSec || completion?.isCompleted === true;
    return {
      ...habit,
      current,
      target: targetDisplay,
      completed: done,
      _timerElapsedSec: safeElapsed,
      _timerTargetSec: targetSec,
    };
  }

  if (type === 'checklist') {
    const checklistItems = mergeChecklistItems(habit.checklistItems, completion?.checklistState);
    const total = checklistItems.length;
    const doneCount = checklistItems.filter((i) => i.completed).length;
    const pctFromState =
      completion?.completionPercent != null && Number.isFinite(Number(completion.completionPercent))
        ? Math.min(100, Math.max(0, Number(completion.completionPercent)))
        : total > 0
          ? Math.round((doneCount / total) * 100)
          : 0;
    const done =
      (total > 0 && doneCount === total) ||
      pctFromState >= 100 ||
      completion?.isCompleted === true;
    return {
      ...habit,
      checklistItems,
      current: doneCount,
      target: Math.max(total, 1),
      completed: done,
      completionPercent: pctFromState,
    };
  }

  return { ...habit };
}

/**
 * @param {object} habit
 * @param {object} merged  Result of mergeHabitWithDayCompletion
 * @param {boolean} timerRunning
 */
export function isInProgress(habit, merged, timerRunning) {
  const type = habit.type;

  if (type === 'yesno') return false;

  if (type === 'numeric') {
    const cond = normalizeNumericConditionType(habit);
    if (cond === NUMERIC_CONDITION.ANY_VALUE) return false;
    const c = Number(merged.current) || 0;
    if (merged.completed) return false;
    return c > 0;
  }

  if (type === 'timer') {
    const elapsed = merged._timerElapsedSec ?? 0;
    const targetSec = merged._timerTargetSec ?? timerTargetToSeconds(habit);
    return !!timerRunning || (elapsed > 0 && elapsed < targetSec);
  }

  if (type === 'checklist') {
    const items = merged.checklistItems || [];
    const done = items.filter((i) => i.completed).length;
    return items.length > 0 && done > 0 && done < items.length;
  }

  return false;
}

/**
 * @param {object} habit
 * @param {object|null|undefined} completion
 * @param {object} merged
 * @param {{ selectedDateKey: string, todayDateKey: string, timerRunning?: boolean }} options
 * @returns {'completed'|'in_progress'|'missed'|'not_started'}
 */
export function deriveDayTrackingStatus(habit, completion, merged, options) {
  const { selectedDateKey, todayDateKey, timerRunning = false } = options;

  const numCond = habit?.type === 'numeric' ? normalizeNumericConditionType(habit) : null;
  if (numCond === NUMERIC_CONDITION.ANY_VALUE) {
    if (anyValueNumericDayHasEntry(completion)) return 'logged_value';
    if (completion?.trackingStatus === 'missed') return 'missed';
    if (selectedDateKey < todayDateKey) return 'missed';
    return 'not_started';
  }

  if (merged.completed) return 'completed';
  if (completion?.trackingStatus === 'missed') return 'missed';
  if (isInProgress(habit, merged, timerRunning)) return 'in_progress';
  if (selectedDateKey < todayDateKey) return 'missed';
  return 'not_started';
}

/**
 * @param {Array<{ trackingStatus?: string, completed?: boolean }>} habitsWithStatus
 */
export function countDayStatuses(habitsWithStatus) {
  const acc = { completed: 0, in_progress: 0, missed: 0, not_started: 0 };
  for (const h of habitsWithStatus) {
    const s = h.dayTrackingStatus || 'not_started';
    if (s === 'logged_value') continue;
    if (acc[s] !== undefined) acc[s] += 1;
  }
  return acc;
}

/**
 * Whether a stored completion row counts as a successful day for stats/calendar.
 * @param {object} habit  Template
 * @param {object} completionDoc  Raw row with dateKey
 */
export function isSuccessfulCompletionDay(habit, completionDoc) {
  if (!completionDoc) return false;
  if (habit?.type === 'numeric' && normalizeNumericConditionType(habit) === NUMERIC_CONDITION.ANY_VALUE) {
    return false;
  }
  if (habit?.type === 'numeric') {
    const merged = mergeHabitWithDayCompletion(habit, completionDoc, {
      selectedDateKey: completionDoc.dateKey,
      todayDateKey: completionDoc.dateKey,
    });
    return merged.completed === true;
  }
  if (completionDoc.isCompleted === true) return true;
  const merged = mergeHabitWithDayCompletion(habit, completionDoc, {
    selectedDateKey: completionDoc.dateKey,
    todayDateKey: completionDoc.dateKey,
  });
  return merged.completed === true;
}

/**
 * Sorted dateKeys where the habit was successful.
 * @param {object} habit
 * @param {object[]} completionRows
 * @returns {string[]}
 */
export function dateKeysSuccessfulFromCompletions(habit, completionRows) {
  const keys = [];
  for (const row of completionRows || []) {
    if (row?.dateKey && isSuccessfulCompletionDay(habit, row)) keys.push(row.dateKey);
  }
  keys.sort((a, b) => a.localeCompare(b));
  return keys;
}

/** Longest run of consecutive calendar days in sorted date keys. */
export function computeBestStreak(dateKeysSorted) {
  const keys = [...(dateKeysSorted || [])].sort((a, b) => a.localeCompare(b));
  if (keys.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    const a = parseDateKey(keys[i - 1]);
    const b = parseDateKey(keys[i]);
    const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
    if (diff === 1) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

/**
 * Consecutive successful days ending at **today only**.
 * Today must be in the set; otherwise current streak is 0.
 * Backfilled older days cannot inflate the streak unless the chain
 * reaches today without a gap.
 *
 * @param {string[]} dateKeysSorted
 * @param {string} todayKey
 */
export function computeCurrentStreak(dateKeysSorted, todayKey) {
  const set = new Set(dateKeysSorted || []);
  if (set.size === 0 || !set.has(todayKey)) return 0;
  let n = 0;
  const d = parseDateKey(todayKey);
  for (;;) {
    const k = toDateKey(d);
    if (set.has(k)) {
      n++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return n;
}
