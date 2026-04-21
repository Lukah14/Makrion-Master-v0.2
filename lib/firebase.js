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
  disableNetwork,
  memoryLocalCache,
  terminate,
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

/**
 * Web sign-out helper — terminates the Firestore WebSocket/HTTPS long-poll channel BEFORE the
 * auth token is revoked. This prevents in-flight WATCH_CHANGE messages from arriving on
 * already-removed watch targets, which would trigger the `ca9` hard-assert inside the Firebase
 * SDK's TargetState machine and poison the AsyncQueue with `b815`.
 *
 * After calling this, `db` is unusable. The caller MUST trigger a page reload so the next
 * user session gets a fresh Firestore instance.
 *
 * No-op on non-web platforms (Android/iOS use long-polling; the race is much less likely and
 * `terminate` would permanently wedge the RN Firestore transport).
 */
export async function terminateFirestoreDbForWeb() {
  if (Platform.OS !== 'web') return;
  try {
    const existing = g[FIRESTORE_SINGLETON_KEY];
    if (existing) {
      await terminate(existing);
      g[FIRESTORE_SINGLETON_KEY] = null;
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[firebase] Firestore instance terminated (web pre-signOut)');
      }
    }
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[firebase] terminateFirestoreDbForWeb failed (non-fatal):', e?.message || e);
    }
  }
}

/**
 * Native (iOS / Android) sign-out helper — disables the Firestore network connection BEFORE
 * listeners are torn down and the auth token is revoked.
 *
 * This closes the active long-polling channel immediately, preventing in-flight WATCH_CHANGE
 * messages from the Firestore server reaching the client after local targets are already removed.
 * Without this, the server's in-flight message arrives after `innerUnsub()` clears local
 * TargetState → `ca9` hard-assert → AsyncQueue poisoned → every subsequent Firestore call
 * (including the next login's profile write) throws `b815`.
 *
 * Unlike `terminate()`, `disableNetwork()` leaves the Firestore instance alive and reusable.
 * `UserProfileContext` calls `enableNetwork(db)` on the next sign-in, restoring the connection.
 *
 * No-op on web (web uses `terminateFirestoreDbForWeb()` + page reload instead).
 */
export async function disableNetworkForNativeSignOut() {
  if (Platform.OS === 'web') return;
  try {
    await disableNetwork(db);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[firebase] Firestore network disabled (native pre-signOut)');
    }
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[firebase] disableNetworkForNativeSignOut failed (non-fatal):', e?.message || e);
    }
  }
}

/**
 * Emergency recovery for web: if a `ca9`/`b815` Firestore internal assertion reaches the global
 * unhandled-rejection handler (e.g. because the in-flight WATCH_CHANGE arrived after listener
 * teardown completed and no error callback is registered), auto-reload the page so the next
 * session starts with a clean Firestore instance.
 *
 * This is a last-resort fallback. Normal sign-out via `AuthContext.signOut()` calls
 * `terminateFirestoreDbForWeb()` first, which prevents the race entirely.
 */
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const msg = String(event?.reason?.message || event?.reason || '');
      const isFirestoreQueueFailed =
        /INTERNAL ASSERTION FAILED.*\(ID: (ca9|b815)\)/i.test(msg) ||
        /Unexpected state \(ID: (ca9|b815)\)/i.test(msg);
      if (!isFirestoreQueueFailed) return;
      event.preventDefault();
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          '[firebase] Firestore AsyncQueue failure detected on web (ca9/b815) — reloading in 1.5s to recover. Prevent this by ensuring sign-out uses AuthContext.signOut().',
          msg.slice(0, 120),
        );
      }
      setTimeout(() => {
        if (typeof window !== 'undefined') window.location.reload();
      }, 1500);
    },
    { passive: true },
  );
}
