import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
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
import { saveCompleteHealthProfile } from '@/services/userHealthProfileService';
import { useOnboardingNav } from '@/context/OnboardingNavContext';
import { onboardingLog } from '@/lib/onboardingDebug';
import { auth } from '@/lib/firebase';

const DASHBOARD_HREF = '/(tabs)';

const STEPS = 8;

const KCAL_MIN = 800;
const KCAL_MAX = 5000;
const WEEKS_MIN = 4;
const WEEKS_MAX = 104;

const useScrollForStep = (s) => s === 0 || s === 1 || s === 6 || s === STEPS - 1;

const rangeArr = (min, max) =>
  Array.from({ length: max - min + 1 }, (_, i) => min + i);

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
  const { user } = useAuth();
  const { notifyProfileSaved, gateRevision } = useOnboardingNav();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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
    const wks =
      totalKg < 0.05 ? 12 : Math.min(WEEKS_MAX, Math.max(WEEKS_MIN, Math.round(totalKg / 0.5)));
    return {
      proteinG: m.proteinG,
      carbsG: m.carbsG,
      fatG: m.fatG,
      weeks: wks,
      aiKcal: plan.kcal,
      tdee: plan.tdee,
    };
  }, [plan.kcal, plan.tdee, mainGoal, currentWeightKg, targetWeightKg]);

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

  const goNext = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    if (!user?.uid || saving) {
      onboardingLog('Save & continue ignored', { hasUid: !!user?.uid, saving });
      return;
    }
    setSaveError('');
    setSaving(true);
    onboardingLog('Save & continue pressed → save start', {
      contextUid: user.uid,
      authUid: auth.currentUser?.uid,
      gateRevisionBefore: gateRevision,
    });
    if (auth.currentUser?.uid && auth.currentUser.uid !== user.uid) {
      setSaveError('Session mismatch. Please sign out and sign in again.');
      setSaving(false);
      return;
    }
    try {
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
        dailyCaloriesTarget: macroKcal,
        goalTimelineWeeks: draft.weeks,
      });
      onboardingLog('Firebase save finished OK');
      notifyProfileSaved();
      onboardingLog('notifyProfileSaved; navigating →', DASHBOARD_HREF, {
        isProfileCompleteFirestore: true,
        userDocFlags: { profileCompleted: true, onboardingCompleted: true },
      });
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            try {
              router.replace(DASHBOARD_HREF);
              onboardingLog('navigation: router.replace → Dashboard', DASHBOARD_HREF);
            } catch (navErr) {
              onboardingLog('router.replace threw', navErr?.message || navErr);
              setSaveError(navErr?.message || 'Could not open the app home screen.');
            }
            resolve();
          });
        });
      });
    } catch (e) {
      const msg = e?.message || String(e);
      onboardingLog('save or nav failed', msg, e?.code);
      setSaveError(msg || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

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
    const kgPerWeek = draft.weeks > 0 ? Math.abs(deltaKg) / draft.weeks : 0;
    const goalEnd = new Date();
    goalEnd.setDate(goalEnd.getDate() + draft.weeks * 7);
    const goalMonth = goalEnd.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const paceLabel =
      Math.abs(deltaKg) < 0.05
        ? 'On track for maintenance'
        : mainGoal === MAIN_GOAL.LOSE_WEIGHT && deltaKg > 0
          ? `Lose ${kgPerWeek.toFixed(2)} kg/wk`
          : mainGoal === MAIN_GOAL.BUILD_MUSCLE && deltaKg < 0
            ? `Gain ${kgPerWeek.toFixed(2)} kg/wk`
            : deltaKg > 0
              ? `Lose ${kgPerWeek.toFixed(2)} kg/wk`
              : `Gain ${kgPerWeek.toFixed(2)} kg/wk`;
    const aiMacros = macrosFromCaloriesAndGoal(draft.aiKcal, mainGoal, currentWeightKg);
    const synced =
      draft.proteinG === aiMacros.proteinG &&
      draft.carbsG === aiMacros.carbsG &&
      draft.fatG === aiMacros.fatG;

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
              <Text style={styles.ringKcal}>{macroKcal.toLocaleString()}</Text>
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
            <Text style={styles.macroTotal}>Total: {macroKcal.toLocaleString()} kcal</Text>
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
              onPress={() =>
                updateDraft((d) => ({
                  ...d,
                  weeks: Math.max(WEEKS_MIN, d.weeks - 1),
                }))
              }
              activeOpacity={0.7}
            >
              <Text style={styles.adjSqLgTxt}>−</Text>
            </TouchableOpacity>
            <View style={styles.timelineMid}>
              <Text style={styles.timelineNum}>{draft.weeks}</Text>
              <Text style={styles.timelineUnit}>weeks</Text>
              <Text style={styles.timelineHint}>Balanced</Text>
            </View>
            <TouchableOpacity
              style={styles.adjSqLg}
              onPress={() =>
                updateDraft((d) => ({
                  ...d,
                  weeks: Math.min(WEEKS_MAX, d.weeks + 1),
                }))
              }
              activeOpacity={0.7}
            >
              <Text style={styles.adjSqLgTxt}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timelineBox}>
            <Text style={styles.timelineIco}>↘</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.timelinePace}>{paceLabel}</Text>
              <Text style={styles.timelineSub}>Goal reached by {goalMonth}</Text>
            </View>
            <View style={styles.timelineRight}>
              <Text style={styles.timelineRightTop}>{draft.weeks}w</Text>
              <Text style={styles.timelineRightSub}>{goalMonth.split(' ')[0]}</Text>
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
        {step > 0 ? (
          <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
            <ChevronLeft size={26} color={Colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <Text style={styles.stepInd}>
          {step + 1} / {STEPS}
        </Text>
        <View style={styles.backPlaceholder} />
      </View>

      {useScrollForStep(step) ? (
        <ScrollView
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
        {step < STEPS - 1 ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, saving && styles.primaryBtnDis]}
            onPress={() => {
              onboardingLog('Save & continue button onPress');
              void finish();
            }}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <Text style={styles.primaryBtnText}>Save & continue</Text>
            )}
          </TouchableOpacity>
        )}
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
    backBtn: { padding: 8 },
    backPlaceholder: { width: 42 },
    stepInd: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textTertiary,
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
    cardEmoji: { fontSize: 28 },
    cardTextCol: { flex: 1 },
    cardTitle: {
      fontSize: 17,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    cardSub: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-Regular',
      color: Colors.textTertiary,
      marginTop: 4,
    },
    radio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: Colors.border,
      alignItems: 'center',
      justifyContent: 'center',
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
      paddingBottom: Platform.OS === 'ios' ? 8 : 16,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
    },
    primaryBtn: {
      backgroundColor: Colors.textPrimary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
    },
    primaryBtnDis: { opacity: 0.6 },
    primaryBtnText: {
      fontSize: 17,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.onPrimary,
    },
  });
