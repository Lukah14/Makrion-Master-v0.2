import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  InteractionManager,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { signOutUser } from '@/services/authService';
import VerticalWheelPicker from '@/components/onboarding/VerticalWheelPicker';
import ProgressRing from '@/components/common/ProgressRing';
import {
  MAIN_GOAL,
  SEX,
  ACTIVITY_LEVEL,
  estimateTdee,
  calorieTargetFromGoal,
  macrosFromCaloriesAndGoal,
  kcalFromMacros,
  lbsToKg,
  kgToLbs,
  ftInToCm,
  cmToFtIn,
} from '@/lib/healthProfile';
import { computeFullHealthSync } from '@/lib/goalNutritionSync';
import { parseDateKey } from '@/lib/dateKey';
import { saveCompleteHealthProfile } from '@/services/userHealthProfileService';
import { useOnboardingNav } from '@/context/OnboardingNavContext';
import { onboardingLog, onboardingFlowLog } from '@/lib/onboardingDebug';
import { flowLog } from '@/lib/flowLog';
import { auth } from '@/lib/firebase';

const DASHBOARD_HREF = '/(tabs)';
/** Same href as NavigationGate — keep in sync with `app/_layout.jsx`. */
const LOGIN_HREF = '/(auth)/login';

const STEPS = 8;
/**
 * Defensive fallback for the step counter so it never renders "missing" /
 * "undefined" if minification ever drops the constant in a release build.
 */
const TOTAL_STEPS = STEPS || 8;

const KCAL_MIN = 800;
const KCAL_MAX = 5000;
const WEEKS_MIN = 4;
const WEEKS_MAX = 104;

const useScrollForStep = (s) => s === 0 || s === 1 || s === 6 || s === STEPS - 1;

const rangeArr = (min, max) =>
  Array.from({ length: max - min + 1 }, (_, i) => min + i);

/** Single canonical shape for nutrition + timeline (matches save → users/{uid}/profile/main). */
function buildCanonicalHealthInput({
  mainGoal,
  sex,
  age,
  heightCm,
  currentWeightKg,
  targetWeightKg,
  activityLevel,
  proteinG,
  carbsG,
  fatG,
  dailyCaloriesTarget,
}) {
  return {
    mainGoal,
    sex,
    age: Number(age),
    heightCm: Number(heightCm),
    currentWeightKg: Number(currentWeightKg),
    targetWeightKg: Number(targetWeightKg),
    activityLevel,
    proteinGoalG: Math.round(Number(proteinG)),
    carbsGoalG: Math.round(Number(carbsG)),
    fatGoalG: Math.round(Number(fatG)),
    dailyCaloriesTarget: Math.round(Number(dailyCaloriesTarget)),
  };
}

function formatGoalDateEnUS(dateKey) {
  if (!dateKey || typeof dateKey !== 'string') return null;
  try {
    const d = parseDateKey(dateKey);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return null;
  }
}

function formatWeeklyPaceLabel(expectedWeeklyChangeKg, deltaKg) {
  if (Math.abs(deltaKg) < 0.05) return 'On track for maintenance';
  const sw = expectedWeeklyChangeKg;
  if (sw == null || !Number.isFinite(sw)) return 'Adjust calories to refine pace';
  const v = Math.abs(sw);
  if (v < 0.02) return 'Near energy balance';
  if (sw < 0) return `Lose ${v.toFixed(2)} kg/wk`;
  return `Gain ${v.toFixed(2)} kg/wk`;
}

/** Slower timeline ≈ higher calories; faster ≈ lower (lose) or adjust surplus (gain). */
function calorieNudgeForTimeline(mainGoal, direction /* 'faster' | 'slower' */) {
  const slower = direction === 'slower';
  if (mainGoal === MAIN_GOAL.LOSE_WEIGHT) {
    return slower ? 50 : -50;
  }
  if (mainGoal === MAIN_GOAL.BUILD_MUSCLE) {
    return slower ? -40 : 40;
  }
  return slower ? 30 : -30;
}

const AGE_VALUES = rangeArr(14, 100);
const HEIGHT_CM_VALUES = rangeArr(120, 220);
const FT_VALUES = rangeArr(4, 7);
const INCH_VALUES = rangeArr(0, 11);
const WEIGHT_KG_VALUES = rangeArr(35, 200);
const WEIGHT_LB_VALUES = rangeArr(50, 440);

const GOAL_OPTIONS = [
  {
    id: MAIN_GOAL.LOSE_WEIGHT,
    emoji: '🔥',
    title: 'Lose Weight',
    subtitle: 'Burn fat with a calorie deficit',
  },
  {
    id: MAIN_GOAL.MAINTAIN_WEIGHT,
    emoji: '⚡',
    title: 'Maintain Weight',
    subtitle: 'Stay lean and improve health',
  },
  {
    id: MAIN_GOAL.BUILD_MUSCLE,
    emoji: '💪',
    title: 'Build Muscle',
    subtitle: 'Gain lean mass with a surplus',
  },
];

const ACTIVITY_OPTIONS = [
  { id: ACTIVITY_LEVEL.SEDENTARY, title: 'Sedentary', subtitle: 'Desk job, little or no exercise' },
  { id: ACTIVITY_LEVEL.LIGHTLY_ACTIVE, title: 'Lightly Active', subtitle: 'Light exercise 1–3 days/week' },
  { id: ACTIVITY_LEVEL.MODERATELY_ACTIVE, title: 'Moderately Active', subtitle: 'Moderate exercise 3–5 days/week' },
  { id: ACTIVITY_LEVEL.VERY_ACTIVE, title: 'Very Active', subtitle: 'Hard exercise 6–7 days/week' },
  { id: ACTIVITY_LEVEL.EXTREMELY_ACTIVE, title: 'Extremely Active', subtitle: 'Physical job + daily training' },
];

