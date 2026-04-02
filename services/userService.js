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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    profile: {
      sex: '',
      dateOfBirth: '',
      height: null,
      weight: null,
      activityLevel: 'moderate',
    },
    goals: {
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65,
      water: 2.5,
      targetWeight: null,
    },
    preferences: {
      darkMode: false,
      units: 'metric',
      language: 'en',
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
