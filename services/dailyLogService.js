/**
 * Daily-log service — profiles/{uid}/daily_logs/{dateKey}
 * Aggregation shell: totals from profiles/.../food_entries, users/.../activities
 * (Activity tab writes users/{uid}/activities — same uid as profiles), and habit_completions.
 */

import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUserProfile } from './profileService';
import { getActiveHabitsForDate } from '@/lib/habitSchedule';

function dailyLogRef(uid, dateKey) {
  return doc(db, 'profiles', uid, 'daily_logs', dateKey);
}

/**
 * @param {string} uid
 * @param {string} dateKey
 * @returns {Promise<import('@/models/firestoreModels').DailyLog|null>}
 */
export async function getDailyLog(uid, dateKey) {
  const snap = await getDoc(dailyLogRef(uid, dateKey));
  return snap.exists() ? { dateKey: snap.id, ...snap.data() } : null;
}

/**
 * Merge-write a daily_logs document.
 * @param {string} uid
 * @param {string} dateKey
 * @param {Object} data
 */
export async function upsertDailyLog(uid, dateKey, data) {
  await setDoc(
    dailyLogRef(uid, dateKey),
    { ...data, dateKey, uid, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** Zero-value meal totals helper */
function emptyMealTotals() {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
}

/**
 * Re-aggregate food_entries + activities + habit_completions for a dateKey
 * and write/merge the daily_logs document.
 * @param {string} uid
 * @param {string} dateKey
 */
export async function recalculateDailyLog(uid, dateKey) {
  const foodSnap = await getDocs(
    query(
      collection(db, 'profiles', uid, 'food_entries'),
      where('dateKey', '==', dateKey),
    ),
  );
  const foods = foodSnap.docs.map((d) => d.data());

  const mealBuckets = {
    breakfast: emptyMealTotals(),
    lunch: emptyMealTotals(),
    dinner: emptyMealTotals(),
    snack: emptyMealTotals(),
  };

  let caloriesConsumed = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const f of foods) {
    if (f.status && f.status !== 'logged') continue;
    const n = f.nutrientsSnapshot || {};
    const kcal = n.kcal || 0;
    const p = n.protein || 0;
    const c = n.carbs || 0;
    const ft = n.fat || 0;

    caloriesConsumed += kcal;
    protein += p;
    carbs += c;
    fat += ft;

    const bucket = mealBuckets[f.mealType] || mealBuckets.snack;
    bucket.kcal += kcal;
    bucket.protein += p;
    bucket.carbs += c;
    bucket.fat += ft;
  }

  const actSnap = await getDocs(
    query(
      collection(db, 'users', uid, 'activities'),
      where('date', '==', dateKey),
    ),
  );
  let caloriesBurned = 0;
  for (const d of actSnap.docs) {
    const a = d.data();
    if (a.status != null && a.status !== 'done') continue;
    caloriesBurned += Number(a.caloriesBurned) || 0;
  }

  let calorieGoal = 0;
  try {
    const profile = await getUserProfile(uid);
    calorieGoal = profile?.goals?.calorieGoal || 0;
  } catch (_) { /* profile may not exist yet */ }

  const caloriesRemaining = calorieGoal - caloriesConsumed + caloriesBurned;

  const compSnap = await getDocs(
    query(
      collection(db, 'profiles', uid, 'habit_completions'),
      where('dateKey', '==', dateKey),
    ),
  );
  const habitsCompleted = compSnap.docs.filter(
    (d) => d.data().isCompleted,
  ).length;

  let habitsTotal = 0;
  try {
    const habitsSnap = await getDocs(
      collection(db, 'profiles', uid, 'habits'),
    );
    const allHabits = habitsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    habitsTotal = getActiveHabitsForDate(allHabits, dateKey).length;
  } catch (_) { /* ok */ }

  const payload = {
    dateKey,
    uid,
    caloriesConsumed: Math.round(caloriesConsumed),
    caloriesBurned: Math.round(caloriesBurned),
    caloriesRemaining: Math.round(caloriesRemaining),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    waterMl: 0,
    habitsCompleted,
    habitsTotal,
    mealTotals_breakfast: roundMealTotals(mealBuckets.breakfast),
    mealTotals_lunch: roundMealTotals(mealBuckets.lunch),
    mealTotals_dinner: roundMealTotals(mealBuckets.dinner),
    mealTotals_snack: roundMealTotals(mealBuckets.snack),
    hasFoodEntries: foods.length > 0,
    hasActivities: actSnap.docs.length > 0,
    hasHabits: habitsTotal > 0,
    hasMemorableMoments: false,
    lastRecalculatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(dailyLogRef(uid, dateKey), payload, { merge: true });
  return payload;
}

function roundMealTotals(m) {
  return {
    kcal: Math.round(m.kcal),
    protein: Math.round(m.protein),
    carbs: Math.round(m.carbs),
    fat: Math.round(m.fat),
  };
}
