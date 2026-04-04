/**
 * Dev-only Firestore tracing and user-facing error strings.
 */

/**
 * @param {unknown} err
 * @returns {string}
 */
export function formatFirestoreError(err) {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
  const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err || 'Unknown error');
  if (code === 'permission-denied') {
    return `${message} (permission-denied: sign in with the same app as Firestore, deploy rules, and check users/{uid}/activities + exercises read access).`;
  }
  if (code === 'failed-precondition') {
    return `${message} (failed-precondition: often a missing composite index — check the Firebase console link in the full error log.)`;
  }
  return message;
}

/**
 * @param {string} label
 * @param {Record<string, unknown>} details
 */
export function devLogFirestore(label, details) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[Firestore:${label}]`, details);
  }
}
