#!/usr/bin/env node
/**
 * Convert an exercise spreadsheet (.xlsx) to JSON for seed-exercises-from-json.mjs
 *
 * Expected columns: Name, Type of exercise, Intensity, MET, kcals/hr (80kg)
 *
 * Usage:
 *   npm run import:exercises:xlsx -- "C:/path/to/exercises.xlsx"
 *   npm run import:exercises:xlsx -- "./my.xlsx" ./data/my-exercises.json
 *
 * Requires: npm i -D xlsx
 */

import { writeFileSync, existsSync } from 'fs';
import { dirname, join, isAbsolute } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

let readWorkbook;
let sheetToJson;
try {
  const mod = await import('xlsx');
  const XLSX = mod.default || mod;
  readWorkbook = XLSX.readFile.bind(XLSX);
  sheetToJson = XLSX.utils.sheet_to_json.bind(XLSX.utils);
} catch {
  console.error('Install xlsx: npm i -D xlsx');
  process.exit(1);
}

const inPath = process.argv[2];
const outArg = process.argv[3];
if (!inPath) {
  console.error('Usage: node scripts/import-exercises-xlsx.mjs <input.xlsx> [output.json]');
  process.exit(1);
}

const inputPath = isAbsolute(inPath) ? inPath : join(rootDir, inPath);
const outputPath = outArg
  ? isAbsolute(outArg)
    ? outArg
    : join(rootDir, outArg)
  : join(rootDir, 'data/exercisesFatsecretImport.json');

if (!existsSync(inputPath)) {
  console.error('Input file not found:', inputPath);
  process.exit(1);
}

const wb = readWorkbook(inputPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const raw = sheetToJson(sheet);

const rows = [];
for (const row of raw) {
  const name = String(row.Name ?? '').trim();
  if (!name) continue;
  rows.push({
    name,
    typeOfExercise: String(row['Type of exercise'] ?? '').trim(),
    intensity: String(row.Intensity ?? '').trim(),
    met: row.MET != null && row.MET !== '' ? Number(row.MET) : null,
    kcalsPerHour80kg:
      row['kcals/hr (80kg)'] != null && row['kcals/hr (80kg)'] !== ''
        ? Number(row['kcals/hr (80kg)'])
        : null,
  });
}

writeFileSync(outputPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
console.log(`Wrote ${rows.length} rows → ${outputPath}`);
console.log('Next: npm run seed:exercises:bulk');
