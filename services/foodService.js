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
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { computeNutritionPer100g, GRAM_EQUIVALENTS } from '@/lib/servingConversion';

// ─── Schema helpers ────────────────────────────────────────────────────────────

function buildSearchableText(name, brand) {
  return [name, brand].filter(Boolean).join(' ').toLowerCase();
}

export function buildMyFoodPayload({
  name,
  brand = '',
  description = '',
  defaultServing = {},
  servingsPerContainer = null,
  nutritionPerServing = {},
  source = 'user',
  createdBy = null,
}) {
  const { amount = 1, unit = 'g', gramsEquivalent = null } = defaultServing;
  const resolvedGrams = gramsEquivalent ?? GRAM_EQUIVALENTS[unit]?.(amount) ?? null;

  const perServing = {
    calories: nutritionPerServing.calories ?? 0,
    protein: nutritionPerServing.protein ?? 0,
    carbs: nutritionPerServing.carbs ?? 0,
    fat: nutritionPerServing.fat ?? 0,
    saturatedFat: nutritionPerServing.saturatedFat ?? null,
    sugar: nutritionPerServing.sugar ?? null,
    fiber: nutritionPerServing.fiber ?? null,
    sodium: nutritionPerServing.sodium ?? null,
    vitaminA: nutritionPerServing.vitaminA ?? null,
    vitaminC: nutritionPerServing.vitaminC ?? null,
    calcium: nutritionPerServing.calcium ?? null,
    iron: nutritionPerServing.iron ?? null,
  };

  const per100g = resolvedGrams
    ? computeNutritionPer100g(perServing, resolvedGrams)
    : null;

  return {
    name,
    brand,
    description,
    defaultServing: {
      amount,
      unit,
      gramsEquivalent: resolvedGrams,
    },
    servingsPerContainer: servingsPerContainer || null,
    nutritionPerServing: perServing,
    nutritionPer100g: per100g,
    source,
    createdBy,
    searchableText: buildSearchableText(name, brand),
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

// ─── Curated global foods (foods/{foodId}) ─────────────────────────────────────

export async function getGlobalFood(foodId) {
  const snap = await getDoc(doc(db, 'foods', foodId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function searchGlobalFoods(searchTerm, maxResults = 20) {
  const q = query(
    collection(db, 'foods'),
    where('nameLower', '>=', searchTerm.toLowerCase()),
    where('nameLower', '<=', searchTerm.toLowerCase() + '\uf8ff'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getFoodsByCategory(category, maxResults = 50) {
  const q = query(
    collection(db, 'foods'),
    where('category', '==', category),
    orderBy('name'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── User custom foods (users/{uid}/myFoods/{foodId}) ──────────────────────────

function myFoodsRef(uid) {
  return collection(db, 'users', uid, 'myFoods');
}

export async function createMyFood(uid, foodData) {
  const payload = buildMyFoodPayload({ ...foodData, source: 'user', createdBy: uid });
  const ref = await addDoc(myFoodsRef(uid), payload);
  return ref.id;
}

export async function getMyFood(uid, foodId) {
  const snap = await getDoc(doc(db, 'users', uid, 'myFoods', foodId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listMyFoods(uid) {
  const q = query(
    myFoodsRef(uid),
    where('isDeleted', '==', false),
    orderBy('name')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * @returns {() => void} unsubscribe
 */
export function subscribeMyFoods(uid, onNext, onError) {
  const q = query(
    myFoodsRef(uid),
    where('isDeleted', '==', false),
    orderBy('name')
  );
  return onSnapshot(
    q,
    (snap) => {
      onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (err) => onError?.(err)
  );
}

export async function searchMyFoods(uid, searchTerm) {
  const all = await listMyFoods(uid);
  if (!searchTerm?.trim()) return all;
  const lower = searchTerm.toLowerCase();
  return all.filter(
    (f) => f.searchableText?.includes(lower) || f.name?.toLowerCase().includes(lower)
  );
}

export async function updateMyFood(uid, foodId, changes) {
  await updateDoc(doc(db, 'users', uid, 'myFoods', foodId), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMyFood(uid, foodId) {
  await updateDoc(doc(db, 'users', uid, 'myFoods', foodId), {
    isDeleted: true,
    updatedAt: serverTimestamp(),
  });
}

export async function hardDeleteMyFood(uid, foodId) {
  await deleteDoc(doc(db, 'users', uid, 'myFoods', foodId));
}

export function myFoodToSearchModel(food) {
  const serving = food.defaultServing || {};
  const n = food.nutritionPerServing || {};
  const servingText = `${serving.amount || 1} ${serving.unit || 'serving'}`;

  return {
    id: food.id,
    name: food.name,
    brand: food.brand || null,
    category: null,
    servingText,
    calories: n.calories || 0,
    protein: n.protein || 0,
    carbs: n.carbs || 0,
    fat: n.fat || 0,
    source: 'user',
    servings: buildServingsForMyFood(food),
    defaultServing: null,
    _raw: food,
  };
}

function buildServingsForMyFood(food) {
  const serving = food.defaultServing || {};
  const n = food.nutritionPerServing || {};
  const amount = serving.amount || 1;
  const unit = serving.unit || 'serving';
  const grams = serving.gramsEquivalent;

  const defaultS = {
    id: 'user_default',
    description: `${amount} ${unit}`,
    numberOfUnits: 1,
    metricAmount: grams || 0,
    metricUnit: 'g',
    isDefault: true,
    isGramServing: unit === 'g',
    nutrition: {
      calories: n.calories || 0,
      protein: n.protein || 0,
      carbohydrate: n.carbs || 0,
      fat: n.fat || 0,
      saturated_fat: n.saturatedFat || 0,
      fiber: n.fiber || 0,
      sugar: n.sugar || 0,
      sodium: n.sodium || 0,
    },
    per100g: food.nutritionPer100g ? {
      calories: food.nutritionPer100g.calories || 0,
      protein: food.nutritionPer100g.protein || 0,
      carbohydrate: food.nutritionPer100g.carbs || 0,
      fat: food.nutritionPer100g.fat || 0,
      saturated_fat: food.nutritionPer100g.saturatedFat || 0,
      fiber: food.nutritionPer100g.fiber || 0,
      sugar: food.nutritionPer100g.sugar || 0,
      sodium: food.nutritionPer100g.sodium || 0,
    } : null,
    displayLabel: `${amount} ${unit}`,
  };

  const result = [defaultS];

  if (grams && unit !== 'g') {
    result.push({
      id: 'user_grams',
      description: 'g',
      numberOfUnits: 100,
      metricAmount: 100,
      metricUnit: 'g',
      isDefault: false,
      isGramServing: true,
      nutrition: food.nutritionPer100g ? {
        calories: food.nutritionPer100g.calories || 0,
        protein: food.nutritionPer100g.protein || 0,
        carbohydrate: food.nutritionPer100g.carbs || 0,
        fat: food.nutritionPer100g.fat || 0,
        saturated_fat: food.nutritionPer100g.saturatedFat || 0,
        fiber: food.nutritionPer100g.fiber || 0,
        sugar: food.nutritionPer100g.sugar || 0,
        sodium: food.nutritionPer100g.sodium || 0,
      } : defaultS.nutrition,
      per100g: defaultS.per100g,
      displayLabel: 'grams',
    });
  }

  return result;
}

// ─── Favorites (users/{uid}/favorites/{foodId}) ────────────────────────────────

function favoritesRef(uid) {
  return collection(db, 'users', uid, 'favorites');
}

export async function addFavorite(uid, food) {
  const ref = doc(db, 'users', uid, 'favorites', food.id);
  await setDoc(ref, {
    foodId: food.id,
    name: food.name,
    brand: food.brand || '',
    category: food.category || '',
    per100g: food.per100g || null,
    servingGrams: food.servingGrams || 100,
    source: food.source,
    addedAt: serverTimestamp(),
  });
}

export async function removeFavorite(uid, foodId) {
  await deleteDoc(doc(db, 'users', uid, 'favorites', foodId));
}

export async function listFavorites(uid) {
  const q = query(favoritesRef(uid), orderBy('addedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function isFavorite(uid, foodId) {
  const snap = await getDoc(doc(db, 'users', uid, 'favorites', foodId));
  return snap.exists();
}

function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

/**
 * Convert a favorites/{id} document into the shape FoodSearchView / AddToLog expect.
 */
export function favoriteDocToSearchModel(fav) {
  const p = fav.per100g || {};
  const kcal100 = p.kcal ?? p.calories ?? 0;
  const protein100 = p.protein ?? 0;
  const carbs100 = p.carbs ?? p.carbohydrate ?? 0;
  const fat100 = p.fat ?? 0;
  const servingGrams = fav.servingGrams || 100;
  const ratio = servingGrams / 100;

  const per100g = {
    kcal: kcal100,
    protein: protein100,
    carbs: carbs100,
    fat: fat100,
  };

  return {
    id: fav.foodId || fav.id,
    name: fav.name,
    brand: fav.brand || null,
    category: fav.category || null,
    servingText: `${servingGrams}g`,
    calories: Math.round(kcal100 * ratio),
    protein: round1(protein100 * ratio),
    carbs: round1(carbs100 * ratio),
    fat: round1(fat100 * ratio),
    source: fav.source || 'saved',
    per100g,
    servingGrams,
    servings: [
      {
        id: 'saved_fav',
        description: `${servingGrams} g`,
        numberOfUnits: 1,
        metricAmount: servingGrams,
        metricUnit: 'g',
        isDefault: true,
        isGramServing: true,
        per100g: {
          calories: kcal100,
          protein: protein100,
          carbohydrate: carbs100,
          fat: fat100,
        },
        nutrition: {
          calories: Math.round(kcal100 * ratio),
          protein: round1(protein100 * ratio),
          carbohydrate: round1(carbs100 * ratio),
          fat: round1(fat100 * ratio),
        },
        displayLabel: `${servingGrams} g`,
      },
    ],
  };
}

// ─── Search cache (users/{uid}/searchCache/{queryHash}) ───────────────────────

export async function getSearchCache(uid, queryHash) {
  const snap = await getDoc(doc(db, 'users', uid, 'searchCache', queryHash));
  return snap.exists() ? snap.data() : null;
}

export async function setSearchCache(uid, queryHash, results) {
  await setDoc(doc(db, 'users', uid, 'searchCache', queryHash), {
    results,
    cachedAt: serverTimestamp(),
  });
}
