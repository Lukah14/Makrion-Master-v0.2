/**
 * Habits + day completions for the Habits tab UI.
 * Storage: profiles/{uid}/habits/{habitId}, profiles/{uid}/habit_completions/{habitId_dateKey}
 * (matches firestore.rules + dailyLogService + habitCompletionService.)
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { parseDateKey, toDateKey } from '@/lib/dateKey';
import {
  getHabitCompletionsByDate,
  upsertHabitCompletion,
  deleteHabitCompletionForDate,
  deleteAllCompletionsForHabit,
  listHabitCompletionsForHabit as fetchCompletionsForHabit,
  listHabitCompletionsSince as fetchCompletionsSince,
} from '@/services/habitCompletionService';

function habitsRef(uid) {
  return collection(db, 'profiles', uid, 'habits');
}

function habitRef(uid, habitId) {
  return doc(db, 'profiles', uid, 'habits', habitId);
}

function stripUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** Map wizard repeatRule + repeatDays → Firestore repeat (habitSchedule.js). */
function mapWizardRepeatToFirestore(repeatRule, repeatDays) {
  const days = Array.isArray(repeatDays) ? repeatDays : [];
  switch (repeatRule) {
    case 'specific_days_week':
      return {
        mode: 'weekly',
        daysOfWeek: days.map((d) => (Number(d) === 7 ? 0 : Number(d))).filter((n) => n >= 0 && n <= 6),
        daysOfMonth: null,
        interval: null,
      };
    case 'specific_days_month':
      return {
        mode: 'monthly',
        daysOfWeek: null,
        daysOfMonth: days.length ? days.map(Number).filter((n) => n >= 1 && n <= 31) : null,
        interval: null,
      };
    case 'specific_days_year':
      return { mode: 'yearly', daysOfWeek: null, daysOfMonth: null, interval: null };
    case 'some_days_period':
      return {
        mode: 'custom',
        daysOfWeek: null,
        daysOfMonth: null,
        interval: days.length ? Math.max(1, Number(days[0]) || 2) : 2,
      };
    default:
      return { mode: 'daily', daysOfWeek: null, daysOfMonth: null, interval: null };
  }
}

function computeEndDateKey(startDateKey, endDateEnabled, endDateDays) {
  if (!endDateEnabled || !endDateDays) return null;
  const start = parseDateKey(startDateKey);
  const d = new Date(start.getTime());
  d.setDate(d.getDate() + (parseInt(String(endDateDays), 10) || 0));
  return toDateKey(d);
}

/**
 * @param {string} uid
 * @param {Object} data  Wizard / UI payload
 */
