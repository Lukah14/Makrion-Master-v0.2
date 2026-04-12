import { useState, useEffect, useCallback, useRef } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/hooks/useUser';
import { syncUserHealthGoals } from '@/services/userGoalSyncService';
import {
  activityLabelToEnum,
  appGoalTypeToMainGoal,
  sexUiToCanonical,
  sexCanonicalToUi,
  MAIN_GOAL,
  ACTIVITY_LEVEL,
} from '@/lib/settingsProfileBridge';
import { validateAge, validateHeightCm, validateWeightKg } from '@/lib/settingsValidation';
import { flowLog } from '@/lib/flowLog';
import { isFirestoreTargetIdError } from '@/lib/firestoreRnErrors';

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

function applyRemoteToFormState(main, userDataSnapshot, authUser) {
  const p = userDataSnapshot?.profile || {};
  const g = userDataSnapshot?.goals || {};

  const nameNext = userDataSnapshot?.displayName || authUser?.displayName || '';
  const fromProfile = sexUiToCanonical(p.sex);
  const sexC =
    fromProfile === 'other'
      ? 'other'
      : fromProfile === 'female' || main?.sex === 'female'
        ? 'female'
        : 'male';

  const ageV = main?.age ?? p.age;
  const ageStr = ageV != null && Number.isFinite(Number(ageV)) ? String(Math.round(Number(ageV))) : '';

  const h = main?.heightCm ?? p.height;
  const heightStr = h != null && Number.isFinite(Number(h)) ? String(h) : '';

  const cw = main?.currentWeightKg ?? p.currentWeight ?? p.weight;
  const currentStr = cw != null && Number.isFinite(Number(cw)) ? String(cw) : '';

  const tw = main?.targetWeightKg ?? g.targetWeight;
  const targetStr = tw != null && Number.isFinite(Number(tw)) ? String(tw) : '';

  const activityNext = main?.activityLevel || activityLabelToEnum(p.activityLevel);

  const mg = main?.mainGoal ?? appGoalTypeToMainGoal(g.type);
  const mainGoalNext =
    mg === MAIN_GOAL.LOSE_WEIGHT || mg === MAIN_GOAL.BUILD_MUSCLE ? mg : MAIN_GOAL.MAINTAIN_WEIGHT;

  return {
    name: nameNext,
    sex: sexC,
    age: ageStr,
    height: heightStr,
    currentW: currentStr,
    targetW: targetStr,
    activity: activityNext,
    mainGoal: mainGoalNext,
  };
}

export default function PersonalDetailsScreen() {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const { user } = useAuth();
  const { userData, mainHealthProfile, mainProfileReady } = useUser();

  const userDataRef = useRef(userData);
  const mainHealthRef = useRef(mainHealthProfile);
  userDataRef.current = userData;
  mainHealthRef.current = mainHealthProfile;

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [sex, setSex] = useState('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [currentW, setCurrentW] = useState('');
  const [targetW, setTargetW] = useState('');
  const [activity, setActivity] = useState(ACTIVITY_LEVEL.MODERATELY_ACTIVE);
  const [mainGoal, setMainGoal] = useState(MAIN_GOAL.MAINTAIN_WEIGHT);

  /** Re-apply form when Firestore snapshots arrive after a successful save (no extra getDoc / watch). */
  const refreshAfterSaveRef = useRef(false);
  /** First time profile/main stream becomes ready while this screen is mounted (late listener). */
  const appliedMainStreamRef = useRef(false);

  useEffect(() => {
    flowLog('PROFILE_SCREEN_MOUNT', { uid: user?.uid ?? null });
  }, [user?.uid]);

  useEffect(() => {
    appliedMainStreamRef.current = false;
  }, [user?.uid]);

  const applyFromRefs = useCallback(() => {
    const next = applyRemoteToFormState(mainHealthRef.current, userDataRef.current, user);
    setName(next.name);
    setSex(next.sex);
    setAge(next.age);
    setHeight(next.height);
    setCurrentW(next.currentW);
    setTargetW(next.targetW);
    setActivity(next.activity);
    setMainGoal(next.mainGoal);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) return undefined;
      flowLog('PROFILE_LOAD_START', {
        screen: 'personal_details',
        uid: user.uid,
        source: 'useUser_multiplex_snapshot',
      });
      applyFromRefs();
      flowLog('PROFILE_LOAD_SUCCESS', {
        screen: 'personal_details',
        uid: user.uid,
        source: 'useUser_multiplex_snapshot',
        hasMainDoc: !!mainHealthRef.current,
      });
      return undefined;
    }, [user?.uid, user, applyFromRefs]),
  );

  useEffect(() => {
    if (!mainProfileReady || appliedMainStreamRef.current) return;
    appliedMainStreamRef.current = true;
    flowLog('PROFILE_LOAD_START', {
      screen: 'personal_details',
      uid: user?.uid,
      source: 'main_profile_stream_first_ready',
    });
    applyFromRefs();
    flowLog('PROFILE_LOAD_SUCCESS', {
      screen: 'personal_details',
      uid: user?.uid,
      source: 'main_profile_stream_first_ready',
    });
  }, [mainProfileReady, user?.uid, applyFromRefs]);

  useEffect(() => {
    if (!refreshAfterSaveRef.current) return;
    refreshAfterSaveRef.current = false;
    flowLog('PROFILE_LOAD_START', {
      screen: 'personal_details',
      uid: user?.uid,
      source: 'post_save_snapshot',
    });
    applyFromRefs();
    flowLog('PROFILE_LOAD_SUCCESS', { screen: 'personal_details', uid: user?.uid, source: 'post_save_snapshot' });
  }, [userData, mainHealthProfile, user?.uid, applyFromRefs]);

  const showBlockingLoader = Boolean(user?.uid && !mainProfileReady);

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
    if (!user?.uid) {
      Alert.alert('Sign in', 'You need to be signed in to save.');
      return;
    }

    const displayName = String(name || '').trim() || user?.displayName || 'User';
    const payload = {
      displayName,
      profileSexUi: sexCanonicalToUi(sex),
      mainOverrides: {
        mainGoal,
        sex,
        age: ageN,
        heightCm,
        currentWeightKg: curKg,
        targetWeightKg: tgtKg,
        activityLevel: activity,
      },
    };

    flowLog('PROFILE_SAVE_START', { screen: 'personal_details', uid: user.uid });
    flowLog('PROFILE_SAVE_PAYLOAD', {
      uid: user.uid,
      displayName,
      mainGoal,
      sex,
      age: ageN,
      heightCm,
      currentWeightKg: curKg,
      targetWeightKg: tgtKg,
      activityLevel: activity,
    });

    setSaving(true);
    try {
      await syncUserHealthGoals(user.uid, 'personal', payload);
      flowLog('PROFILE_SAVE_SUCCESS', { screen: 'personal_details', uid: user.uid });
      refreshAfterSaveRef.current = true;
      Alert.alert(
        'Saved',
        'Personal details updated. Expected weekly change and goal timeline were recalculated from your calorie target and new TDEE.',
      );
    } catch (e) {
      flowLog('PROFILE_SAVE_FAILED', {
        screen: 'personal_details',
        uid: user.uid,
        message: e?.message || String(e),
      });
      const raw = e?.message || 'Try again.';
      const hint = isFirestoreTargetIdError(e)
        ? 'This is a known device sync glitch, not bad data in the database. Force-close the app and open it again, then tap Save once more.'
        : raw;
      Alert.alert('Could not save', hint);
    } finally {
      setSaving(false);
    }
  };

  if (showBlockingLoader) {
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
