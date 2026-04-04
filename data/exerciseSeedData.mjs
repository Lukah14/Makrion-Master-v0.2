/**
 * Small dev sample for Firestore `exercises` (new schema).
 * Bulk data: `data/exercisesFatsecretImport.json` + `npm run seed:exercises:bulk`
 */

export const EXERCISE_SEED_DATA = [
  {
    slug: 'sample-running-moderate',
    name: 'Running',
    typeOfExercise: 'Cardiovascular',
    intensity: 'Moderate',
    met: 9.8,
    kcalsPerHour80kg: 784,
  },
  {
    slug: 'sample-cycling-moderate',
    name: 'Cycling',
    typeOfExercise: 'Cardiovascular',
    intensity: 'Moderate',
    met: 7.5,
    kcalsPerHour80kg: 600,
  },
  {
    slug: 'sample-push-ups-moderate',
    name: 'Push-ups',
    typeOfExercise: 'Strength',
    intensity: 'Moderate',
    met: 3.8,
    kcalsPerHour80kg: 304,
  },
];