export async function createHabit(uid, data) {
  const startDateKey =
    typeof data.startDate === 'string' && data.startDate.length >= 10
      ? data.startDate.slice(0, 10)
      : toDateKey(new Date());

  const repeat = mapWizardRepeatToFirestore(data.repeatRule || 'daily', data.repeatDays);
  const endDateKey = computeEndDateKey(
    startDateKey,
    data.endDateEnabled,
    data.endDateDays,
  );

  const habitType = data.type || 'yesno';
  const conditionType = data.conditionType || 'at_least';
  const isAnyNumeric = habitType === 'numeric' && conditionType === 'any_value';
  let target = null;
  if (habitType === 'numeric') {
    if (isAnyNumeric) {
      target = null;
    } else {
      const n = Number(data.target ?? data.targetValue);
      target = Number.isFinite(n) && n > 0 ? n : 1;
    }
  } else {
    const n = Number(data.target ?? data.targetValue);
    target = Number.isFinite(n) && n > 0 ? n : 1;
  }
  const current = Number(data.current) || 0;

  const payload = stripUndefined({
    uid,
    name: data.name || '',
    description: data.description || '',
    category: data.category || 'health',
    type: habitType,
    icon: data.icon || data.iconName || 'check',
    color: data.color || '#2DA89E',
    emoji: data.emoji ?? null,
    iconName: data.iconName ?? null,
    iconBg: data.iconBg ?? null,
    iconColor: data.iconColor ?? null,
    conditionType: habitType === 'numeric' ? conditionType : undefined,
    target,
    current,
    targetValue: target,
    unit: data.unit || '',
    checklistItems: Array.isArray(data.checklistItems) ? data.checklistItems : null,
    repeatRule: data.repeatRule || 'daily',
    repeatDays: data.repeatDays || [],
    reminderTime: data.reminderTime ?? null,
    reminderCount: data.reminderCount ?? 0,
    reminderEnabled: !!(data.reminderTime || data.reminderEnabled),
    priority: data.priority === 'default' ? 'medium' : data.priority || 'medium',
    paused: data.paused ?? false,
    isPaused: data.isPaused ?? false,
    archived: false,
    isArchived: false,
    active: true,
    completed: data.completed ?? false,
    streak: data.streak ?? 0,
    sortOrder: data.sortOrder ?? 0,
    repeat,
    schedule: {
      startDateKey,
      endDateKey,
      reminderEnabled: !!(data.reminderTime || data.reminderEnabled),
      reminderTime: data.reminderTime ?? null,
      priority: data.priority === 'default' ? 'medium' : data.priority || 'medium',
    },
    evaluation: {
      targetValue: target,
      unit: data.unit || null,
      conditionType: habitType === 'numeric' ? conditionType : null,
      checklistTargetCount: Array.isArray(data.checklistItems) ? data.checklistItems.length : null,
      ratingMin: null,
      ratingMax: null,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const ref = await addDoc(habitsRef(uid), payload);
  return ref.id;
}

export async function getHabit(uid, habitId) {
  const snap = await getDoc(habitRef(uid, habitId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * List habits (templates). Archived filtered client-side to avoid composite index issues.
 */
export async function listHabits(uid) {
  const q = query(habitsRef(uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((h) => !(h.archived === true || h.isArchived === true));
}

const PATCH_STRIP_KEYS = new Set([
  'startDate',
  'endDate',
  'endDateEnabled',
  'endDateDays',
  'completionHistory',
  'notes',
  'dayTrackingStatus',
  '_timerElapsedSec',
  '_timerTargetSec',
]);

export async function updateHabit(uid, habitId, changes) {
  const { id: _id, createdAt: _c, ...raw } = changes;
  const patch = stripUndefined({
    ...raw,
    updatedAt: serverTimestamp(),
  });

  if (raw.repeatRule != null || raw.repeatDays != null) {
    patch.repeat = mapWizardRepeatToFirestore(
      raw.repeatRule || 'daily',
      Array.isArray(raw.repeatDays) ? raw.repeatDays : [],
    );
  }

  const hasStart =
    typeof raw.startDate === 'string' && raw.startDate.length >= 10;
  const hasEndField = Object.prototype.hasOwnProperty.call(raw, 'endDate');

  if (hasStart || hasEndField || raw.endDateEnabled !== undefined) {
    const snap = await getDoc(habitRef(uid, habitId));
    const cur = snap.exists() ? snap.data() : {};
    const curSch = { ...(cur.schedule || {}) };
    let sk = curSch.startDateKey;
    if (hasStart) sk = raw.startDate.slice(0, 10);
    else if (typeof cur.startDate === 'string' && cur.startDate.length >= 10) {
      sk = cur.startDate.slice(0, 10);
    }
    if (!sk) sk = toDateKey(new Date());

    let endKey = curSch.endDateKey ?? null;
    if (hasEndField) {
      const ed = raw.endDate;
      endKey = ed && String(ed).length >= 10 ? String(ed).slice(0, 10) : null;
    } else if (raw.endDateEnabled === true && raw.endDateDays) {
      endKey = computeEndDateKey(sk, true, raw.endDateDays);
    } else if (raw.endDateEnabled === false) {
      endKey = null;
    }

    patch.schedule = {
      ...curSch,
      startDateKey: sk,
      endDateKey: endKey,
      reminderEnabled:
        raw.reminderTime != null || raw.reminderEnabled != null
          ? !!(raw.reminderTime || raw.reminderEnabled)
          : (curSch.reminderEnabled ?? false),
      reminderTime:
        raw.reminderTime !== undefined ? raw.reminderTime : (curSch.reminderTime ?? null),
      priority:
        raw.priority !== undefined
          ? (raw.priority === 'default' ? 'medium' : raw.priority || 'medium')
          : (curSch.priority || 'medium'),
    };
  }
  if (raw.type === 'numeric' && raw.conditionType != null) {
    patch.conditionType = raw.conditionType;
    if (raw.conditionType === 'any_value') {
      patch.target = null;
      patch.targetValue = null;
      patch.evaluation = {
        targetValue: null,
        unit: raw.unit ?? null,
        conditionType: 'any_value',
        checklistTargetCount: Array.isArray(raw.checklistItems) ? raw.checklistItems.length : null,
        ratingMin: null,
        ratingMax: null,
      };
    }
  }

  if (raw.target != null || raw.targetValue != null) {
    const t = Number(raw.target ?? raw.targetValue);
    if (raw.conditionType === 'any_value') {
      /* target cleared above */
    } else if (!Number.isNaN(t) && t > 0) {
      patch.target = t;
      patch.targetValue = t;
      patch.evaluation = {
        targetValue: t,
        unit: raw.unit ?? null,
        conditionType: raw.conditionType || patch.conditionType || null,
        checklistTargetCount: Array.isArray(raw.checklistItems) ? raw.checklistItems.length : null,
        ratingMin: null,
        ratingMax: null,
      };
    }
  }

  if (
    raw.type === 'numeric' &&
    raw.conditionType != null &&
    raw.conditionType !== 'any_value' &&
    raw.target == null &&
    raw.targetValue == null
  ) {
    const snap = await getDoc(habitRef(uid, habitId));
    if (snap.exists()) {
      const cur = snap.data();
      const existingT = Number(cur.target ?? cur.targetValue ?? cur.evaluation?.targetValue);
      if (Number.isFinite(existingT) && existingT > 0) {
        patch.evaluation = {
          targetValue: existingT,
          unit: raw.unit ?? cur.unit ?? cur.evaluation?.unit ?? null,
          conditionType: raw.conditionType,
          checklistTargetCount: Array.isArray(raw.checklistItems)
            ? raw.checklistItems.length
            : cur.evaluation?.checklistTargetCount ?? null,
          ratingMin: null,
          ratingMax: null,
        };
      }
    }
  }

  if (raw.archived === true || raw.isArchived === true) {
    patch.archived = true;
    patch.isArchived = true;
  }
  if (raw.archived === false || raw.isArchived === false) {
    patch.archived = false;
    patch.isArchived = false;
  }
  if (raw.paused !== undefined || raw.isPaused !== undefined) {
    patch.paused = raw.isPaused ?? raw.paused;
    patch.isPaused = raw.paused ?? raw.isPaused;
  }

  for (const k of PATCH_STRIP_KEYS) {
    delete patch[k];
  }

  await updateDoc(habitRef(uid, habitId), patch);
}

/** Remove all completion rows for one habit; does not delete the habit document. */
export async function clearHabitCompletionsForHabit(uid, habitId) {
  await deleteAllCompletionsForHabit(uid, habitId);
}

export async function deleteHabit(uid, habitId) {
  await deleteAllCompletionsForHabit(uid, habitId);
  await deleteDoc(habitRef(uid, habitId));
}

// ─── Completions (profiles/.../habit_completions) ─

/**
 * @returns {Promise<Array<{ id: string, habitId: string, completed: boolean, ... }>>}
 */
export async function listHabitCompletions(uid, dateKey) {
  const rows = await getHabitCompletionsByDate(uid, dateKey);
  return rows.map((c) => ({
    ...c,
    habitId: c.habitId,
    completed: c.isCompleted !== false,
    value: c.progressValue ?? null,
    note: c.note ?? '',
  }));
}

export async function logHabitCompletion(uid, date, habitId, data = {}) {
  await upsertHabitCompletion(uid, habitId, date, {
    isCompleted: data.completed !== false,
    progressValue: data.value !== undefined ? data.value : null,
    progressUnit: data.progressUnit !== undefined ? data.progressUnit : null,
  });
  return habitId;
}

export async function getHabitCompletion(uid, date, habitId) {
  const list = await listHabitCompletions(uid, date);
  return list.find((c) => c.habitId === habitId) || null;
}

export async function removeHabitCompletion(uid, date, habitId) {
  await deleteHabitCompletionForDate(uid, habitId, date);
}

/**
 * All completion docs for one habit, sorted by dateKey.
 * @param {string} uid
 * @param {string} habitId
 */
/**
 * All completion docs from minDateKey onward (for manage cards / week strips).
 * @param {string} uid
 * @param {string} minDateKey
 */
export async function listHabitCompletionsSince(uid, minDateKey) {
  return fetchCompletionsSince(uid, minDateKey);
}

export async function listHabitCompletionsForHabit(uid, habitId) {
  const rows = await fetchCompletionsForHabit(uid, habitId);
  return rows.map((c) => ({
    ...c,
    habitId: c.habitId,
    completed: c.isCompleted !== false,
    value: c.progressValue ?? null,
    note: c.note ?? '',
  }));
}

/**
 * Merge-update one day row for non-yes/no tracking (and yes/no when not using toggle delete).
 * @param {string} uid
 * @param {string} habitId
 * @param {string} dateKey
 * @param {Object} data
 */
export async function saveHabitDayCompletion(uid, habitId, dateKey, data) {
  await upsertHabitCompletion(uid, habitId, dateKey, data);
}
