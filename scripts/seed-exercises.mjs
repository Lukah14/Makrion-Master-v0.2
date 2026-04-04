#!/usr/bin/env node
/**
 * Seeds the top-level Firestore collection `exercises` from data/exerciseSeedData.mjs
 * (schema: name, typeOfExercise, intensity, met, kcalsPerHour80kg, isActive, timestamps).
 * For a full spreadsheet import use: npm run import:exercises:xlsx → npm run seed:exercises:bulk
 *
 * Prerequisites:
 *   npm i -D firebase-admin
 *
 * Credentials (required unless SEED_USE_GCLOUD_ADC=1):
 *   - Add to .env (recommended):
 *       GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 *     (path relative to project root or absolute; file = Firebase Console → Service accounts → key)
 *   - Or set the same variable in your shell before npm run seed:exercises
 *   - Optional alias in .env: FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json
 *   - Dev shortcut: place exactly one *-firebase-adminsdk-*.json next to this script (scripts/).
 *   - Advanced: gcloud auth application-default login, then SEED_USE_GCLOUD_ADC=1 npm run seed:exercises
 *
 * Project id (fixes "Unable to detect a Project Id"):
 *   - Set FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT, or
 *   - Keep EXPO_PUBLIC_FIREBASE_PROJECT_ID in project root .env (read automatically), or
 *   - Rely on project_id inside the service account JSON file.
 *
 * Run from project root:
 *   npm run seed:exercises
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { EXERCISE_SEED_DATA } from '../data/exerciseSeedData.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function parseEnvLineValue(raw) {
  let val = raw.trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return val;
}

/** Read keys from project root .env (file is gitignored). */
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

/** If there is exactly one Admin SDK key in scripts/, use it (no env needed). */
function findSingleFirebaseAdminKeyInScriptsDir() {
  try {
    const names = readdirSync(__dirname).filter(
      (n) => n.endsWith('.json') && n.includes('-firebase-adminsdk-'),
    );
    if (names.length === 1) return join(__dirname, names[0]);
    if (names.length > 1) {
      console.warn(
        `[seed-exercises] Multiple *-firebase-adminsdk-*.json in scripts/ — set GOOGLE_APPLICATION_CREDENTIALS. Found: ${names.join(', ')}`,
      );
    }
  } catch {
    /* ignore */
  }
  return null;
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
  console.log('Using Application Default Credentials (gcloud application-default login).');
} else {
  console.error(`
No Firebase Admin credentials found (fixes: "Could not load the default credentials").

1) Download a service account key JSON from:
   Firebase Console → Project settings → Service accounts → Generate new private key

2) Save the JSON in the project, then either:
   • Put exactly one file named like *-firebase-adminsdk-*.json inside the scripts/ folder, or
   • Add to .env: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
     (or an absolute path). Never commit the key; rotate it if it was ever pushed to git.

3) Run again: npm run seed:exercises

Optional: if you use "gcloud auth application-default login" instead:
   SEED_USE_GCLOUD_ADC=1 npm run seed:exercises
`);
  process.exit(1);
}

if (!projectId) {
  console.error(`
Could not determine Firebase project ID (fixes: Unable to detect a Project Id).

Do one of the following:
  1. Add to .env: EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
  2. Or set env: FIREBASE_PROJECT_ID=your-project-id
  3. Or set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON (contains project_id)
`);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential, projectId });
}

const db = admin.firestore();
const batch = db.batch();
const ts = admin.firestore.FieldValue.serverTimestamp();

for (const row of EXERCISE_SEED_DATA) {
  const { slug, ...rest } = row;
  if (!slug) {
    console.warn('Skip row without slug', row);
    continue;
  }
  const ref = db.collection('exercises').doc(slug);
  batch.set(
    ref,
    {
      name: rest.name,
      typeOfExercise: rest.typeOfExercise,
      intensity: rest.intensity,
      met: Number(rest.met),
      kcalsPerHour80kg: Number(rest.kcalsPerHour80kg),
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    { merge: true },
  );
}

await batch.commit();
console.log(`Seeded ${EXERCISE_SEED_DATA.length} exercises into "${projectId}" → collection "exercises".`);
