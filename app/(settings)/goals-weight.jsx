import { useState, useEffect, useCallback } from 'react';
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
import {
  appGoalTypeToMainGoal,
  mainGoalToAppGoalType,
  MAIN_GOAL,
} from '@/lib/settingsProfileBridge';
import { validateWeightKg, parsePositiveNumber } from '@/lib/settingsValidation';

const GOAL_OPTIONS = [
  { id: MAIN_GOAL.LOSE_WEIGHT, label: 'Lose weight' },
  { id: MAIN_GOAL.MAINTAIN_WEIGHT, label: 'Maintain weight' },
  { id: MAIN_GOAL.BUILD_MUSCLE, label: 'Build muscle' },
];

export default function GoalsWeightScreen() {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const { user } = useAuth();
  const { userData, patchUser } = useUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentW, setCurrentW] = useState('');
  const [targetW, setTargetW] = useState('');
  const [mainGoal, setMainGoal] = useState(MAIN_GOAL.MAINTAIN_WEIGHT);
  const [timelineWeeks, setTimelineWeeks] = useState('');
  const [weeklyRate, setWeeklyRate] = useState('');

  const hydrate = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const main = await getMainHealthProfile(user.uid);
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

      const wks = main?.goalTimelineWeeks ?? g.goalTimelineWeeks;
      setTimelineWeeks(wks != null && Number.isFinite(Number(wks)) ? String(Math.round(Number(wks))) : '');

      const wr = main?.weeklyRateKg ?? g.weeklyRateKg;
      setWeeklyRate(wr != null && Number.isFinite(Number(wr)) ? String(wr) : '');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, userData]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const onSave = async () => {
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

    let weeksVal = null;
    if (timelineWeeks.trim() !== '') {
      const w = parsePositiveNumber(timelineWeeks, 1, 260, false);
      if (!w.ok) {
        Alert.alert('Goal timeline', 'Weeks must be between 1 and 260.');
        return;
      }
      weeksVal = w.value;
    }

    let rateVal = null;
    if (weeklyRate.trim() !== '') {
      const r = parsePositiveNumber(weeklyRate, 0.05, 5, true);
      if (!r.ok) {
        Alert.alert('Weekly rate', 'Use a realistic weekly change in kg (0.05–5).');
        return;
      }
      rateVal = r.value;
    }

    const appGoalType = mainGoalToAppGoalType(mainGoal);
    const prevG = userData?.goals || {};
    const prevP = userData?.profile || {};

    setSaving(true);
    try {
      await patchUser(
        {
          profile: {
            ...prevP,
            currentWeight: vc.value,
            weight: vc.value,
          },
          goals: {
            ...prevG,
            targetWeight: vt.value,
            type: appGoalType,
            currentWeight: vc.value,
            ...(weeksVal != null ? { goalTimelineWeeks: weeksVal } : {}),
            ...(rateVal != null ? { weeklyRateKg: rateVal } : {}),
          },
        },
        {
          currentWeightKg: vc.value,
          targetWeightKg: vt.value,
          mainGoal,
          ...(weeksVal != null ? { goalTimelineWeeks: weeksVal } : {}),
          ...(rateVal != null ? { weeklyRateKg: rateVal } : {}),
        },
      );
      Alert.alert('Saved', 'Goals and weight were updated.');
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

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
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

        <Field
          label="Goal timeline (weeks)"
          value={timelineWeeks}
          onChangeText={setTimelineWeeks}
          keyboardType="number-pad"
          Colors={Colors}
          s={s}
          hint="Optional"
        />
        <Field
          label="Weekly rate (kg / week)"
          value={weeklyRate}
          onChangeText={setWeeklyRate}
          keyboardType="decimal-pad"
          Colors={Colors}
          s={s}
          hint="Optional target pace"
        />

        <TouchableOpacity style={s.saveBtn} onPress={() => void onSave()} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={s.saveText}>Save</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, keyboardType, hint, Colors, s }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}
        {hint ? <Text style={s.hintInline}> · {hint}</Text> : null}
      </Text>
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
    field: { marginBottom: 14 },
    label: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textTertiary,
      marginBottom: 6,
    },
    hintInline: { fontFamily: 'PlusJakartaSans-Regular', color: Colors.textTertiary },
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
    saveBtn: {
      marginTop: 20,
      backgroundColor: Colors.textPrimary,
      borderRadius: Layout.borderRadius.lg,
      paddingVertical: 16,
      alignItems: 'center',
    },
    saveText: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.onPrimary },
  });
