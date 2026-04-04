/**
 * Map legacy Firestore `type` values to the simplified editor model:
 * "time" | "distance" | "reps"
 */

export const SIMPLE_TYPES = ['time', 'distance', 'reps'];

export function editorTypeFromEntry(entry) {
  const t = entry?.type;
  if (t === 'time' || t === 'distance' || t === 'reps') return t;
  if (t === 'strength') return 'reps';
  if (t === 'cardio') {
    const dk = Number(entry?.distanceKm) || 0;
    const dm = Number(entry?.distanceMeters) || 0;
    if (dk > 0 || dm > 0) return 'distance';
    return 'time';
  }
  if (t === 'mixed') {
    const hasReps = (Number(entry?.sets) || 0) > 0 && (Number(entry?.repsPerSet) || Number(entry?.reps) || 0) > 0;
    const dk = Number(entry?.distanceKm) || 0;
    const dm = Number(entry?.distanceMeters) || 0;
    if (hasReps) return 'reps';
    if (dk > 0 || dm > 0) return 'distance';
    return 'time';
  }
  return 'time';
}

export function displayTypeLabel(type) {
  if (type === 'time') return 'Time';
  if (type === 'distance') return 'Distance';
  if (type === 'reps') return 'Reps';
  if (type === 'strength') return 'Reps';
  if (type === 'cardio') return 'Cardio';
  if (type === 'mixed') return 'Mixed';
  return type || 'Activity';
}
