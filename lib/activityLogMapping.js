/**
 * Map Firestore exercise definitions into fields stored on user activity log entries (snapshot).
 */

import { deriveLogTypeFromCatalog } from '@/lib/exerciseConstants';

/**
 * @param {object} def normalized exercise row from the library (see exerciseNormalize)
 * @returns {Object} partial form / payload fields
 */
export function snapshotFromExerciseDefinition(def) {
  if (!def?.id) return {};
  const type =
    def.type === 'distance' || def.type === 'reps' || def.type === 'time'
      ? def.type
      : deriveLogTypeFromCatalog(def.typeOfExercise);
  return {
    source: 'firestore',
    exerciseId: def.id,
    name: def.name || '',
    type,
    typeOfExercise: def.typeOfExercise ?? null,
    intensity: def.intensity ?? null,
    met: def.met ?? null,
    kcalsPerHour80kg: def.kcalsPerHour80kg ?? null,
    category: def.category ?? null,
    shortInstructions: def.shortInstructions ?? null,
  };
}
