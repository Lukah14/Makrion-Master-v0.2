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
 * Real-time listener for one day's food log.
 * @returns {() => void} unsubscribe
 */
export function subscribeFoodLogEntries(uid, date, onNext, onError) {
  const q = query(entriesRef(uid, date), orderBy('createdAt'));
  return onSnapshot(
    q,
    (snap) => {
      onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export async function updateFoodLogEntry(uid, date, entryId, changes) {
  const update = { ...changes, updatedAt: serverTimestamp() };
  if (changes.grams !== undefined && changes.per100g !== undefined) {
    update.nutrientsSnapshot = calcNutrients(changes.per100g, changes.grams);
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
