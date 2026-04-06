import {
  TYPE_OF_EXERCISE_VALUES,
  INTENSITY_VALUES,
  deriveLogTypeFromCatalog,
} from '@/lib/exerciseConstants';

/** Reject null/undefined, whitespace, and common placeholder strings (case-insensitive). */
function isUsableNonEmptyString(v) {
  if (v == null) return false;
  const s = String(v).trim();
  if (!s) return false;
  const low = s.toLowerCase();
  if (low === 'null' || low === 'undefined' || low === 'n/a' || low === 'na') return false;
  return true;
}

/**
 * True when a normalized exercise row is safe to show in lists/cards (core fields present and numeric).
 * @param {unknown} row
 */
export function isValidExerciseDefinitionRow(row) {
  if (!row || typeof row !== 'object') return false;
  if (!isUsableNonEmptyString(row.name)) return false;
  if (
    typeof row.typeOfExercise !== 'string' ||
    !TYPE_OF_EXERCISE_VALUES.includes(row.typeOfExercise)
  ) {
    return false;
  }
  if (typeof row.intensity !== 'string' || !INTENSITY_VALUES.includes(row.intensity)) {
    return false;
  }
  const met = row.met != null ? Number(row.met) : NaN;
  if (!Number.isFinite(met)) return false;
  const kcal = row.kcalsPerHour80kg != null ? Number(row.kcalsPerHour80kg) : NaN;
  if (!Number.isFinite(kcal)) return false;
  return true;
}

/** @param {unknown[]} rows */
export function filterValidExerciseDefinitions(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((r) => isValidExerciseDefinitionRow(r));
}

/**
 * Normalized exercise row for list / picker / snapshot.
 * @typedef {Object} ExerciseDefinitionRow
 * @property {string} id
 * @property {string} name
 * @property {'Cardiovascular'|'Strength'} typeOfExercise
 * @property {'Light'|'Moderate'|'Strenuous'} intensity
 * @property {number|null} met
 * @property {number|null} kcalsPerHour80kg
 * @property {'time'|'distance'|'reps'} type
 * @property {string|null} category
 * @property {string|null} shortInstructions
 * @property {boolean} isActive
 */

/**
 * Map Firestore exercise document → unified shape for Activity UI (supports legacy docs).
 * @returns {ExerciseDefinitionRow}
 * @param {string} id
 * @param {Record<string, unknown>} data
 */
export function normalizeExerciseDefinition(id, data) {
  let typeOfExercise = data.typeOfExercise;
  if (typeof typeOfExercise !== 'string' || !TYPE_OF_EXERCISE_VALUES.includes(typeOfExercise)) {
    if (data.type === 'reps' || data.category === 'Strength') typeOfExercise = 'Strength';
    else typeOfExercise = 'Cardiovascular';
  }

  let intensity = data.intensity;
  if (typeof intensity !== 'string' || !INTENSITY_VALUES.includes(intensity)) {
    intensity = 'Moderate';
  }

  const met = data.met != null ? Number(data.met) : NaN;
  const kcalsPerHour80kg =
    data.kcalsPerHour80kg != null ? Number(data.kcalsPerHour80kg) : NaN;

  const legacyType = data.type;
  let type =
    legacyType === 'distance' || legacyType === 'reps' || legacyType === 'time'
      ? legacyType
      : deriveLogTypeFromCatalog(typeOfExercise);

  return {
    id,
    name: String(data.name ?? ''),
    typeOfExercise,
    intensity,
    met: Number.isFinite(met) ? met : null,
    kcalsPerHour80kg: Number.isFinite(kcalsPerHour80kg) ? kcalsPerHour80kg : null,
    type,
    category: data.category != null ? String(data.category) : null,
    shortInstructions:
      data.shortInstructions != null ? String(data.shortInstructions) : null,
    isActive: data.isActive !== false,
  };
}
