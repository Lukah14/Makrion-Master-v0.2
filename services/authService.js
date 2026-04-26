import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  deleteUser,
} from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
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

/**
 * Permanently delete the currently signed-in user.
 *
 * Order of operations:
 *   1. Best-effort delete of `users/{uid}` and `profiles/{uid}` Firestore docs
 *      while the user is still authenticated. Subcollection cleanup (food logs,
 *      habit completions, etc.) is left to a backend Cloud Function (or stays
 *      orphaned in this client-only build); the visible profile is removed.
 *   2. Call Firebase Auth `deleteUser(currentUser)`. Firebase throws
 *      `auth/requires-recent-login` if the user has not signed in recently —
 *      callers should detect this code and ask the user to log out and back in.
 *   3. After successful deletion, the `onAuthStateChanged` listener in
 *      AuthContext fires with `user === null`, which tears down listeners and
 *      drives navigation to the login screen.
 *
 * @throws {Error & { code?: string }} Re-throws Firebase Auth errors with their
 * original `code` (e.g. `auth/requires-recent-login`) so the UI can branch.
 */
export async function deleteCurrentAccount() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    const err = new Error('No signed-in user to delete.');
    err.code = 'auth/no-current-user';
    throw err;
  }
  const uid = currentUser.uid;

  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (e) {
    if (__DEV__) {
      console.warn('[AUTH] deleteCurrentAccount: users/{uid} delete failed (non-fatal)', e?.message || e);
    }
  }
  try {
    await deleteDoc(doc(db, 'profiles', uid));
  } catch (e) {
    if (__DEV__) {
      console.warn('[AUTH] deleteCurrentAccount: profiles/{uid} delete failed (non-fatal)', e?.message || e);
    }
  }

  await deleteUser(currentUser);

  if (__DEV__) {
    console.log('[AUTH] deleteCurrentAccount: auth user deleted', { uid: uid.slice(0, 8) });
  }
}
