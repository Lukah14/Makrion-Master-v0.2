import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserDocument, ensureUserDocument, ensureGoogleUserDocument } from './userService';

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
  /**
   * Firebase Auth has already accepted the credential — the user IS signed in.
   * Do not fail the whole `signIn()` (which would show "Invalid email or password" upstream)
   * because a transient Firestore permission/long-poll error blocked `ensureUserDocument`.
   * NavigationGate + onboarding will re-read/create the profile shell as needed.
   */
  try {
    await ensureUserDocument(credential.user);
  } catch (e) {
    if (__DEV__) {
      console.warn('[AUTH] signIn: ensureUserDocument non-fatal error', e?.message || e);
    }
  }
  return credential.user;
}

/**
 * Sign out only. Do not disable Firestore network here — that wedges listeners and races with
 * profile re-subscribe after the next login. Navigation to `/(auth)/login` is handled by the root gate,
 * and `AuthContext` provides `signOut()` as the centralized entry point for screens.
 */
export async function signOutUser() {
  if (__DEV__) {
    console.log('[AUTH] firebase signOut() invoked');
  }
  await signOut(auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Sign in with a Google ID token (e.g. from @react-native-google-signin/google-signin or tests).
 * Creates a Firebase Auth credential and authenticates. Firestore profile
 * is created/updated via `ensureGoogleUserDocument`.
 */
export async function signInWithGoogleIdToken(idToken) {
  console.log('[FIREBASE_AUTH_START]');
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  console.log('[FIREBASE_AUTH_SUCCESS]', result.user.uid);

  console.log('[FIRESTORE_PROFILE_CREATE_START]');
  await ensureGoogleUserDocument(result.user);
  console.log('[FIRESTORE_PROFILE_CREATE_SUCCESS]');

  return result.user;
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
