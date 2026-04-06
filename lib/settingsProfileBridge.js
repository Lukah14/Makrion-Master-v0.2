import {
  MAIN_GOAL,
  ACTIVITY_LEVEL,
  activityLevelToLabel,
  mainGoalToAppGoalType,
} from '@/lib/healthProfile';

const LABEL_TO_ACTIVITY = {
  Sedentary: ACTIVITY_LEVEL.SEDENTARY,
  'Lightly Active': ACTIVITY_LEVEL.LIGHTLY_ACTIVE,
  'Moderately Active': ACTIVITY_LEVEL.MODERATELY_ACTIVE,
  'Very Active': ACTIVITY_LEVEL.VERY_ACTIVE,
  'Extremely Active': ACTIVITY_LEVEL.EXTREMELY_ACTIVE,
};

export function activityLabelToEnum(label) {
  if (!label) return ACTIVITY_LEVEL.MODERATELY_ACTIVE;
  return LABEL_TO_ACTIVITY[label] || ACTIVITY_LEVEL.MODERATELY_ACTIVE;
}

export function appGoalTypeToMainGoal(type) {
  const t = String(type || '').trim();
  if (t === 'Fat Loss') return MAIN_GOAL.LOSE_WEIGHT;
  if (t === 'Muscle Gain') return MAIN_GOAL.BUILD_MUSCLE;
  return MAIN_GOAL.MAINTAIN_WEIGHT;
}

export function sexUiToCanonical(s) {
  const x = String(s || '').toLowerCase();
  if (x === 'male' || x === 'm') return 'male';
  if (x === 'female' || x === 'f') return 'female';
  return 'other';
}

export function sexCanonicalToUi(s) {
  const x = String(s || '').toLowerCase();
  if (x === 'male') return 'Male';
  if (x === 'female') return 'Female';
  return 'Other';
}

export { activityLevelToLabel, mainGoalToAppGoalType, MAIN_GOAL, ACTIVITY_LEVEL };
