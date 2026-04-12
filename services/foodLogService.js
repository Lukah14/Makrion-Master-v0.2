import { Platform } from 'react-native';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const FOOD_LOG_BUCKET_DESTROY_MS = Platform.OS === 'android' ? 2500 : 400;

function cancelFoodBucketDestroy(bucket) {
  if (bucket.pendingDestroyTimer != null) {
    clearTimeout(bucket.pendingDestroyTimer);
    bucket.pendingDestroyTimer = null;
  }
}

/** RN: re-attaching on this error races Firestore watch state → INTERNAL ASSERTION / ca9. Ignore like profile buckets. */
function isTargetIdConflict(err) {
  return /Target ID already exists/i.test(err?.message || String(err));
}

const FOOD_TARGET_ID_LOG_THROTTLE_MS = 30_000;

/** One listener per (uid, date); Home + Nutrition tabs often mount both. */
const foodLogBuckets = new Map();

function foodLogBucketKey(uid, date) {
  return `${uid}__${date}`;
}

// ─── Nutrition calculation helpers ─────────────────────────────────────────────

function round0(n) {
  return Math.round(n);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

export function calcNutrients(per100g, grams) {
  const ratio = grams / 100;
  return {
    kcal: round0((per100g.kcal ?? 0) * ratio),
    protein: round1((per100g.protein ?? 0) * ratio),
    carbs: round1((per100g.carbs ?? 0) * ratio),
    fat: round1((per100g.fat ?? 0) * ratio),
    fiber: round1((per100g.fiber ?? 0) * ratio),
    sugars: round1((per100g.sugars ?? 0) * ratio),
    saturatedFat: round1((per100g.saturatedFat ?? 0) * ratio),
    transFat: round1((per100g.transFat ?? 0) * ratio),
    sodium: round1((per100g.sodium ?? 0) * ratio),
  };
}

// ─── Food log entry builder ─────────────────────────────────────────────────────

export function buildLogEntry({
  food,
  mealType,
  grams,
  servings = null,
  status = 'logged',
  note = '',
  type = 'food',
}) {
  const nutrientsSnapshot = calcNutrients(food.per100g, grams);
  return {
    foodId: food.id || null,
    type,
    mealType,
    nameSnapshot: food.name,
    brandSnapshot: food.brand || '',
    grams,
    servings,
    servingGrams: food.servingGrams || 100,
    nutrientsSnapshot,
    status,
    note,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/**
 * Manual log entry: direct nutrientsSnapshot only (no serving / per-100g math).
 * @param {Object} p
 * @param {string} p.dateKey - YYYY-MM-DD (mirrors path segment)
 * @param {string} p.name
 * @param {string} p.mealType - breakfast | lunch | dinner | snack
 * @param {Object} p.nutrientsSnapshot - kcal, protein, carbs, fat required; fiber, sugars, sodium optional
 */
export function buildManualLogEntry({
  dateKey,
  name,
  mealType,
  nutrientsSnapshot,
  status = 'logged',
  note = '',
}) {
  const n = nutrientsSnapshot || {};
  const snap = {
    kcal: round0(n.kcal ?? 0),
    protein: round1(n.protein ?? 0),
    carbs: round1(n.carbs ?? 0),
    fat: round1(n.fat ?? 0),
    fiber: round1(n.fiber ?? 0),
    sugars: round1(n.sugars ?? 0),
    sodium: round1(n.sodium ?? 0),
    saturatedFat: round1(n.saturatedFat ?? 0),
    transFat: round1(n.transFat ?? 0),
  };
  return {
    source: 'manual',
    type: 'manual',
    amountType: 'manual',
    foodId: null,
    mealType,
    dateKey,
    nameSnapshot: name,
    brandSnapshot: null,
    grams: null,
    servings: null,
    servingGrams: null,
    servingLabel: null,
    nutrientsSnapshot: snap,
    status,
    note,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/** @param {object} entry */
export function isManualFoodLogEntry(entry) {
  if (!entry) return false;
  if (entry.source === 'manual' || entry.amountType === 'manual') return true;
  const id = entry.foodId;
  return id != null && String(id).startsWith('manual_');
}

// ─── Collection references ─────────────────────────────────────────────────────

function entriesRef(uid, date) {
  return collection(db, 'users', uid, 'foodLogs', date, 'entries');
}

function entryRef(uid, date, entryId) {
  return doc(db, 'users', uid, 'foodLogs', date, 'entries', entryId);
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export async function addFoodLogEntry(uid, date, entryData) {
  const ref = await addDoc(entriesRef(uid, date), entryData);
  return ref.id;
}

export async function getFoodLogEntry(uid, date, entryId) {
  const snap = await getDoc(entryRef(uid, date, entryId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listFoodLogEntries(uid, date) {
  const q = query(entriesRef(uid, date), orderBy('createdAt'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Real-time listener for one day's food log (shared if multiple components use the same day).
 * @returns {() => void} unsubscribe
 */
export function subscribeFoodLogEntries(uid, date, onNext, onError) {
  const k = foodLogBucketKey(uid, date);
  let bucket = foodLogBuckets.get(k);
  if (!bucket) {
    bucket = {
      listeners: new Map(),
      nextId: 0,
      unsub: null,
      destroyed: false,
      lastTargetIdLogAt: 0,
      pendingDestroyTimer: null,
      uid,
      date,
    };
    foodLogBuckets.set(k, bucket);
  }

  cancelFoodBucketDestroy(bucket);
  bucket.destroyed = false;

  const id = ++bucket.nextId;
  bucket.listeners.set(id, { onNext, onError });

  const broadcast = (list) => {
    for (const l of bucket.listeners.values()) {
      try {
        l.onNext(list);
      } catch (e) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[foodLog] subscriber onNext error', e);
        }
      }
    }
  };

  const broadcastErr = (err) => {
    for (const l of bucket.listeners.values()) {
      try {
        l.onError?.(err);
      } catch {
        /* ignore */
      }
    }
  };

  const detach = () => {
    try {
      bucket.unsub?.();
    } catch {
      /* ignore */
    }
    bucket.unsub = null;
  };

  const attach = () => {
    if (bucket.destroyed) return;
    detach();
    const q = query(entriesRef(bucket.uid, bucket.date), orderBy('createdAt'));
    bucket.unsub = onSnapshot(
      q,
      (snap) => {
        broadcast(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        if (bucket.destroyed) return;
        if (isTargetIdConflict(err)) {
          const now = Date.now();
          if (__DEV__ && now - bucket.lastTargetIdLogAt > FOOD_TARGET_ID_LOG_THROTTLE_MS) {
            bucket.lastTargetIdLogAt = now;
            // eslint-disable-next-line no-console
            console.log('[foodLog] Target ID conflict (ignored; listener kept)', bucket.uid, bucket.date);
          }
          return;
        }
        broadcastErr(err);
      },
    );
  };

  if (bucket.listeners.size === 1 && !bucket.unsub) {
    attach();
  }

  return () => {
    bucket.listeners.delete(id);
    if (bucket.listeners.size === 0) {
      cancelFoodBucketDestroy(bucket);
      bucket.pendingDestroyTimer = setTimeout(() => {
        bucket.pendingDestroyTimer = null;
        if (bucket.listeners.size > 0) return;
        bucket.destroyed = true;
        detach();
        foodLogBuckets.delete(k);
      }, FOOD_LOG_BUCKET_DESTROY_MS);
    }
  };
}

export async function updateFoodLogEntry(uid, date, entryId, changes) {
  const update = { ...changes, updatedAt: serverTimestamp() };
  const hasGramsAndPer100 =
    changes.grams !== undefined && changes.per100g !== undefined;
  if (hasGramsAndPer100) {
    update.nutrientsSnapshot = calcNutrients(changes.per100g, changes.grams);
    delete update.per100g;
  } else if (changes.nutrientsSnapshot !== undefined) {
    delete update.per100g;
  }
  await updateDoc(entryRef(uid, date, entryId), update);
}

export async function deleteFoodLogEntry(uid, date, entryId) {
  await deleteDoc(entryRef(uid, date, entryId));
}

export async function duplicateFoodLogEntry(uid, date, entryId) {
  const existing = await getFoodLogEntry(uid, date, entryId);
  if (!existing) throw new Error('Entry not found');
  const { id, createdAt, updatedAt, ...rest } = existing;
  const newEntry = {
    ...rest,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(entriesRef(uid, date), newEntry);
  return ref.id;
}

export async function moveFoodLogEntry(uid, fromDate, toDate, entryId, newMealType) {
  const existing = await getFoodLogEntry(uid, fromDate, entryId);
  if (!existing) throw new Error('Entry not found');
  const { id, createdAt, ...rest } = existing;
  const newEntry = {
    ...rest,
    mealType: newMealType,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(entriesRef(uid, toDate), newEntry);
  await deleteDoc(entryRef(uid, fromDate, entryId));
  return ref.id;
}

export async function updateEntryStatus(uid, date, entryId, status) {
  await updateDoc(entryRef(uid, date, entryId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// ─── Daily summaries ────────────────────────────────────────────────────────────

export function calcDailySummary(entries) {
  const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

  const empty = () => ({
    kcal: 0, protein: 0, carbs: 0, fat: 0,
    fiber: 0, sugars: 0, saturatedFat: 0, transFat: 0, sodium: 0,
  });

  const totalsLogged = empty();
  const totalsPlanned = empty();
  const mealSubtotals = Object.fromEntries(MEAL_TYPES.map((m) => [m, empty()]));

  const NUTRIENT_KEYS = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugars', 'saturatedFat', 'transFat', 'sodium'];

  for (const entry of entries) {
    const n = entry.nutrientsSnapshot || empty();
    const target = entry.status === 'planned' ? totalsPlanned : totalsLogged;
    const mealKey = MEAL_TYPES.includes(entry.mealType) ? entry.mealType : 'snack';
    for (const k of NUTRIENT_KEYS) {
      target[k] += n[k] ?? 0;
      mealSubtotals[mealKey][k] += n[k] ?? 0;
    }
  }

  const totalsCombined = {};
  for (const k of NUTRIENT_KEYS) {
    totalsCombined[k] = k === 'kcal'
      ? round0(totalsLogged[k] + totalsPlanned[k])
      : round1(totalsLogged[k] + totalsPlanned[k]);
  }

  return {
    totalsLogged,
    totalsPlanned,
    totalsCombined,
    mealSubtotals,
  };
}

export function calcDashboardSummary({ goals, totalsLogged, caloriesBurned = 0 }) {
  const goalCalories = goals?.calories ?? 2000;
  const consumed = totalsLogged?.kcal ?? 0;
  const burned = caloriesBurned;
  const remaining = goalCalories - consumed + burned;
  return {
    goalCalories,
    consumed,
    burned,
    remaining,
  };
}
