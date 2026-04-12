#!/usr/bin/env node
/**
 * Deletes a Firebase Auth user by email (Admin SDK).
 *
 * Prerequisites: same as scripts/seed-exercises.mjs (service account JSON or ADC).
 *
 * Usage (from project root):
 *   node scripts/delete-auth-user-by-email.mjs user@example.com
 *   npm run auth:delete-user -- user@example.com
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join, isAbsolute } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function parseEnvLineValue(raw) {
  let val = raw.trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return val;
}

function readKeysFromRootEnv(keys) {
  const envPath = join(rootDir, '.env');
  if (!existsSync(envPath)) return {};
  const text = readFileSync(envPath, 'utf8');
  const out = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    if (!keys.includes(key)) continue;
    out[key] = parseEnvLineValue(t.slice(eq + 1));
  }
  return out;
}

function readProjectIdFromRootEnv() {
  const row = readKeysFromRootEnv(['EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID']);
  return row.FIREBASE_PROJECT_ID || row.EXPO_PUBLIC_FIREBASE_PROJECT_ID || null;
}

function resolveCredentialPath(p) {
  if (!p) return null;
  const trimmed = p.trim();
  if (!trimmed) return null;
  return isAbsolute(trimmed) ? trimmed : join(rootDir, trimmed);
}

function findSingleFirebaseAdminKeyInScriptsDir() {
  try {
    const names = readdirSync(__dirname).filter(
      (n) => n.endsWith('.json') && n.includes('-firebase-adminsdk-'),
    );
    if (names.length === 1) return join(__dirname, names[0]);
  } catch {
    /* ignore */
  }
  return null;
}

const email = process.argv[2]?.trim();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: node scripts/delete-auth-user-by-email.mjs <email>');
  process.exit(1);
}

let admin;
try {
  admin = (await import('firebase-admin')).default;
} catch {
  console.error('Install firebase-admin: npm i -D firebase-admin');
  process.exit(1);
}

let projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  readProjectIdFromRootEnv();

const envFromFile = readKeysFromRootEnv([
  'GOOGLE_APPLICATION_CREDENTIALS',
  'FIREBASE_SERVICE_ACCOUNT_PATH',
]);

let credPathRaw =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  envFromFile.GOOGLE_APPLICATION_CREDENTIALS ||
  envFromFile.FIREBASE_SERVICE_ACCOUNT_PATH;

const credPathFromEnv = resolveCredentialPath(credPathRaw);
const credPathFromScripts = findSingleFirebaseAdminKeyInScriptsDir();
const credPath =
  credPathFromEnv && existsSync(credPathFromEnv)
    ? credPathFromEnv
    : credPathFromScripts && existsSync(credPathFromScripts)
      ? credPathFromScripts
      : null;

let credential;
if (credPath) {
  const key = JSON.parse(readFileSync(credPath, 'utf8'));
  credential = admin.credential.cert(key);
  projectId = projectId || key.project_id;
  console.log(`Using service account file: ${credPath}`);
} else if (process.env.SEED_USE_GCLOUD_ADC === '1') {
  credential = admin.credential.applicationDefault();
  console.log('Using Application Default Credentials.');
} else {
  console.error(
    'No Firebase Admin credentials. Put *-firebase-adminsdk-*.json in scripts/ or set GOOGLE_APPLICATION_CREDENTIALS in .env — see scripts/seed-exercises.mjs',
  );
  process.exit(1);
}

if (!projectId) {
  console.error('Could not determine Firebase project ID (set EXPO_PUBLIC_FIREBASE_PROJECT_ID in .env or FIREBASE_PROJECT_ID).');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential, projectId });
}

try {
  const userRecord = await admin.auth().getUserByEmail(email);
  await admin.auth().deleteUser(userRecord.uid);
  console.log(`Deleted Firebase Auth user: ${email} (uid: ${userRecord.uid}) in project "${projectId}".`);
} catch (e) {
  if (e?.code === 'auth/user-not-found') {
    console.log(`No Firebase Auth user with email: ${email} (already removed).`);
    process.exit(0);
  }
  console.error(e?.message || e);
  process.exit(1);
}
