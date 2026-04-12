/**
 * React Native Firestore sometimes surfaces internal watch-target collisions as write/read errors.
 * This is a client SDK issue, not duplicate rows or invalid paths in the database.
 */
export function isFirestoreTargetIdError(err) {
  return /Target ID already exists/i.test(err?.message || String(err));
}
