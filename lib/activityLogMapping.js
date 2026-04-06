/**
 * Map Firestore exercise definitions into fields stored on user activity log entries (snapshot).
 */

/**
 * @param {object} def normalized exercise row from the library (see exerciseNormalize)
 * @returns {Object} partial form / payload fields
 */
export function snapshotFromExerciseDefinition(def) {
  if (!def?.id) return {};
  return {
    source: 'exercise_library',
    exerciseId: def.id,
    name: def.name || '',
    type: 'time',
    typeOfExercise: def.typeOfExercise ?? null,
    intensity: def.intensity ?? null,
    met: def.met != null ? String(def.met) : '',
    kcalsPerHour80kg: def.kcalsPerHour80kg != null ? String(def.kcalsPerHour80kg) : '',
    category: def.category ?? null,
    shortInstructions: def.shortInstructions ?? null,
  };
}
