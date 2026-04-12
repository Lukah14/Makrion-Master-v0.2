/** Must run before Firebase — avoids URL/stream quirks on RN (Firestore WebChannel / long-poll XHR). */
import 'react-native-url-polyfill/auto';

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  enableNetwork,
  memoryLocalCache,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { flowLog } from '@/lib/flowLog';

/** Survives Fast Refresh so we never call `initializeFirestore` twice (2nd call throws → `getFirestore` default = WebChannel = RN crashes). */
const g = typeof globalThis !== 'undefined' ? globalThis : global;
const FIRESTORE_SINGLETON_KEY = '__makrion_firestore_db_singleton__';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

if (__DEV__ && !firebaseConfig.apiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[firebase] Missing EXPO_PUBLIC_FIREBASE_* env vars. Add them to .env and restart Expo (npx expo start -c).',
  );
}

if (
  __DEV__ &&
  typeof process !== 'undefined' &&
  process.env.EXPO_PUBLIC_SIGN_OUT_ON_LAUNCH === '1'
) {
  // eslint-disable-next-line no-console
  console.log(
    '[firebase] EXPO_PUBLIC_SIGN_OUT_ON_LAUNCH=1 — AuthProvider will sign out before attaching listeners.',
  );
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/** Same FirebaseApp for Auth + Firestore so security rules see request.auth. */
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

/**
 * Native: avoid default WebChannel (RN XMLHttpRequest + incremental data → `stream.onMessage` / `ERROR null`).
 *
 * Env:
 * - `EXPO_PUBLIC_FIRESTORE_AUTO_DETECT_LONG_POLL=1` — auto-detect long polling (good on some Android builds).
 * - `EXPO_PUBLIC_FIRESTORE_FORCE_LONG_POLL=1` — force long poll even when auto-detect is default on Android.
 *
 * Init ladder: if `memoryLocalCache()` makes `initializeFirestore` throw, we retry without it — **never**
 * silently fall through to `getFirestore()` unless Firestore was already started (same instance).
 */
function transportSettings() {
  const autoDetectEnv =
    process.env.EXPO_PUBLIC_FIRESTORE_AUTO_DETECT_LONG_POLL === '1';
  const forceEnv = process.env.EXPO_PUBLIC_FIRESTORE_FORCE_LONG_POLL === '1';

  /** Android: default auto-detect long poll (avoids WebChannel/XHR incremental bugs on many RN builds). iOS: force long poll unless AUTO_DETECT=1. */
  const useAutoDetect =
    autoDetectEnv || (Platform.OS === 'android' && !forceEnv);

  if (useAutoDetect) {
    return { experimentalAutoDetectLongPolling: true };
  }
  return { experimentalForceLongPolling: true };
}

function isAlreadyStartedError(err) {
  const m = err?.message || String(err);
  return /already been started|already initialized|settings can no longer be changed/i.test(m);
}

function getOrInitFirestore() {
  const existing = g[FIRESTORE_SINGLETON_KEY];
  if (existing) {
    return existing;
  }

  const useWebFirestore = Platform.OS === 'web';

  if (useWebFirestore) {
    /**
     * Dev + Expo web: default IndexedDB persistence + React Strict Mode (double mount) often races the
     * watch stream and triggers TargetState INTERNAL ASSERTION (ca9). Memory cache avoids IDB/HMR churn.
     * Production web keeps default persistent cache via getFirestore.
     */
    if (__DEV__) {
      try {
        const instance = initializeFirestore(app, { localCache: memoryLocalCache() });
        g[FIRESTORE_SINGLETON_KEY] = instance;
        return instance;
      } catch (e) {
        if (isAlreadyStartedError(e)) {
          const instance = getFirestore(app);
          g[FIRESTORE_SINGLETON_KEY] = instance;
          return instance;
        }
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[firebase] Web dev initializeFirestore(memory) failed, using getFirestore:', e?.message || e);
        }
      }
    }
    const instance = getFirestore(app);
    g[FIRESTORE_SINGLETON_KEY] = instance;
    return instance;
  }

  const transport = transportSettings();
  const attempts = [
    { label: 'longPoll+memoryLocalCache', settings: { ...transport, localCache: memoryLocalCache() } },
    { label: 'longPoll_noLocalCache', settings: { ...transport } },
  ];

  /** If forced long-poll was chosen but init failed, try auto-detect before touching `getFirestore`. */
  if (transport.experimentalForceLongPolling) {
    attempts.push({
      label: 'autoDetect_fallback',
      settings: {
        experimentalAutoDetectLongPolling: true,
        localCache: memoryLocalCache(),
      },
    });
  }

  let instance;
  let lastErr;

  for (const { label, settings } of attempts) {
    try {
      instance = initializeFirestore(app, settings);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[firebase] Firestore OK', { os: Platform.OS, via: label, settings: Object.keys(settings) });
      }
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      if (isAlreadyStartedError(e)) {
        instance = getFirestore(app);
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[firebase] Firestore reuse via getFirestore (already started)', e?.message || e);
        }
        lastErr = null;
        break;
      }
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[firebase] initializeFirestore attempt failed:', label, e?.message || e);
      }
    }
  }

  if (!instance) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[firebase] All initializeFirestore attempts failed — getFirestore (WebChannel → ERROR null on RN). Last error:',
        lastErr?.message || lastErr,
      );
    }
    instance = getFirestore(app);
  }

  g[FIRESTORE_SINGLETON_KEY] = instance;
  return instance;
}

export const db = getOrInitFirestore();

flowLog('FIREBASE_INIT', {
  projectId: app.options?.projectId ?? null,
  os: Platform.OS,
});

void enableNetwork(db).catch(() => {});
export const storage = getStorage(app);
export { auth };
export default app;
