import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Shallow-merge nested maps into Firestore dot paths (one level: profile.*, goals.*, preferences.*).
 * @param {string} prefix
 * @param {Record<string, unknown>|undefined} obj
 * @param {Record<string, unknown>} out
 */
function assignNested(prefix, obj, out) {
  if (!obj || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    out[`${prefix}.${k}`] = v;
  }
}

/**
 * Partial update for users/{uid} without replacing whole profile/goals objects.
 * @param {string} uid
 * @param {{ profile?: object, goals?: object, preferences?: object, displayName?: string, photoURL?: string }} partial
 */
export async function patchUserDocument(uid, partial) {
  const updates = { updatedAt: serverTimestamp() };
  if (partial.displayName !== undefined) updates.displayName = partial.displayName;
  if (partial.photoURL !== undefined) updates.photoURL = partial.photoURL;
  assignNested('profile', partial.profile, updates);
  assignNested('goals', partial.goals, updates);
  assignNested('preferences', partial.preferences, updates);
  await updateDoc(userRef(uid), updates);
}

/**
 * Mirror key health/nutrition fields from users/{uid} into profiles/{uid} for services that read profiles.
 */
export async function syncProfilesFromUserDoc(uid) {
  const uSnap = await getDoc(userRef(uid));
  if (!uSnap.exists()) return;
  const u = uSnap.data();
  const up = u.profile || {};
  const ug = u.goals || {};
  const pref = doc(db, 'profiles', uid);
  const pSnap = await getDoc(pref);
  const existing = pSnap.exists() ? pSnap.data() : {};

  const body = {
    ...(existing.body || {}),
    heightCm: numOrNull(up.height),
    currentWeightKg: numOrNull(up.currentWeight ?? up.weight),
    targetWeightKg: numOrNull(ug.targetWeight),
    sex:
      typeof up.sex === 'string'
        ? up.sex.toLowerCase() === 'male'
          ? 'male'
          : up.sex.toLowerCase() === 'female'
            ? 'female'
            : up.sex
        : null,
    age: up.age != null ? numOrNull(up.age) : null,
    activityLevel: typeof up.activityLevel === 'string' ? up.activityLevel : null,
  };

  const pGoals = {
    ...(existing.goals || {}),
    calorieGoal: numOrNull(ug.calories),
    proteinGoal: numOrNull(ug.protein),
    carbsGoal: numOrNull(ug.carbs),
    fatGoal: numOrNull(ug.fat),
    weightGoalKg: numOrNull(ug.targetWeight),
    stepGoal: numOrNull(ug.stepsGoal),
  };

  await setDoc(
    pref,
    {
      uid,
      email: u.email || '',
      displayName: u.displayName || '',
      photoURL: u.photoURL || null,
      body,
      goals: pGoals,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function userRef(uid) {
  return doc(db, 'users', uid);
}

export async function createUserDocument(firebaseUser, extra = {}) {
  const ref = userRef(firebaseUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: extra.displayName || firebaseUser.displayName || '',
    photoURL: firebaseUser.photoURL || '',
    role: 'user',
    onboardingCompleted: false,
    profileCompleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    profile: {
      sex: '',
      dateOfBirth: '',
      height: null,
      weight: null,
      currentWeight: null,
      activityLevel: '',
    },
    goals: {
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      water: null,
      targetWeight: null,
      stepsGoal: 10000,
    },
    settings: {
      darkMode: false,
      language: 'en',
    },
    stats: {
      streak: 0,
    },
    preferences: {
      units: 'metric',
      appearance: 'light',
    },
  });
}

export async function getUserDocument(uid) {
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Ensure users/{uid} exists after sign-in (idempotent). */
export async function ensureUserDocument(firebaseUser) {
  if (!firebaseUser?.uid) return;
  const snap = await getDoc(userRef(firebaseUser.uid));
  if (!snap.exists()) {
    await createUserDocument(firebaseUser, {});
  }
}

export async function updateUserProfile(uid, profileData) {
  await updateDoc(userRef(uid), {
    profile: profileData,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserGoals(uid, goals) {
  await updateDoc(userRef(uid), {
    goals,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserPreferences(uid, preferences) {
  await updateDoc(userRef(uid), {
    preferences,
    updatedAt: serverTimestamp(),
  });
}

export async function completeOnboarding(uid) {
  await updateDoc(userRef(uid), {
    onboardingCompleted: true,
    updatedAt: serverTimestamp(),
  });
}

export async function updateDisplayName(uid, displayName) {
  await updateDoc(userRef(uid), {
    displayName,
    updatedAt: serverTimestamp(),
  });
}
