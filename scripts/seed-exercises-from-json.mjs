#!/usr/bin/env node
/**
 * Bulk-seed Firestore `exercises` from a JSON array.
 *
 * Default file: data/exercisesFatsecretImport.json (exported from your spreadsheet).
 * Custom path (relative to project root or absolute):
 *   node scripts/seed-exercises-from-json.mjs ./my-exercises.json
 *
 * Same credentials as seed-exercises.mjs (GOOGLE_APPLICATION_CREDENTIALS or one adminsdk JSON in scripts/).
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

function slugify(s) {
  const base = String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96);
  return base || 'exercise';
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
  console.error('No Firebase Admin credentials. See scripts/seed-exercises.mjs header.');
  process.exit(1);
}

if (!projectId) {
  console.error('Could not determine Firebase project ID.');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential, projectId });
}

const db = admin.firestore();
const ts = admin.firestore.FieldValue.serverTimestamp();

const argPath = process.argv[2];
const jsonPath = argPath
  ? isAbsolute(argPath)
    ? argPath
    : join(rootDir, argPath)
  : join(rootDir, 'data/exercisesFatsecretImport.json');

if (!existsSync(jsonPath)) {
  console.error(`JSON not found: ${jsonPath}`);
  process.exit(1);
}

const rows = JSON.parse(readFileSync(jsonPath, 'utf8'));
if (!Array.isArray(rows)) {
  console.error('JSON root must be an array of exercise objects.');
  process.exit(1);
}

const TYPES = new Set(['Cardiovascular', 'Strength']);
const INTENSITIES = new Set(['Light', 'Moderate', 'Strenuous']);
const usedIds = new Set();

function uniqueDocId(name, typeOfExercise, intensity, index) {
  let base = slugify(`${name}-${intensity}-${typeOfExercise}-${index}`);
  let id = base;
  let n = 2;
  while (usedIds.has(id)) {
    id = `${base}-${n++}`;
  }
  usedIds.add(id);
  return id;
}

const BATCH_SIZE = 400;
let written = 0;
for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const chunk = rows.slice(i, i + BATCH_SIZE);
  const batch = db.batch();
  for (let j = 0; j < chunk.length; j++) {
    const r = chunk[j];
    const globalIndex = i + j;
    if (!r || !r.name) continue;
    let typeOfExercise = r.typeOfExercise;
    if (!TYPES.has(typeOfExercise)) typeOfExercise = 'Cardiovascular';
    let intensity = r.intensity;
    if (!INTENSITIES.has(intensity)) intensity = 'Moderate';
    const met = Number(r.met);
    const kcalsPerHour80kg = Number(r.kcalsPerHour80kg);
    const id = uniqueDocId(String(r.name).trim(), typeOfExercise, intensity, globalIndex);
    const ref = db.collection('exercises').doc(id);
    batch.set(
      ref,
      {
        name: String(r.name).trim(),
        typeOfExercise,
        intensity,
        met: Number.isFinite(met) ? met : 0,
        kcalsPerHour80kg: Number.isFinite(kcalsPerHour80kg) ? kcalsPerHour80kg : 0,
        isActive: true,
        createdAt: ts,
        updatedAt: ts,
      },
      { merge: true },
    );
    written += 1;
  }
  await batch.commit();
  console.log(`Committed batch ${Math.floor(i / BATCH_SIZE) + 1}, total docs written so far: ${written}`);
}

console.log(`Done. Seeded ${written} exercises into "${projectId}" from ${jsonPath}`);
