import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

/**
 * Wait until Firebase Auth has restored the session (avoids Firestore calls while
 * currentUser is still null — same pattern as Food Log timing, but explicit for Activity).
 *
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<string>} uid
 */
export function waitForAuthUser(timeoutMs = 5000) {
  if (auth.currentUser?.uid) {
    return Promise.resolve(auth.currentUser.uid);
  }

  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      unsubscribe();
      reject(new Error('Firebase Auth is not ready yet. Try again.'));
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser?.uid) {
        clearTimeout(t);
        unsubscribe();
        resolve(firebaseUser.uid);
      }
    });
  });
}
