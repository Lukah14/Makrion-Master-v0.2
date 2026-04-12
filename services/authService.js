import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { createUserDocument, ensureUserDocument } from './userService';

export async function signUp(email, password, displayName) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }
  await createUserDocument(credential.user, { displayName });
  return credential.user;
}

export async function signIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDocument(credential.user);
  return credential.user;
}

export async function signOutUser() {
  try {
    await disableNetwork(db);
  } catch {
    /* ignore */
  }
  await signOut(auth);
  try {
    await enableNetwork(db);
  } catch {
    /* ignore */
  }
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  const credential = await signInWithPopup(auth, provider);
  await ensureUserDocument(credential.user);
  return credential.user;
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
