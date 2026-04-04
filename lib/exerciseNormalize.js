import {
  TYPE_OF_EXERCISE_VALUES,
  INTENSITY_VALUES,
  deriveLogTypeFromCatalog,
} from '@/lib/exerciseConstants';

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
