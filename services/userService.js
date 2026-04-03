import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    },
  });
}

export async function getUserDocument(uid) {
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
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
