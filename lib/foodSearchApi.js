/**
 * FatSecret traffic via Firebase HTTPS function `fatsecretProxy`.
 * No FatSecret credentials in the client — server reads them from Secret Manager.
 */

import { Platform } from 'react-native';
import { getIdToken } from 'firebase/auth';
import app, { auth } from '@/lib/firebase';
import { buildFoodModelFromSearch } from '@/lib/servingUtils';

const FUNCTIONS_REGION = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION || 'us-central1';
const PROJECT_ID = app?.options?.projectId;

function getProxyUrl() {
  if (
    typeof __DEV__ !== 'undefined' &&
    __DEV__ &&
    process.env.EXPO_PUBLIC_USE_FUNCTIONS_EMULATOR === '1'
  ) {
    const host = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
    return `http://${host}:5001/${PROJECT_ID}/${FUNCTIONS_REGION}/fatsecretProxy`;
  }
  return `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net/fatsecretProxy`;
}

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[BOOT:foodSearchApi]', {
    projectId: PROJECT_ID ?? null,
    region: FUNCTIONS_REGION,
    platform: Platform.OS,
    proxyUrl: getProxyUrl(),
  });
}

/** Wait until Firebase Auth has finished restoring the session. */
async function ensureAuthReady() {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }
}

/**
 * Resolve a fresh ID token for the current user.
 * @returns {Promise<string>}
 */
async function getAuthToken() {
  await ensureAuthReady();
  let u = auth.currentUser;
  let attempts = 0;
  while (!u && attempts < 10) {
    await new Promise((r) => setTimeout(r, 50));
    u = auth.currentUser;
    attempts += 1;
  }
  if (!u) {
    throw new Error('Sign in to search foods and recipes.');
  }
  return getIdToken(u, true);
}

function formatUidForLog(uid) {
  if (!uid || typeof uid !== 'string') return 'none';
  return uid.length > 8 ? `${uid.slice(0, 8)}…` : uid;
}

/**
 * @param {Record<string, string>} queryParams
 * @param {{ logIngredient?: boolean }} [options]
 */
async function fetchFatSecretProxy(queryParams, options = {}) {
  if (!PROJECT_ID) {
    throw new Error(
      'Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* to .env and restart Expo.',
    );
  }

  const token = await getAuthToken();
  const uidLog = formatUidForLog(auth.currentUser?.uid);
  const isSearch = queryParams.action === 'search';

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[FATSECRET_PROXY_START]', {
      action: queryParams.action,
      query: queryParams.q || undefined,
      uid: uidLog,
      platform: Platform.OS,
    });
  }

  const url = getProxyUrl();

  /** @type {Record<string, string>} */
  const payload = {};
  Object.entries(queryParams).forEach(([k, v]) => {
    if (v != null && String(v).length > 0) payload[k] = String(v);
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let errMsg;
      try {
        const errJson = JSON.parse(text);
        errMsg = errJson.error || text;
      } catch {
        errMsg = text;
      }
      if (res.status === 401) {
        throw new Error('Could not verify your session. Please sign out and sign in again.');
      }
      throw new Error(errMsg || `Server error ${res.status}`);
    }

    const data = await res.json();

    if (data && typeof data === 'object' && 'error' in data && data.error != null) {
      throw new Error(String(data.error));
    }

    if (__DEV__) {
      if (isSearch) {
        const count = Array.isArray(data?.foods) ? data.foods.length : 0;
        // eslint-disable-next-line no-console
        console.log('[FATSECRET_PROXY_SUCCESS]', {
          action: 'search',
          count,
          totalResults: data?.totalResults,
          uid: uidLog,
        });
      }
      if (queryParams.action === 'recipes') {
        const count = Array.isArray(data?.recipes) ? data.recipes.length : 0;
        // eslint-disable-next-line no-console
        console.log('[FATSECRET_PROXY_SUCCESS]', {
          action: 'recipes',
          count,
          uid: uidLog,
        });
      }
    }

    return /** @type {Record<string, unknown>} */ (data);
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[FATSECRET_PROXY_ERROR]', {
        action: queryParams.action,
        message: err?.message,
        uid: uidLog,
      });
    }
    throw err;
  }
}

/** True when Firebase app has a project id. */
export function isFatSecretFoodSearchConfigured() {
  return Boolean(PROJECT_ID);
}

/**
 * Generic call to `fatsecretProxy` (recipes, etc.).
 * @param {Record<string, string>} queryParams
 * @returns {Promise<Record<string, unknown>>}
 */
export async function fatSecretProxyGet(queryParams) {
  return fetchFatSecretProxy(queryParams, {});
}

/**
 * @param {string} query
 * @param {number} [page]
 * @param {number} [maxResults]
 * @param {{ logIngredient?: boolean }} [options]
 */
export async function fetchFatSecretFoodSearchJson(query, page = 0, maxResults = 20, options = {}) {
  const q = String(query ?? '').trim();
  if (!q) {
    return { foods: [], totalResults: 0 };
  }
  return fetchFatSecretProxy(
    {
      action: 'search',
      q,
      page: String(page),
      max_results: String(maxResults),
    },
    options,
  );
}

/**
 * FatSecret `food.get.v4` via proxy.
 * @param {string} foodId
 * @returns {Promise<{ food?: object }>}
 */
export async function fetchFatSecretFoodGetJson(foodId) {
  const id = String(foodId ?? '').trim();
  if (!id) {
    throw new Error('food_id required');
  }
  return fetchFatSecretProxy({ action: 'get', food_id: id }, {});
}

/**
 * Map proxy `foods` array into the same models used by Nutrition search.
 * @param {unknown[]} foods
 */
export function mapFatSecretProxyFoodsToModels(foods) {
  if (!Array.isArray(foods)) return [];
  const out = [];
  for (const raw of foods) {
    if (!raw || typeof raw !== 'object') continue;
    try {
      out.push(buildFoodModelFromSearch(raw));
    } catch {
      /* skip malformed row */
    }
  }
  return out;
}

/**
 * @param {string} query
 * @param {number} [page]
 * @param {number} [maxResults]
 */
export async function searchFoodModelsFromFatSecret(query, page = 0, maxResults = 20) {
  const data = await fetchFatSecretFoodSearchJson(query, page, maxResults);
  return mapFatSecretProxyFoodsToModels(data.foods || []);
}
