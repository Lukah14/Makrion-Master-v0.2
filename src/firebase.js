/**
 * Deprecated duplicate — the app uses `@/lib/firebase` (long polling + memory cache on native).
 * Re-export so any mistaken import of `src/firebase` still shares one Firestore instance.
 */
export { app, auth, db, storage, default } from '@/lib/firebase';
