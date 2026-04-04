/** @typedef {'Cardiovascular'|'Strength'} ExerciseTypeOfExercise */
/** @typedef {'Light'|'Moderate'|'Strenuous'} ExerciseIntensity */

export const TYPE_OF_EXERCISE_VALUES = ['Cardiovascular', 'Strength'];
export const INTENSITY_VALUES = ['Light', 'Moderate', 'Strenuous'];

/**
 * Default logging mode when picking from catalog: Strength → reps, else time (cardio).
 * @param {string} [typeOfExercise]
 * @returns {'time'|'reps'}
 */
export function deriveLogTypeFromCatalog(typeOfExercise) {
  return typeOfExercise === 'Strength' ? 'reps' : 'time';
}
