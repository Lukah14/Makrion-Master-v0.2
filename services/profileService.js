/**
 * Profile service — profiles/{uid}
 * Replaces userService.js for the new profiles/ root.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

function profileRef(uid) {
  return doc(db, 'profiles', uid);
}

/**
 * @param {string} uid
 * @returns {Promise<import('@/models/firestoreModels').Profile|null>}
 */
export async function getUserProfile(uid) {
  const snap = await getDoc(profileRef(uid));
  return snap.exists() ? { uid: snap.id, ...snap.data() } : null;
}

/**
 * Create a new profile doc (idempotent — skips if already exists).
 * @param {import('firebase/auth').User} firebaseUser
 * @param {Object} [extra]
 */
export async function createUserProfile(firebaseUser, extra = {}) {
  const ref = profileRef(firebaseUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: extra.displayName || firebaseUser.displayName || '',
    photoURL: firebaseUser.photoURL || null,
    role: 'user',
    onboardingCompleted: false,
    profileCompleted: false,
    settings: {
      darkMode: false,
      language: 'en',
      units: 'metric',
    },
    goals: {
      calorieGoal: null,
      proteinGoal: null,
      carbsGoal: null,
      fatGoal: null,
      waterGoalMl: null,
      stepGoal: null,
      weightGoalKg: null,
    },
    body: {
      heightCm: null,
      currentWeightKg: null,
      targetWeightKg: null,
      sex: null,
      age: null,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Merge-update any fields on the profile document.
 * @param {string} uid
 * @param {Object} data
 */
export async function updateUserProfile(uid, data) {
  await updateDoc(profileRef(uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
