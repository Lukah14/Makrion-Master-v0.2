import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { readDocResilient } from '@/lib/firestoreResilientRead';
import { isFirestoreTargetIdError } from '@/lib/firestoreRnErrors';

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
    if (v === undefined) continue;
    out[`${prefix}.${k}`] = v;
  }
}

/**
 * Partial update for users/{uid} without replacing whole profile/goals objects.
 * @param {string} uid
 * @param {{ profile?: object, goals?: object, preferences?: object, displayName?: string, photoURL?: string }} partial
 */
export async function patchUserDocument(uid, partial) {
  await ensureUserRootShell(uid);
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
  const uRead = await readDocResilient(userRef(uid));
  if (!uRead.exists) return;
  const u = uRead.data() || {};
  const up = u.profile || {};
  const ug = u.goals || {};
  const pref = doc(db, 'profiles', uid);
  const pRead = await readDocResilient(pref);
  const existing = pRead.exists ? pRead.data() || {} : {};

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

  const payload = {
    uid,
    email: u.email || '',
    displayName: u.displayName || '',
    photoURL: u.photoURL || null,
    body,
    goals: pGoals,
    updatedAt: serverTimestamp(),
  };
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await setDoc(pref, payload, { merge: true });
      return;
    } catch (e) {
      if (!isFirestoreTargetIdError(e) || attempt === 5) throw e;
      await new Promise((r) => setTimeout(r, Math.min(2000, 280 * attempt)));
    }
  }
}

function userRef(uid) {
  return doc(db, 'users', uid);
}

export async function createUserDocument(firebaseUser, extra = {}) {
  const ref = userRef(firebaseUser.uid);
  const r = await readDocResilient(ref);
  if (r.exists) return;

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

/**
 * Firestore `updateDoc(users/{uid})` fails if the document does not exist (common after partial sign-up
 * or race before `ensureUserDocument`). Idempotent shell for all root updates.
 */
export async function ensureUserRootShell(uid) {
  if (!uid || typeof uid !== 'string') return;
  const r = await readDocResilient(userRef(uid));
  if (r.exists) return;
  await createUserDocument(
    { uid, email: '', displayName: '', photoURL: '' },
    {},
  );
}

export async function getUserDocument(uid) {
  const r = await readDocResilient(userRef(uid));
  if (!r.exists) return null;
  const d = r.data();
  return d ? { id: r.id, ...d } : null;
}

/** Ensure users/{uid} exists after sign-in (idempotent). */
export async function ensureUserDocument(firebaseUser) {
  if (!firebaseUser?.uid) return;
  const r = await readDocResilient(userRef(firebaseUser.uid));
  if (!r.exists) {
    await createUserDocument(firebaseUser, {});
  }
}

/**
 * Ensure users/{uid} exists for a Google-authenticated user.
 * - New user: creates full document with `provider: 'google'`.
 * - Existing user: safely merges `displayName`, `photoURL`, `updatedAt` without
 *   overwriting onboarding progress, goals, or other user data.
 */
export async function ensureGoogleUserDocument(firebaseUser) {
  if (!firebaseUser?.uid) return;
  const ref = userRef(firebaseUser.uid);
  const r = await readDocResilient(ref);

  if (!r.exists) {
    await setDoc(ref, {
      uid: firebaseUser.uid,
      email: firebaseUser.email || null,
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || '',
      provider: 'google',
      role: 'user',
      onboardingCompleted: false,
      profileCompleted: false,
      isProfileComplete: false,
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
    console.log('[FIRESTORE_PROFILE_CREATED]', firebaseUser.uid);
  } else {
    const existing = r.data() || {};
    const updates = { updatedAt: serverTimestamp() };

    if (firebaseUser.displayName && firebaseUser.displayName !== existing.displayName) {
      updates.displayName = firebaseUser.displayName;
    }
    if (firebaseUser.photoURL && firebaseUser.photoURL !== existing.photoURL) {
      updates.photoURL = firebaseUser.photoURL;
    }
    if (!existing.provider) {
      updates.provider = 'google';
    }

    await updateDoc(ref, updates);
    console.log('[FIRESTORE_PROFILE_UPDATED]', firebaseUser.uid);
  }
}

export async function updateUserProfile(uid, profileData) {
  await ensureUserRootShell(uid);
  await updateDoc(userRef(uid), {
    profile: profileData,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserGoals(uid, goals) {
  await ensureUserRootShell(uid);
  await updateDoc(userRef(uid), {
    goals,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserPreferences(uid, preferences) {
  await ensureUserRootShell(uid);
  await updateDoc(userRef(uid), {
    preferences,
    updatedAt: serverTimestamp(),
  });
}

export async function completeOnboarding(uid) {
  await ensureUserRootShell(uid);
  await updateDoc(userRef(uid), {
    onboardingCompleted: true,
    updatedAt: serverTimestamp(),
  });
}

export async function updateDisplayName(uid, displayName) {
  await ensureUserRootShell(uid);
  await updateDoc(userRef(uid), {
    displayName,
    updatedAt: serverTimestamp(),
  });
}
