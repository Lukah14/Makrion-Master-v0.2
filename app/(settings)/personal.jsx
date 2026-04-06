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
  activityLabelToEnum,
  activityLevelToLabel,
  appGoalTypeToMainGoal,
  mainGoalToAppGoalType,
  sexUiToCanonical,
  sexCanonicalToUi,
  MAIN_GOAL,
  ACTIVITY_LEVEL,
} from '@/lib/settingsProfileBridge';
import { validateAge, validateHeightCm, validateWeightKg } from '@/lib/settingsValidation';

const ACTIVITY_OPTIONS = [
  { id: ACTIVITY_LEVEL.SEDENTARY, label: 'Sedentary' },
  { id: ACTIVITY_LEVEL.LIGHTLY_ACTIVE, label: 'Lightly active' },
  { id: ACTIVITY_LEVEL.MODERATELY_ACTIVE, label: 'Moderately active' },
  { id: ACTIVITY_LEVEL.VERY_ACTIVE, label: 'Very active' },
  { id: ACTIVITY_LEVEL.EXTREMELY_ACTIVE, label: 'Extremely active' },
];

const GOAL_OPTIONS = [
  { id: MAIN_GOAL.LOSE_WEIGHT, label: 'Lose weight' },
  { id: MAIN_GOAL.MAINTAIN_WEIGHT, label: 'Maintain weight' },
  { id: MAIN_GOAL.BUILD_MUSCLE, label: 'Build muscle' },
];

const SEX_OPTIONS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Other' },
];

export default function PersonalDetailsScreen() {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const { user } = useAuth();
  const { userData, patchUser } = useUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [sex, setSex] = useState('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [currentW, setCurrentW] = useState('');
  const [targetW, setTargetW] = useState('');
  const [activity, setActivity] = useState(ACTIVITY_LEVEL.MODERATELY_ACTIVE);
  const [mainGoal, setMainGoal] = useState(MAIN_GOAL.MAINTAIN_WEIGHT);

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

      setName(userData?.displayName || user?.displayName || '');
      const sexC =
        main?.sex ||
        sexUiToCanonical(p.sex) ||
        'male';
      setSex(sexC === 'female' ? 'female' : sexC === 'other' ? 'other' : 'male');

      const ageV = main?.age ?? p.age;
      setAge(ageV != null && Number.isFinite(Number(ageV)) ? String(Math.round(Number(ageV))) : '');

      const h = main?.heightCm ?? p.height;
      setHeight(h != null && Number.isFinite(Number(h)) ? String(h) : '');

      const cw = main?.currentWeightKg ?? p.currentWeight ?? p.weight;
      setCurrentW(cw != null && Number.isFinite(Number(cw)) ? String(cw) : '');

      const tw = main?.targetWeightKg ?? g.targetWeight;
      setTargetW(tw != null && Number.isFinite(Number(tw)) ? String(tw) : '');

      setActivity(main?.activityLevel || activityLabelToEnum(p.activityLevel));

      const mg = main?.mainGoal ?? appGoalTypeToMainGoal(g.type);
      setMainGoal(
        mg === MAIN_GOAL.LOSE_WEIGHT || mg === MAIN_GOAL.BUILD_MUSCLE ? mg : MAIN_GOAL.MAINTAIN_WEIGHT,
      );
    } finally {
      setLoading(false);
    }
  }, [user?.uid, user?.displayName, userData]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const onSave = async () => {
    const va = validateAge(age);
    if (!va.ok) {
      Alert.alert('Age', va.error);
      return;
    }
    const vh = validateHeightCm(height);
    if (!vh.ok) {
      Alert.alert('Height', vh.error);
      return;
    }
    const vc = validateWeightKg(currentW);
    if (!vc.ok) {
      Alert.alert('Current weight', vc.error);
      return;
    }
    const vt = validateWeightKg(targetW);
    if (!vt.ok) {
      Alert.alert('Target weight', vt.error);
      return;
    }

    const ageN = va.value;
    const heightCm = vh.value;
    const curKg = vc.value;
    const tgtKg = vt.value;
    const appGoalType = mainGoalToAppGoalType(mainGoal);
    const prevG = userData?.goals || {};

    setSaving(true);
    try {
      await patchUser(
        {
          displayName: name.trim() || user?.displayName || 'User',
          profile: {
            sex: sexCanonicalToUi(sex),
            age: ageN,
            height: heightCm,
            weight: curKg,
            currentWeight: curKg,
            activityLevel: activityLevelToLabel(activity),
          },
          goals: {
            ...prevG,
            targetWeight: tgtKg,
            type: appGoalType,
            currentWeight: curKg,
            startWeight: prevG.startWeight ?? curKg,
          },
        },
        {
          mainGoal,
          sex,
          age: ageN,
          heightCm,
          currentWeightKg: curKg,
          targetWeightKg: tgtKg,
          activityLevel: activity,
        },
      );
      Alert.alert('Saved', 'Your personal details were updated.');
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
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" Colors={Colors} s={s} />

        <Text style={s.label}>Sex</Text>
        <View style={s.chipRow}>
          {SEX_OPTIONS.map((o) => (
            <TouchableOpacity
              key={o.id}
              style={[s.chip, sex === o.id && s.chipOn]}
              onPress={() => setSex(o.id)}
            >
              <Text style={[s.chipText, sex === o.id && s.chipTextOn]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="Years" Colors={Colors} s={s} />
        <Field label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="cm" Colors={Colors} s={s} />
        <Field label="Current weight (kg)" value={currentW} onChangeText={setCurrentW} keyboardType="decimal-pad" Colors={Colors} s={s} />
        <Field label="Target weight (kg)" value={targetW} onChangeText={setTargetW} keyboardType="decimal-pad" Colors={Colors} s={s} />

        <Text style={s.label}>Activity level</Text>
        <View style={s.wrapRow}>
          {ACTIVITY_OPTIONS.map((o) => (
            <TouchableOpacity
              key={o.id}
              style={[s.chip, activity === o.id && s.chipOn]}
              onPress={() => setActivity(o.id)}
            >
              <Text style={[s.chipText, activity === o.id && s.chipTextOn]} numberOfLines={1}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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

        <TouchableOpacity style={s.saveBtn} onPress={() => void onSave()} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={s.saveText}>Save</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, Colors, s }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
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
    wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.cardBackground,
    },
    chipOn: {
      backgroundColor: Colors.textPrimary,
      borderColor: Colors.textPrimary,
    },
    chipText: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-Medium',
      color: Colors.textPrimary,
    },
    chipTextOn: { color: Colors.onPrimary },
    saveBtn: {
      marginTop: 20,
      backgroundColor: Colors.textPrimary,
      borderRadius: Layout.borderRadius.lg,
      paddingVertical: 16,
      alignItems: 'center',
    },
    saveText: {
      fontSize: 16,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.onPrimary,
    },
  });
