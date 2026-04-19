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
 * Native: avoid WebChannel on RN (`webchannel-blob` / `stream.onMessage` → Firestore `ERROR null`).
 *
 * Default: **force long polling** on iOS and Android (most stable). Opt in to auto-detect only if needed:
 * - `EXPO_PUBLIC_FIRESTORE_AUTO_DETECT_LONG_POLL=1` — use experimentalAutoDetectLongPolling (not recommended on RN unless testing).
 * - `EXPO_PUBLIC_FIRESTORE_FORCE_LONG_POLL=1` — explicit force (same as default; kept for clarity).
 *
 * Init ladder: retry without memory cache — **never** call plain `getFirestore()` on native except when
 * Firestore was already started (`isAlreadyStartedError`), because default transport is WebChannel and triggers RN bugs.
 */
function nativeTransportSettings() {
  const autoDetectEnv =
    process.env.EXPO_PUBLIC_FIRESTORE_AUTO_DETECT_LONG_POLL === '1';
  const forceEnv = process.env.EXPO_PUBLIC_FIRESTORE_FORCE_LONG_POLL === '1';

  if (autoDetectEnv && !forceEnv) {
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

  const transport = nativeTransportSettings();
  const attempts = [
    { label: 'longPoll+memoryLocalCache', settings: { ...transport, localCache: memoryLocalCache() } },
    { label: 'longPoll_noLocalCache', settings: { ...transport } },
  ];

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
    try {
      instance = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[firebase] Firestore OK', { os: Platform.OS, via: 'lastChance_forceLongPoll_only' });
      }
    } catch (e) {
      if (isAlreadyStartedError(e)) {
        instance = getFirestore(app);
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[firebase] Firestore reuse via getFirestore (already started)', e?.message || e);
        }
      } else {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.error(
            '[firebase] Firestore init failed on native; refusing getFirestore() fallback (WebChannel causes ERROR null on RN).',
            lastErr?.message || lastErr,
            e?.message || e,
          );
        }
        throw e;
      }
    }
  }

  g[FIRESTORE_SINGLETON_KEY] = instance;
  return instance;
}

export const db = getOrInitFirestore();

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[BOOT:firebase]', {
    phase: 'after Firestore init',
    projectId: app.options?.projectId ?? null,
    os: Platform.OS,
    hasDb: Boolean(db),
  });
}

flowLog('FIREBASE_INIT', {
  projectId: app.options?.projectId ?? null,
  os: Platform.OS,
});

void enableNetwork(db).catch((e) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[BOOT:firebase] enableNetwork failed (offline ok):', e?.message || e);
  }
});
export const storage = getStorage(app);
export { auth };
export default app;