function UnitToggle({ left, right, value, onChange }) {
  const { colors: Colors } = useTheme();
  const s = toggleStyles(Colors);
  return (
    <View style={s.row}>
      <TouchableOpacity
        style={[s.pill, value === left.key && s.pillOn]}
        onPress={() => onChange(left.key)}
        activeOpacity={0.8}
      >
        <Text style={[s.txt, value === left.key && s.txtOn]}>{left.label}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.pill, value === right.key && s.pillOn]}
        onPress={() => onChange(right.key)}
        activeOpacity={0.8}
      >
        <Text style={[s.txt, value === right.key && s.txtOn]}>{right.label}</Text>
      </TouchableOpacity>
    </View>
  );
}

const toggleStyles = (Colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignSelf: 'center',
      backgroundColor: Colors.background,
      borderRadius: 24,
      padding: 4,
      marginBottom: 20,
      gap: 4,
    },
    pill: {
      paddingVertical: 10,
      paddingHorizontal: 22,
      borderRadius: 20,
    },
    pillOn: {
      backgroundColor: Colors.cardBackground,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    txt: {
      fontSize: 15,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textTertiary,
    },
    txtOn: {
      color: Colors.textPrimary,
    },
  });

export default function OnboardingWizard() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const pathname = usePathname();
  const { user } = useAuth();
  const { notifyProfileSaved, gateRevision } = useOnboardingNav();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [stepError, setStepError] = useState('');
  const [leavingToLogin, setLeavingToLogin] = useState(false);
  /** True after step-0 back requests sign-out; drives stuck-route fallback if gate does not replace. */
  const expectLogoutNavRef = useRef(false);
  /** Re-entrancy guard — prevents duplicate Firestore writes from rapid double-taps. */
  const submittingRef = useRef(false);
  /** Scrollable body container — used to scroll to top on validation errors. */
  const scrollRef = useRef(null);

  const [mainGoal, setMainGoal] = useState(MAIN_GOAL.LOSE_WEIGHT);
  const [sex, setSex] = useState(SEX.MALE);
  const [age, setAge] = useState(25);
  const [heightCm, setHeightCm] = useState(170);
  const [heightUnit, setHeightUnit] = useState('cm');
  const [currentWeightKg, setCurrentWeightKg] = useState(70);
  const [targetWeightKg, setTargetWeightKg] = useState(65);
  const [weightUnit, setWeightUnit] = useState('kg');
  const [activityLevel, setActivityLevel] = useState(ACTIVITY_LEVEL.MODERATELY_ACTIVE);

  const { ft, inch } = useMemo(() => cmToFtIn(heightCm), [heightCm]);

  const setFtIn = useCallback(
    (nextFt, nextIn) => {
      setHeightCm(Math.round(ftInToCm(nextFt, nextIn)));
    },
    [],
  );

  const displayWeightValues = weightUnit === 'kg' ? WEIGHT_KG_VALUES : WEIGHT_LB_VALUES;
  const displayCurrent =
    weightUnit === 'kg' ? currentWeightKg : Math.round(kgToLbs(currentWeightKg));
  const displayTarget =
    weightUnit === 'kg' ? targetWeightKg : Math.round(kgToLbs(targetWeightKg));

  const onDisplayCurrentChange = (v) => {
    setCurrentWeightKg(weightUnit === 'kg' ? v : Math.round(lbsToKg(v) * 10) / 10);
  };
  const onDisplayTargetChange = (v) => {
    setTargetWeightKg(weightUnit === 'kg' ? v : Math.round(lbsToKg(v) * 10) / 10);
  };

  const weightDiffPill = useMemo(() => {
    const d = currentWeightKg - targetWeightKg;
    if (Math.abs(d) < 0.05) return 'Same as current weight';
    if (mainGoal === MAIN_GOAL.LOSE_WEIGHT && d > 0) return `${d.toFixed(1)} kg to lose`;
    if (mainGoal === MAIN_GOAL.BUILD_MUSCLE && d < 0) return `${Math.abs(d).toFixed(1)} kg to gain`;
    if (d > 0) return `${d.toFixed(1)} kg to lose`;
    return `${Math.abs(d).toFixed(1)} kg to gain`;
  }, [currentWeightKg, targetWeightKg, mainGoal]);

  const plan = useMemo(() => {
    const tdee = estimateTdee({
      sex,
      weightKg: currentWeightKg,
      heightCm,
      age,
      activityLevel,
    });
    const kcal = calorieTargetFromGoal(mainGoal, tdee);
    const m = macrosFromCaloriesAndGoal(kcal, mainGoal, currentWeightKg);
    return { tdee, kcal, proteinG: m.proteinG, carbsG: m.carbsG, fatG: m.fatG };
  }, [sex, currentWeightKg, heightCm, age, activityLevel, mainGoal]);

  const planSeed = useMemo(() => {
    const m = macrosFromCaloriesAndGoal(plan.kcal, mainGoal, currentWeightKg);
    const totalKg = Math.abs(currentWeightKg - targetWeightKg);
    const canonical = buildCanonicalHealthInput({
      mainGoal,
      sex,
      age,
      heightCm,
      currentWeightKg,
      targetWeightKg,
      activityLevel,
      proteinG: m.proteinG,
      carbsG: m.carbsG,
      fatG: m.fatG,
      dailyCaloriesTarget: plan.kcal,
    });
    const s = computeFullHealthSync(canonical, 'recommend');
    let wks =
      s.goalTimelineWeeks != null
        ? Math.min(WEEKS_MAX, Math.max(WEEKS_MIN, s.goalTimelineWeeks))
        : null;
    if (wks == null) {
      wks =
        totalKg < 0.05 ? 12 : Math.min(WEEKS_MAX, Math.max(WEEKS_MIN, Math.round(totalKg / 0.5)));
    }
    return {
      proteinG: m.proteinG,
      carbsG: m.carbsG,
      fatG: m.fatG,
      weeks: wks,
      aiKcal: plan.kcal,
      tdee: plan.tdee,
    };
  }, [
    plan.kcal,
    plan.tdee,
    mainGoal,
    sex,
    age,
    heightCm,
    currentWeightKg,
    targetWeightKg,
    activityLevel,
  ]);

  const [summaryOverride, setSummaryOverride] = useState(null);
  const lastStepRef = useRef(step);

  useEffect(() => {
    if (step === STEPS - 1 && lastStepRef.current !== STEPS - 1) {
      setSummaryOverride(null);
    }
    lastStepRef.current = step;
  }, [step]);

  const draft = summaryOverride ?? planSeed;
  const macroKcal = kcalFromMacros(draft.proteinG, draft.carbsG, draft.fatG);

  /** Same pipeline as Firestore save — timeline + pace always track calories, macros, and biometrics. */
  const summarySync = useMemo(
    () =>
      computeFullHealthSync(
        buildCanonicalHealthInput({
          mainGoal,
          sex,
          age,
          heightCm,
          currentWeightKg,
          targetWeightKg,
          activityLevel,
          proteinG: draft.proteinG,
          carbsG: draft.carbsG,
          fatG: draft.fatG,
          dailyCaloriesTarget: macroKcal,
        }),
        'recommend',
      ),
    [
      mainGoal,
      sex,
      age,
      heightCm,
      currentWeightKg,
      targetWeightKg,
      activityLevel,
      draft.proteinG,
      draft.carbsG,
      draft.fatG,
      macroKcal,
    ],
  );

  const updateDraft = useCallback(
    (fn) => {
      setSummaryOverride((prev) => fn(prev ?? planSeed));
    },
    [planSeed],
  );

  const applyCalorieDelta = useCallback(
    (delta) => {
      const next = Math.max(KCAL_MIN, Math.min(KCAL_MAX, macroKcal + delta));
      const m = macrosFromCaloriesAndGoal(next, mainGoal, currentWeightKg);
      updateDraft((d) => ({
        ...d,
        proteinG: m.proteinG,
        carbsG: m.carbsG,
        fatG: m.fatG,
      }));
    },
    [macroKcal, mainGoal, currentWeightKg, updateDraft],
  );

  /** Clear inline step error whenever the user moves between steps. */
  useEffect(() => {
    setStepError('');
  }, [step]);

  /** Step &gt; 0: previous step. Step 0: sign out — NavigationGate replaces to login (avoids duplicate replace + Firestore watch races). */
  const handleBack = useCallback(async () => {
    if (saving || leavingToLogin) return;
    if (step > 0) {
      setStep((s) => Math.max(0, s - 1));
      return;
    }
    setLeavingToLogin(true);
    expectLogoutNavRef.current = true;
    onboardingFlowLog('onboarding: back — sign out (gate → login)');
    onboardingLog('onboarding: leaving for login screen');
    try {
      await new Promise((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      await signOutUser();
    } catch (e) {
      expectLogoutNavRef.current = false;
      onboardingLog('signOut failed (back to login)', e?.message || e);
      setLeavingToLogin(false);
      try {
        router.replace(LOGIN_HREF);
      } catch (navErr) {
        onboardingLog('replace login after signOut failure', navErr?.message || navErr);
      }
    }
  }, [step, saving, leavingToLogin]);

  useEffect(() => {
    if (!leavingToLogin) return;
    const path = typeof pathname === 'string' ? pathname : '';
    const onLoginRoute =
      /(^|\/)login$/.test(path) || (path.includes('(auth)') && path.includes('login'));
    if (onLoginRoute) setLeavingToLogin(false);
  }, [leavingToLogin, pathname]);

  /**
   * After sign-out, NavigationGate should replace to LOGIN_HREF. If the URL is still onboarding,
   * replace once (avoids competing with gate on the same tick as signOut).
   */
  useEffect(() => {
    if (!expectLogoutNavRef.current || user) return undefined;
    const path = typeof pathname === 'string' ? pathname : '';
    if (path.includes('login')) {
      expectLogoutNavRef.current = false;
      return undefined;
    }
    const t = setTimeout(() => {
      expectLogoutNavRef.current = false;
      try {
        router.replace(LOGIN_HREF);
      } catch (err) {
        onboardingLog('onboarding: signed-out stuck fallback', err?.message || err);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [user, pathname]);

  useFocusEffect(
    useCallback(() => {
      flowLog('ONBOARDING_SCREEN_OPENED');
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (saving || leavingToLogin) return true;
        void handleBack();
        return true;
      });
      return () => sub.remove();
    }, [handleBack, saving, leavingToLogin]),
  );

  /**
   * Validate only the fields required by the current step.
   * Returns '' when the step is valid; otherwise a user-friendly error message.
   */
  const validateStep = useCallback(
    (s) => {
      if (s === 0) {
        if (
          mainGoal !== MAIN_GOAL.LOSE_WEIGHT &&
          mainGoal !== MAIN_GOAL.MAINTAIN_WEIGHT &&
          mainGoal !== MAIN_GOAL.BUILD_MUSCLE
        ) {
          return 'Please pick a main goal to continue.';
        }
        return '';
      }
      if (s === 1) {
        if (sex !== SEX.MALE && sex !== SEX.FEMALE) {
          return 'Please select your biological sex.';
        }
        return '';
      }
      if (s === 2) {
        const n = Number(age);
        if (!Number.isFinite(n) || n < 14 || n > 100) {
          return 'Please enter an age between 14 and 100.';
        }
        return '';
      }
      if (s === 3) {
        const n = Number(heightCm);
        if (!Number.isFinite(n) || n < 120 || n > 220) {
          return 'Please set a height between 120 cm and 220 cm.';
        }
        return '';
      }
      if (s === 4) {
        const n = Number(currentWeightKg);
        if (!Number.isFinite(n) || n < 30 || n > 300) {
          return 'Please set a valid current weight.';
        }
        return '';
      }
      if (s === 5) {
        const n = Number(targetWeightKg);
        if (!Number.isFinite(n) || n < 30 || n > 300) {
          return 'Please set a valid target weight.';
        }
        return '';
      }
      if (s === 6) {
        const allowed = Object.values(ACTIVITY_LEVEL);
        if (!allowed.includes(activityLevel)) {
          return 'Please choose an activity level.';
        }
        return '';
      }
      if (s === STEPS - 1) {
        if (
          !Number.isFinite(Number(draft.proteinG)) ||
          !Number.isFinite(Number(draft.carbsG)) ||
          !Number.isFinite(Number(draft.fatG)) ||
          draft.proteinG <= 0 ||
          draft.fatG <= 0 ||
          draft.carbsG < 0
        ) {
          return 'Macros look invalid. Adjust your plan before saving.';
        }
        const kcal = kcalFromMacros(draft.proteinG, draft.carbsG, draft.fatG);
        if (!Number.isFinite(kcal) || kcal < KCAL_MIN || kcal > KCAL_MAX) {
          return `Calories must be between ${KCAL_MIN} and ${KCAL_MAX} kcal.`;
        }
        return '';
      }
      return '';
    },
    [mainGoal, sex, age, heightCm, currentWeightKg, targetWeightKg, activityLevel, draft],
  );

  /** Scroll body to top so the inline error is visible on screen. */
  const scrollBodyToTop = useCallback(() => {
    try {
      scrollRef.current?.scrollTo?.({ y: 0, animated: true });
    } catch {
      // no-op: non-scrollable steps render a View wrapper.
    }
  }, []);

  const finish = async () => {
    onboardingFlowLog('submit started: finish()');
    if (submittingRef.current) {
      onboardingFlowLog('submit aborted: re-entrant tap while save in flight');
      return;
    }
    if (!user?.uid || saving) {
      onboardingFlowLog('submit aborted: no uid or already saving', {
        hasUid: !!user?.uid,
        saving,
      });
      onboardingLog('Save & continue ignored', { hasUid: !!user?.uid, saving });
      return;
    }
    if (!auth.currentUser?.uid) {
      const msg = 'Not signed in. Please sign in and try again.';
      onboardingFlowLog('submit aborted: auth.currentUser missing');
      setSaveError(msg);
      return;
    }
    if (auth.currentUser.uid !== user.uid) {
      onboardingFlowLog('submit aborted: uid mismatch', {
        authUid: auth.currentUser.uid,
        contextUid: user.uid,
      });
      setSaveError('Session mismatch. Please sign out and sign in again.');
      return;
    }

    /** Full-payload validation before hitting Firestore. */
    const fullPayloadError =
      validateStep(0) ||
      validateStep(1) ||
      validateStep(2) ||
      validateStep(3) ||
      validateStep(4) ||
      validateStep(5) ||
      validateStep(6) ||
      validateStep(STEPS - 1);
    if (fullPayloadError) {
      onboardingFlowLog('submit aborted: final validation failed', fullPayloadError);
      setSaveError(fullPayloadError);
      return;
    }

    submittingRef.current = true;
    setSaveError('');
    setStepError('');
    flowLog('LOADING_SET_TRUE', { scope: 'onboarding_save_button' });
    setSaving(true);
    onboardingFlowLog('auth ok, write starting', { uid: user.uid });
    onboardingLog('A) Save & continue pressed — submit start', {
      uid: user.uid,
      authUid: auth.currentUser?.uid,
      gateRevisionBefore: gateRevision,
    });

    try {
      flowLog('PROFILE_SAVE_START', { uid: user.uid });
      onboardingFlowLog('Firestore write: saveCompleteHealthProfile');
      onboardingLog('B) Firestore write: saveCompleteHealthProfile (users/{uid} + profile/main)');
      const saveKcal = kcalFromMacros(draft.proteinG, draft.carbsG, draft.fatG);
      const saveCanonical = buildCanonicalHealthInput({
        mainGoal,
        sex,
        age,
        heightCm,
        currentWeightKg,
        targetWeightKg,
        activityLevel,
        proteinG: draft.proteinG,
        carbsG: draft.carbsG,
        fatG: draft.fatG,
        dailyCaloriesTarget: saveKcal,
      });
      const saveSync = computeFullHealthSync(saveCanonical, 'recommend');
      await saveCompleteHealthProfile(user.uid, {
        mainGoal,
        sex,
        age,
        heightCm,
        currentWeightKg,
        targetWeightKg,
        activityLevel,
        proteinGoalG: draft.proteinG,
        carbsGoalG: draft.carbsG,
        fatGoalG: draft.fatG,
        dailyCaloriesTarget: saveKcal,
        goalTimelineWeeks: saveSync.goalTimelineWeeks ?? draft.weeks,
        preferencesUnits: heightUnit === 'ft' || weightUnit === 'lbs' ? 'imperial' : 'metric',
      });
      onboardingFlowLog('Firestore write succeeded');
      onboardingLog('C) Firestore write succeeded — profileCompleted / onboarding flags written');
    } catch (e) {
      const msg = e?.message || String(e);
      flowLog('PROFILE_SAVE_FAILED', { uid: user.uid, code: e?.code, message: msg });
      onboardingFlowLog('WRITE FAILED (staying on onboarding)', e?.code, msg);
      onboardingLog('WRITE FAILED (do not navigate)', msg, e?.code);
      setSaveError(msg || 'Could not save your profile.');
      flowLog('LOADING_SET_FALSE', { scope: 'onboarding_save_button', reason: 'save_error' });
      setSaving(false);
      submittingRef.current = false;
      return;
    }

    try {
      onboardingFlowLog('completion flag set locally: notifyProfileSaved()');
      onboardingLog('D) Local complete: notifyProfileSaved (no Firestore read required)');
      notifyProfileSaved();

      onboardingFlowLog('navigating to dashboard (backup router.replace after microtask)');
      onboardingLog(
        'E) Navigate to dashboard — gate + router.replace; listener may lag',
      );
      await new Promise((resolve) => {
        setTimeout(() => {
          try {
            flowLog('NAVIGATE_DASHBOARD', { from: 'OnboardingWizard', href: DASHBOARD_HREF });
            router.replace(DASHBOARD_HREF);
            onboardingFlowLog('router.replace executed →', DASHBOARD_HREF);
            onboardingLog('F) router.replace →', DASHBOARD_HREF);
          } catch (navErr) {
            flowLog('NAVIGATE_DASHBOARD_FAILED', String(navErr?.message || navErr));
            onboardingFlowLog('NAV FAILED (write already OK)', navErr?.message || navErr);
            onboardingLog('NAV FAILED (write already OK)', navErr?.message || navErr);
            setSaveError(navErr?.message || 'Could not open the app home screen.');
          }
          resolve();
        }, 0);
      });
    } catch (e) {
      flowLog('POST_SAVE_UNEXPECTED', String(e?.message || e));
      onboardingFlowLog('post-write unexpected', e?.message || e);
      onboardingLog('post-write unexpected', e?.message || e);
      setSaveError(e?.message || 'Could not continue.');
    } finally {
      flowLog('LOADING_SET_FALSE', { scope: 'onboarding_save_button', reason: 'finish_finally' });
      setSaving(false);
      submittingRef.current = false;
    }
  };

  /**
   * Single entry-point for the footer button across every step.
   * - Validates the current step first and shows an inline error when invalid.
   * - On all steps except the last, advances to the next step.
   * - On the last step, awaits Firestore save before navigating to the dashboard.
   * Relies on `submittingRef` + `saving` to block double-taps and duplicate writes.
   */
  const handleContinue = useCallback(() => {
    if (saving || submittingRef.current || leavingToLogin) return;

    const err = validateStep(step);
    if (err) {
      setStepError(err);
      scrollBodyToTop();
      return;
    }
    setStepError('');

    if (step < STEPS - 1) {
      flowLog('ONBOARDING_STEP_NEXT', { from: step, to: step + 1 });
      setStep((s) => Math.min(STEPS - 1, s + 1));
      return;
    }

    flowLog('SAVE_AND_CONTINUE_PRESSED', 'handleContinue');
    onboardingFlowLog('button pressed: Save & continue (handleContinue)');
    onboardingLog('handleContinue → finish()');
    void finish();
  }, [saving, leavingToLogin, step, validateStep, scrollBodyToTop, finish]);

  const renderRadioCard = (selected, onSelect, children) => (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardOn]}
      onPress={onSelect}
      activeOpacity={0.75}
    >
      <View style={styles.cardLeft}>{children}</View>
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </TouchableOpacity>
  );

  let body = null;

  if (step === 0) {
    body = (
      <>
        <Text style={styles.title}>What&apos;s your main goal?</Text>
        {GOAL_OPTIONS.map((g) => (
          <View key={g.id}>
            {renderRadioCard(
              mainGoal === g.id,
              () => setMainGoal(g.id),
              <>
                <Text style={styles.cardEmoji}>{g.emoji}</Text>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTitle}>{g.title}</Text>
                  <Text style={styles.cardSub}>{g.subtitle}</Text>
                </View>
              </>,
            )}
          </View>
        ))}
      </>
    );
  } else if (step === 1) {
    body = (
      <>
        <Text style={styles.title}>What&apos;s your biological sex?</Text>
        <View style={styles.sexRow}>
          <TouchableOpacity
            style={[styles.sexCard, sex === SEX.MALE && styles.sexCardOn]}
            onPress={() => setSex(SEX.MALE)}
            activeOpacity={0.8}
          >
            <View style={[styles.sexIcon, { backgroundColor: '#3B82F6' }]}>
              <Text style={styles.sexSym}>♂</Text>
            </View>
            <Text style={styles.sexLabel}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sexCard, sex === SEX.FEMALE && styles.sexCardOn]}
            onPress={() => setSex(SEX.FEMALE)}
            activeOpacity={0.8}
          >
            <View style={[styles.sexIcon, { backgroundColor: '#EC4899' }]}>
              <Text style={styles.sexSym}>♀</Text>
            </View>
            <Text style={styles.sexLabel}>Female</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  } else if (step === 2) {
    body = (
      <>
        <Text style={styles.title}>How old are you?</Text>
        <VerticalWheelPicker values={AGE_VALUES} value={age} onChange={setAge} suffix="yrs" />
      </>
    );
  } else if (step === 3) {
    body = (
      <>
        <Text style={styles.title}>What&apos;s your height?</Text>
        <UnitToggle
          left={{ key: 'cm', label: 'cm' }}
          right={{ key: 'ft', label: 'ft' }}
          value={heightUnit}
          onChange={setHeightUnit}
        />
        {heightUnit === 'cm' ? (
          <VerticalWheelPicker
            values={HEIGHT_CM_VALUES}
            value={heightCm}
            onChange={setHeightCm}
            suffix="cm"
          />
        ) : (
          <View style={styles.dualPick}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dualLabel}>ft</Text>
              <VerticalWheelPicker
                values={FT_VALUES}
                value={ft}
                onChange={(nf) => setFtIn(nf, inch)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dualLabel}>in</Text>
              <VerticalWheelPicker
                values={INCH_VALUES}
                value={inch}
                onChange={(ni) => setFtIn(ft, ni)}
              />
            </View>
          </View>
        )}
      </>
    );
  } else if (step === 4) {
    body = (
      <>
        <Text style={styles.title}>Current weight?</Text>
        <UnitToggle
          left={{ key: 'kg', label: 'kg' }}
          right={{ key: 'lbs', label: 'lbs' }}
          value={weightUnit}
          onChange={setWeightUnit}
        />
        <VerticalWheelPicker
          values={displayWeightValues}
          value={displayCurrent}
          onChange={onDisplayCurrentChange}
          suffix={weightUnit}
        />
      </>
    );
  } else if (step === 5) {
    body = (
      <>
        <Text style={styles.title}>Target weight?</Text>
        <UnitToggle
          left={{ key: 'kg', label: 'kg' }}
          right={{ key: 'lbs', label: 'lbs' }}
          value={weightUnit}
          onChange={setWeightUnit}
        />
        <VerticalWheelPicker
          values={displayWeightValues}
          value={displayTarget}
          onChange={onDisplayTargetChange}
          suffix={weightUnit}
        />
        <View style={styles.pill}>
          <Text style={styles.pillText}>{weightDiffPill}</Text>
        </View>
      </>
    );
  } else if (step === 6) {
    body = (
      <>
        <Text style={styles.title}>Activity level?</Text>
        {ACTIVITY_OPTIONS.map((a) => (
          <View key={a.id}>
            {renderRadioCard(
              activityLevel === a.id,
              () => setActivityLevel(a.id),
              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>{a.title}</Text>
                <Text style={styles.cardSub}>{a.subtitle}</Text>
              </View>,
            )}
          </View>
        ))}
      </>
    );
  } else {
    const ringProg = Math.min(1, Math.max(0, macroKcal / (draft.tdee || 1)));
    const pK = draft.proteinG * 4;
    const cK = draft.carbsG * 4;
    const fK = draft.fatG * 9;
    const deltaKg = currentWeightKg - targetWeightKg;
    const rawWeeks = summarySync.goalTimelineWeeks;
    const displayWeeks =
      rawWeeks != null ? Math.min(WEEKS_MAX, Math.max(WEEKS_MIN, rawWeeks)) : null;
    const goalMonth =
      formatGoalDateEnUS(summarySync.estimatedGoalDate) ??
      '—';
    const paceLabel = formatWeeklyPaceLabel(summarySync.expectedWeeklyChangeKg, deltaKg);
    const splitAtKcal = macrosFromCaloriesAndGoal(macroKcal, mainGoal, currentWeightKg);
    const synced =
      Math.abs(draft.proteinG - splitAtKcal.proteinG) <= 1 &&
      Math.abs(draft.carbsG - splitAtKcal.carbsG) <= 1 &&
      Math.abs(draft.fatG - splitAtKcal.fatG) <= 1;

    body = (
      <>
        <View style={styles.summaryHead}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text style={styles.summaryTitle}>Your plan is ready!</Text>
          <Text style={styles.summarySub}>Customize each section below.</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.cardHeadRow}>
            <Text style={[styles.summaryLabel, styles.summaryLabelNoMb]}>DAILY CALORIE TARGET</Text>
            <View style={styles.editableBadge}>
              <Text style={styles.editableBadgeTxt}>Editable</Text>
            </View>
          </View>
          <View style={styles.ringRow}>
            <TouchableOpacity
              style={styles.adjSq}
              onPress={() => applyCalorieDelta(-50)}
              disabled={macroKcal <= KCAL_MIN}
              activeOpacity={0.7}
            >
              <Text style={styles.adjSqTxt}>−</Text>
            </TouchableOpacity>
            <ProgressRing radius={44} strokeWidth={8} progress={ringProg} color={Colors.textPrimary}>
              <Text style={styles.ringKcal}>{macroKcal.toLocaleString('en-US')}</Text>
            </ProgressRing>
            <TouchableOpacity
              style={styles.adjSq}
              onPress={() => applyCalorieDelta(50)}
              disabled={macroKcal >= KCAL_MAX}
              activeOpacity={0.7}
            >
              <Text style={styles.adjSqTxt}>+</Text>
            </TouchableOpacity>
            <View style={styles.ringSide}>
              <Text style={styles.ringUnit}>kcal / day</Text>
              <Text style={styles.ringHint}>From your macros (4·P + 4·C + 9·F)</Text>
            </View>
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderEdge}>{KCAL_MIN.toLocaleString()}</Text>
            <Text style={styles.sliderEdge}>{KCAL_MAX.toLocaleString()} kcal</Text>
          </View>
          <View style={styles.recPill}>
            <Text style={styles.recPillText}>
              ✓ AI recommended: {draft.aiKcal.toLocaleString()} kcal
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.cardHeadRow}>
            <Text style={[styles.summaryLabel, styles.summaryLabelNoMb]}>MACROS</Text>
            <View style={styles.editableBadge}>
              <Text style={styles.editableBadgeTxt}>Editable</Text>
            </View>
          </View>
          <View style={styles.macroEditRow}>
            <View style={[styles.mDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.macroName}>Protein</Text>
            <TouchableOpacity
              style={styles.adjSqSm}
              onPress={() =>
                updateDraft((d) => ({
                  ...d,
                  proteinG: Math.max(20, d.proteinG - 2),
                }))
              }
              activeOpacity={0.7}
            >
              <Text style={styles.adjSqTxt}>−</Text>
            </TouchableOpacity>
            <Text style={styles.macroVal}>{draft.proteinG}g</Text>
            <TouchableOpacity
              style={styles.adjSqSm}
              onPress={() =>
                updateDraft((d) => ({
                  ...d,
                  proteinG: Math.min(350, d.proteinG + 2),
                }))
              }
              activeOpacity={0.7}
            >
              <Text style={styles.adjSqTxt}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.macroEditRow}>
            <View style={[styles.mDot, { backgroundColor: '#EAB308' }]} />
            <Text style={styles.macroName}>Carbs</Text>
            <TouchableOpacity
              style={styles.adjSqSm}
              onPress={() =>
                updateDraft((d) => ({
                  ...d,
                  carbsG: Math.max(0, d.carbsG - 5),
                }))
              }
              activeOpacity={0.7}
            >
              <Text style={styles.adjSqTxt}>−</Text>
            </TouchableOpacity>
            <Text style={styles.macroVal}>{draft.carbsG}g</Text>
            <TouchableOpacity
              style={styles.adjSqSm}
              onPress={() =>
                updateDraft((d) => ({
                  ...d,
                  carbsG: Math.min(600, d.carbsG + 5),
                }))
              }
              activeOpacity={0.7}
            >
              <Text style={styles.adjSqTxt}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.macroEditRow}>
            <View style={[styles.mDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.macroName}>Fat</Text>
            <TouchableOpacity
              style={styles.adjSqSm}
              onPress={() =>
                updateDraft((d) => ({
                  ...d,
                  fatG: Math.max(15, d.fatG - 2),
                }))
              }
              activeOpacity={0.7}
            >
              <Text style={styles.adjSqTxt}>−</Text>
            </TouchableOpacity>
            <Text style={styles.macroVal}>{draft.fatG}g</Text>
            <TouchableOpacity
              style={styles.adjSqSm}
              onPress={() =>
                updateDraft((d) => ({
                  ...d,
                  fatG: Math.min(200, d.fatG + 2),
                }))
              }
              activeOpacity={0.7}
            >
              <Text style={styles.adjSqTxt}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.macroBar}>
            <View style={[styles.macroSeg, { flex: pK, backgroundColor: '#EF4444' }]} />
            <View style={[styles.macroSeg, { flex: cK, backgroundColor: '#EAB308' }]} />
            <View style={[styles.macroSeg, { flex: fK, backgroundColor: '#3B82F6' }]} />
          </View>
          <View style={styles.macroFooter}>
            <Text style={styles.macroTotal}>Total: {macroKcal.toLocaleString('en-US')} kcal</Text>
            <Text style={[styles.macroSync, { color: synced ? Colors.success : Colors.textTertiary }]}>
              {synced ? '• Synced' : '• Custom'}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.cardHeadRow}>
            <Text style={[styles.summaryLabel, styles.summaryLabelNoMb]}>GOAL TIMELINE</Text>
            <View style={styles.editableBadge}>
              <Text style={styles.editableBadgeTxt}>Editable</Text>
            </View>
          </View>
          <View style={styles.timelineRow}>
            <TouchableOpacity
              style={styles.adjSqLg}
              onPress={() => applyCalorieDelta(calorieNudgeForTimeline(mainGoal, 'faster'))}
              activeOpacity={0.7}
            >
              <Text style={styles.adjSqLgTxt}>−</Text>
            </TouchableOpacity>
            <View style={styles.timelineMid}>
              <Text style={styles.timelineNum}>
                {displayWeeks != null ? String(displayWeeks) : '—'}
              </Text>
              <Text style={styles.timelineUnit}>weeks</Text>
              <Text style={styles.timelineHint}>From TDEE and calories</Text>
            </View>
            <TouchableOpacity
              style={styles.adjSqLg}
              onPress={() => applyCalorieDelta(calorieNudgeForTimeline(mainGoal, 'slower'))}
              activeOpacity={0.7}
            >
              <Text style={styles.adjSqLgTxt}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timelineBox}>
            <Text style={styles.timelineIco}>↘</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.timelinePace}>{paceLabel}</Text>
              <Text style={styles.timelineSub}>
                {summarySync.estimatedGoalDate
                  ? `Goal reached by ${goalMonth}`
                  : 'Adjust your calorie target to see an estimated date'}
              </Text>
            </View>
            <View style={styles.timelineRight}>
              <Text style={styles.timelineRightTop}>
                {displayWeeks != null ? `${displayWeeks}w` : '—'}
              </Text>
              <Text style={styles.timelineRightSub}>
                {goalMonth !== '—' ? goalMonth.split(' ')[0] : '—'}
              </Text>
            </View>
          </View>
        </View>

        {saveError ? <Text style={styles.err}>{saveError}</Text> : null}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => void handleBack()}
          style={[styles.backBtn, (saving || leavingToLogin) && styles.backBtnDisabled]}
          hitSlop={12}
          disabled={saving || leavingToLogin}
          accessibilityRole="button"
          accessibilityLabel={step > 0 ? 'Back' : 'Back to sign in'}
        >
          {leavingToLogin ? (
            <ActivityIndicator size="small" color={Colors.textPrimary} />
          ) : (
            <ChevronLeft size={26} color={Colors.textPrimary} />
          )}
        </TouchableOpacity>
        <Text
          style={styles.stepInd}
          allowFontScaling={false}
          accessibilityLabel={`Step ${step + 1} of ${TOTAL_STEPS}`}
        >
          {`${step + 1} / ${TOTAL_STEPS}`}
        </Text>
        <View style={styles.backPlaceholder} />
      </View>

      {useScrollForStep(step) ? (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={styles.scrollFill}>
          <View style={styles.scrollContent}>{body}</View>
        </View>
      )}

      <View style={styles.footer}>
        {stepError ? (
          <Text style={styles.err} accessibilityLiveRegion="polite">
            {stepError}
          </Text>
        ) : null}
        {(() => {
          const isLast = step === STEPS - 1;
          const disabled = saving || leavingToLogin;
          const label = isLast
            ? (saving ? 'Saving…' : 'Save & Continue')
            : 'Continue';
          return (
            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.primaryBtnSaving, disabled && !saving && styles.primaryBtnDisabled]}
              onPress={handleContinue}
              disabled={disabled}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ disabled, busy: saving }}
              accessibilityLabel={label}
            >
              {saving ? (
                <View style={styles.primaryBtnInner}>
                  <ActivityIndicator
                    color={Colors.onPrimary}
                    style={styles.primaryBtnSpinner}
                  />
                  <Text
                    style={styles.primaryBtnText}
                    allowFontScaling={false}
                  >
                    {label}
                  </Text>
                </View>
              ) : (
                <Text
                  style={styles.primaryBtnText}
                  allowFontScaling={false}
                >
                  {label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })()}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (Colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingBottom: 8,
    },
    backBtn: { padding: 8, minWidth: 42, alignItems: 'center', justifyContent: 'center' },
    backBtnDisabled: { opacity: 0.45 },
    backPlaceholder: { width: 42 },
    stepInd: {
      fontSize: 13,
      lineHeight: 18,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textTertiary,
      textAlign: 'center',
      textAlignVertical: 'center',
      includeFontPadding: true,
      minWidth: 60,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 22,
      paddingBottom: 24,
    },
    title: {
      fontSize: 26,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
      marginBottom: 22,
      lineHeight: 32,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.cardBackground,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
    },
    cardOn: {
      borderColor: Colors.textPrimary,
    },
    cardLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cardEmoji: { fontSize: 28, flexShrink: 0 },
    cardTextCol: { flex: 1, minWidth: 0 },
    cardTitle: {
      fontSize: 17,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
      flexShrink: 1,
    },
    cardSub: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-Regular',
      color: Colors.textTertiary,
      marginTop: 4,
      flexShrink: 1,
    },
    radio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: Colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginLeft: 8,
    },
    radioOn: {
      borderColor: Colors.textPrimary,
    },
    radioDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: Colors.textPrimary,
    },
    sexRow: { flexDirection: 'row', gap: 12 },
    sexCard: {
      flex: 1,
      backgroundColor: Colors.cardBackground,
      borderRadius: 18,
      paddingVertical: 28,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: Colors.border,
    },
    sexCardOn: {
      borderColor: Colors.textPrimary,
    },
    sexIcon: {
      width: 56,
      height: 56,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    sexSym: { fontSize: 28, color: '#FFFFFF' },
    sexLabel: {
      fontSize: 17,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    dualPick: { flexDirection: 'row', gap: 12 },
    dualLabel: {
      textAlign: 'center',
      fontSize: 12,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textTertiary,
      marginBottom: 6,
    },
    pill: {
      alignSelf: 'center',
      marginTop: 20,
      backgroundColor: Colors.border + '66',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
    },
    pillText: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textPrimary,
    },
    summaryHead: { alignItems: 'center', marginBottom: 20 },
    checkCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: Colors.textPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    checkMark: { color: Colors.onPrimary, fontSize: 26, fontWeight: '700' },
    summaryTitle: {
      fontSize: 22,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    summarySub: {
      fontSize: 14,
      color: Colors.textTertiary,
      marginTop: 6,
      fontFamily: 'PlusJakartaSans-Regular',
    },
    summaryCard: {
      backgroundColor: Colors.cardBackground,
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
    },
    summaryLabel: {
      fontSize: 11,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textTertiary,
      letterSpacing: 0.8,
      marginBottom: 14,
    },
    summaryLabelNoMb: { marginBottom: 0 },
    cardHeadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    editableBadge: {
      backgroundColor: Colors.border + '66',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    editableBadgeTxt: {
      fontSize: 11,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textTertiary,
    },
    scrollFill: { flex: 1 },
    ringRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    adjSq: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: Colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    adjSqSm: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: Colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    adjSqTxt: {
      fontSize: 20,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
      marginTop: -2,
    },
    adjSqLg: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: Colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    adjSqLgTxt: {
      fontSize: 24,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
      marginTop: -2,
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingHorizontal: 2,
    },
    sliderEdge: {
      fontSize: 11,
      fontFamily: 'PlusJakartaSans-Medium',
      color: Colors.textTertiary,
    },
    macroEditRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      gap: 8,
    },
    macroBar: {
      flexDirection: 'row',
      height: 10,
      borderRadius: 5,
      overflow: 'hidden',
      marginTop: 10,
    },
    macroSeg: { minWidth: 2 },
    macroFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Colors.border,
    },
    macroTotal: {
      fontSize: 15,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    macroSync: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold' },
    timelineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      marginBottom: 14,
    },
    timelineMid: { alignItems: 'center', minWidth: 110 },
    timelineNum: {
      fontSize: 34,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    timelineUnit: {
      fontSize: 15,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textPrimary,
    },
    timelineHint: {
      fontSize: 12,
      color: Colors.textTertiary,
      marginTop: 4,
      fontFamily: 'PlusJakartaSans-Regular',
    },
    timelineBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.background,
      borderRadius: 14,
      padding: 14,
      gap: 12,
    },
    timelineIco: { fontSize: 20, color: Colors.textSecondary },
    timelinePace: {
      fontSize: 15,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    timelineSub: {
      fontSize: 12,
      color: Colors.textTertiary,
      marginTop: 4,
      fontFamily: 'PlusJakartaSans-Regular',
    },
    timelineRight: { alignItems: 'flex-end' },
    timelineRightTop: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    timelineRightSub: {
      fontSize: 11,
      color: Colors.textTertiary,
      marginTop: 2,
      fontFamily: 'PlusJakartaSans-Regular',
    },
    ringKcal: {
      fontSize: 15,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    ringSide: { flex: 1 },
    ringUnit: {
      fontSize: 16,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textPrimary,
    },
    ringHint: {
      fontSize: 12,
      color: Colors.textTertiary,
      marginTop: 4,
    },
    recPill: {
      marginTop: 14,
      backgroundColor: Colors.successLight,
      padding: 10,
      borderRadius: 10,
    },
    recPillText: {
      fontSize: 12,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.success,
      textAlign: 'center',
    },
    macroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      gap: 10,
    },
    mDot: { width: 10, height: 10, borderRadius: 5 },
    macroName: {
      flex: 1,
      fontSize: 15,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textPrimary,
    },
    macroVal: {
      fontSize: 15,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    err: {
      color: Colors.error,
      textAlign: 'center',
      marginTop: 8,
      fontFamily: 'PlusJakartaSans-Medium',
    },
    footer: {
      paddingHorizontal: 22,
      paddingBottom: 24,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
    },
    /**
     * Tall enough on Android release builds that the TextView can render the
     * full bold glyph + descenders without clipping. We deliberately do not use
     * `alignItems: 'stretch'` here — stretching the inner row to the button's
     * minHeight forces Android to compress the Text node and chops the label
     * vertically once a custom font is loaded.
     */
    primaryBtn: {
      backgroundColor: Colors.textPrimary,
      borderRadius: 16,
      paddingVertical: 18,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 60,
    },
    /** Do not dim the whole button (opacity hid label + looked “broken” with spinner-only). */
    primaryBtnSaving: {
      opacity: 1,
      borderWidth: 2,
      borderColor: Colors.onPrimary + '55',
    },
    primaryBtnDisabled: {
      opacity: 0.5,
    },
    primaryBtnInner: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnSpinner: { marginRight: 10 },
    /**
     * Android release-build text measurement quirk: with a custom Bold font,
     * Android sometimes measures a Text node 1–2px narrower than the glyphs
     * actually render, which clips the trailing character ("Continue" → "Continu").
     * Mitigations applied here:
     *   - generous lineHeight so descenders are never vertically cropped,
     *   - includeFontPadding kept false (correct for custom fonts),
     *   - no flexShrink so the Text dictates its own natural width,
     *   - the JSX above places this Text as a direct child of the centered
     *     TouchableOpacity (when not saving), which is the safest layout for
     *     Android release builds.
     */
    primaryBtnText: {
      fontSize: 17,
      lineHeight: 28,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.onPrimary,
      textAlign: 'center',
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
  });
