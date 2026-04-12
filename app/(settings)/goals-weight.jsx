import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/hooks/useUser';
import { getMainHealthProfile } from '@/services/userHealthProfileService';
import { syncUserHealthGoals, mergeCanonicalHealthInput } from '@/services/userGoalSyncService';
import { computeFullHealthSync } from '@/lib/goalNutritionSync';
import { appGoalTypeToMainGoal, MAIN_GOAL } from '@/lib/settingsProfileBridge';
import { validateWeightKg } from '@/lib/settingsValidation';
import { parseDateKey } from '@/lib/dateKey';

const GOAL_OPTIONS = [
  { id: MAIN_GOAL.LOSE_WEIGHT, label: 'Lose weight' },
  { id: MAIN_GOAL.MAINTAIN_WEIGHT, label: 'Maintain weight' },
  { id: MAIN_GOAL.BUILD_MUSCLE, label: 'Build muscle' },
];

function formatGoalDate(dateKey) {
  if (!dateKey || typeof dateKey !== 'string') return '—';
  try {
    const d = parseDateKey(dateKey.slice(0, 10));
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric', day: 'numeric' });
  } catch {
    return dateKey;
  }
}

export default function GoalsWeightScreen() {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const { user } = useAuth();
  const { userData } = useUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentW, setCurrentW] = useState('');
  const [targetW, setTargetW] = useState('');
  const [mainGoal, setMainGoal] = useState(MAIN_GOAL.MAINTAIN_WEIGHT);
  /** profile/main snapshot for live preview — keeps calories/macros in sync with timeline math */
  const [mainProfile, setMainProfile] = useState(null);

  const hydrate = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      setMainProfile(null);
      return;
    }
    setLoading(true);
    try {
      const main = await getMainHealthProfile(user.uid);
      setMainProfile(main && typeof main === 'object' ? main : null);
      const p = userData?.profile || {};
      const g = userData?.goals || {};

      const cw = main?.currentWeightKg ?? p.currentWeight ?? p.weight ?? g.currentWeight;
      setCurrentW(cw != null && Number.isFinite(Number(cw)) ? String(cw) : '');

      const tw = main?.targetWeightKg ?? g.targetWeight;
      setTargetW(tw != null && Number.isFinite(Number(tw)) ? String(tw) : '');

      const mg = main?.mainGoal ?? appGoalTypeToMainGoal(g.type);
      setMainGoal(
        mg === MAIN_GOAL.LOSE_WEIGHT || mg === MAIN_GOAL.BUILD_MUSCLE ? mg : MAIN_GOAL.MAINTAIN_WEIGHT,
      );
    } catch (e) {
      setMainProfile(null);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[goals-weight] hydrate', e?.message || e);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.uid, userData]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const preview = useMemo(() => {
    const cw = parseFloat(String(currentW).replace(',', '.'));
    const tw = parseFloat(String(targetW).replace(',', '.'));
    if (!userData || !Number.isFinite(cw) || !Number.isFinite(tw)) return null;
    try {
      const canon = mergeCanonicalHealthInput(userData, mainProfile, {
        mainGoal,
        currentWeightKg: cw,
        targetWeightKg: tw,
      });
      return computeFullHealthSync(canon, 'recommend');
    } catch {
      return null;
    }
  }, [userData, mainProfile, currentW, targetW, mainGoal]);

  const onSave = async () => {
    if (!user?.uid) {
      Alert.alert('Sign in', 'You need to be signed in to save.');
      return;
    }
    const vc = validateWeightKg(currentW);
    const vt = validateWeightKg(targetW);
    if (!vc.ok) {
      Alert.alert('Current weight', vc.error);
      return;
    }
    if (!vt.ok) {
      Alert.alert('Target weight', vt.error);
      return;
    }

    setSaving(true);
    try {
      await syncUserHealthGoals(user.uid, 'goals_weight', {
        mainOverrides: {
          mainGoal,
          currentWeightKg: vc.value,
          targetWeightKg: vt.value,
        },
      });
      Alert.alert(
        'Saved',
        'Weight goals updated. Timeline and expected weekly change were recalculated from your calorie target and TDEE.',
      );
    } catch (e) {
      Alert.alert('Could not save', e?.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: Colors.background }]}>
        <ActivityIndicator color={Colors.textPrimary} />
      </View>
    );
  }

  const wk = preview?.expectedWeeklyChangeKg;
  const paceLabel =
    wk == null || !Number.isFinite(wk)
      ? '—'
      : wk < -0.005
        ? `Lose ${Math.abs(wk).toFixed(2)} kg/wk`
        : wk > 0.005
          ? `Gain ${wk.toFixed(2)} kg/wk`
          : 'Maintain';

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.hint}>
          Weights and main goal update TDEE and energy balance. Your saved daily calories and macros stay as the
          budget unless you change them under Nutrition — the preview pace and timeline use that budget against your
          new weight goal.
        </Text>

        <Field label="Current weight (kg)" value={currentW} onChangeText={setCurrentW} keyboardType="decimal-pad" Colors={Colors} s={s} />
        <Field label="Target weight (kg)" value={targetW} onChangeText={setTargetW} keyboardType="decimal-pad" Colors={Colors} s={s} />

        <Text style={s.label}>Main goal</Text>
        <View style={s.chipRow}>
          {GOAL_OPTIONS.map((o) => (
            <TouchableOpacity
              key={o.id}
              style={[s.chip, mainGoal === o.id && s.chipOn]}
              onPress={() => setMainGoal(o.id)}
            >
              <Text style={[s.chipText, mainGoal === o.id && s.chipTextOn]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.previewBox}>
          <Text style={s.previewTitle}>Live estimate (from your inputs)</Text>
          <Text style={s.previewLine}>Pace: {paceLabel}</Text>
          <Text style={s.previewLine}>
            Timeline: {preview?.goalTimelineWeeks != null ? `${preview.goalTimelineWeeks} weeks` : '—'}
          </Text>
          <Text style={s.previewLine}>
            Goal around: {preview?.estimatedGoalDate ? formatGoalDate(preview.estimatedGoalDate) : '—'}
          </Text>
          <Text style={s.previewLine}>
            Suggested calories: {preview?.dailyCaloriesTarget != null ? `${preview.dailyCaloriesTarget} kcal` : '—'}
          </Text>
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={() => void onSave()} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={s.saveText}>Save</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, keyboardType, Colors, s }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={Colors.textTertiary}
        keyboardType={keyboardType || 'default'}
        selectionColor={Colors.textPrimary}
      />
    </View>
  );
}

const createStyles = (Colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    scroll: { flex: 1 },
    content: { padding: Layout.screenPadding, paddingBottom: 32 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    hint: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-Regular',
      color: Colors.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    field: { marginBottom: 14 },
    label: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textTertiary,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: Layout.borderRadius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: 'PlusJakartaSans-Medium',
      color: Colors.textPrimary,
      backgroundColor: Colors.cardBackground,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.cardBackground,
    },
    chipOn: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
    chipText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textPrimary },
    chipTextOn: { color: Colors.onPrimary },
    previewBox: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Colors.border,
      borderRadius: Layout.borderRadius.md,
      padding: 14,
      marginBottom: 8,
      backgroundColor: Colors.cardBackground,
    },
    previewTitle: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
      marginBottom: 8,
    },
    previewLine: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-Medium',
      color: Colors.textSecondary,
      marginBottom: 4,
    },
    saveBtn: {
      marginTop: 20,
      backgroundColor: Colors.textPrimary,
      borderRadius: Layout.borderRadius.lg,
      paddingVertical: 16,
      alignItems: 'center',
    },
    saveText: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.onPrimary },
  });
