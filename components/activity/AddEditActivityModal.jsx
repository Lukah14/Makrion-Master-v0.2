import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Pencil, Search } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Layout } from '@/constants/layout';
import FirestoreExercisePickerModal from '@/components/activity/FirestoreExercisePickerModal';
import { validateSimpleActivityForm } from '@/lib/activityValidation';
import { snapshotFromExerciseDefinition } from '@/lib/activityLogMapping';
import { estimateCaloriesBurnedFromKcalPerHour80kg } from '@/lib/caloriesBurned';
import { resolveActivityUserWeightKg } from '@/lib/activityUserWeight';

function defaultForm() {
  return {
    name: '',
    durationMinutes: '',
    caloriesBurned: '',
    source: 'manual',
    exerciseId: '',
    category: '',
    shortInstructions: '',
    typeOfExercise: '',
    intensity: '',
    met: '',
    kcalsPerHour80kg: '',
  };
}

function entryToForm(entry) {
  const fromLibrary = entry.source === 'firestore' || entry.source === 'exercise_library';
  return {
    name: entry.name || '',
    durationMinutes: entry.durationMinutes != null ? String(entry.durationMinutes) : '',
    caloriesBurned:
      entry.caloriesBurned != null && entry.caloriesBurned !== ''
        ? String(entry.caloriesBurned)
        : '',
    source: fromLibrary ? 'exercise_library' : 'manual',
    exerciseId: fromLibrary ? (entry.exerciseId || '') : '',
    category: entry.category || entry.exerciseCategory || '',
    shortInstructions: entry.shortInstructions || entry.instructions || '',
    typeOfExercise: entry.typeOfExercise || '',
    intensity: entry.intensity || '',
    met: entry.met != null ? String(entry.met) : '',
    kcalsPerHour80kg: entry.kcalsPerHour80kg != null ? String(entry.kcalsPerHour80kg) : '',
  };
}

function parseOptionalNumber(s) {
  if (s === '' || s == null) return null;
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function buildMetaPayload(form) {
  if (form.source === 'exercise_library' && form.exerciseId) {
    return {
      source: 'exercise_library',
      exerciseId: form.exerciseId,
      category: form.category?.trim() || null,
      shortInstructions: form.shortInstructions?.trim() || null,
      typeOfExercise: form.typeOfExercise?.trim() || null,
      intensity: form.intensity?.trim() || null,
      met: parseOptionalNumber(form.met),
      kcalsPerHour80kg: parseOptionalNumber(form.kcalsPerHour80kg),
    };
  }
  return {
    source: 'manual',
    exerciseId: null,
    category: null,
    shortInstructions: null,
    typeOfExercise: null,
    intensity: null,
    met: null,
    kcalsPerHour80kg: null,
  };
}

function LabeledInput({
  label,
  hint,
  value,
  onChangeText,
  keyboardType = 'default',
  placeholder,
  Colors,
  styles,
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        keyboardType={keyboardType}
        selectionColor={Colors.textPrimary}
      />
    </View>
  );
}

function DurationMinutesField({ value, onChangeText, placeholder = '30', Colors, styles }) {
  const onChange = (t) => {
    const cleaned = t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    onChangeText(cleaned);
  };
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Time (min)</Text>
      <Text style={styles.hint}>Minutes only — e.g. 15, 30, 45.</Text>
      <View style={styles.durationRow}>
        <TextInput
          style={styles.durationInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          keyboardType="decimal-pad"
          selectionColor={Colors.textPrimary}
          maxLength={8}
        />
        <View style={styles.durationSuffix} pointerEvents="none">
          <Text style={styles.durationSuffixText}>min</Text>
        </View>
      </View>
    </View>
  );
}

export default function AddEditActivityModal({
  visible,
  onClose,
  dateKey,
  initialEntry,
  onSave,
}) {
  const { colors: Colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(Colors);
  const isEdit = Boolean(initialEntry?.id);

  const [flowPhase, setFlowPhase] = useState('source');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [form, setForm] = useState(() => defaultForm());
  const [saving, setSaving] = useState(false);
  const [resolvedWeightKg, setResolvedWeightKg] = useState(null);
  const caloriesUserTouchedRef = useRef(false);

  const weightForFormula = useMemo(() => {
    if (
      isEdit &&
      initialEntry &&
      (initialEntry.source === 'exercise_library' || initialEntry.source === 'firestore')
    ) {
      const w = Number(initialEntry.weightUsedKg);
      if (Number.isFinite(w) && w > 0) return w;
    }
    return resolvedWeightKg;
  }, [isEdit, initialEntry, resolvedWeightKg]);

  useEffect(() => {
    if (!visible) return;
    if (initialEntry?.id) {
      setFlowPhase('form');
      setForm(entryToForm(initialEntry));
      caloriesUserTouchedRef.current = true;
    } else {
      setFlowPhase('source');
      setForm(defaultForm());
      caloriesUserTouchedRef.current = false;
    }
    setPickerOpen(false);
  }, [visible, initialEntry]);

  useEffect(() => {
    if (!visible || !user?.uid) {
      setResolvedWeightKg(null);
      return;
    }
    let cancelled = false;
    resolveActivityUserWeightKg(user.uid).then((w) => {
      if (!cancelled) setResolvedWeightKg(w);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, user?.uid]);

  useEffect(() => {
    if (!visible) return;
    if (form.source !== 'exercise_library' || !form.exerciseId) return;
    if (caloriesUserTouchedRef.current) return;
    const w = weightForFormula;
    if (w == null || !Number.isFinite(Number(w)) || Number(w) <= 0) return;
    const mins = parseOptionalNumber(form.durationMinutes);
    const khr = parseOptionalNumber(form.kcalsPerHour80kg);
    if (mins == null || mins <= 0 || khr == null || khr <= 0) return;
    const est = estimateCaloriesBurnedFromKcalPerHour80kg({
      kcalsPerHour80kg: khr,
      durationMinutes: mins,
      userWeightKg: w,
    });
    if (est != null) {
      setForm((prev) => ({ ...prev, caloriesBurned: String(est) }));
    }
  }, [
    visible,
    form.source,
    form.exerciseId,
    form.durationMinutes,
    form.kcalsPerHour80kg,
    weightForFormula,
  ]);

  const set = useCallback((key, v) => {
    setForm((prev) => ({ ...prev, [key]: v }));
  }, []);

  const handleSave = async () => {
    const raw = {
      name: form.name,
      durationMinutes: form.durationMinutes,
      caloriesBurned: form.caloriesBurned,
    };
    const result = validateSimpleActivityForm(raw);
    if (!result.ok) {
      Alert.alert('Check fields', result.message);
      return;
    }
    setSaving(true);
    try {
      const meta = buildMetaPayload(form);
      await onSave({ ...result.values, ...meta });
    } catch (e) {
      Alert.alert('Could not save', e?.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleExercisePick = useCallback((def) => {
    const snap = snapshotFromExerciseDefinition(def);
    caloriesUserTouchedRef.current = false;
    setForm((prev) => ({
      ...defaultForm(),
      ...snap,
      durationMinutes: '',
      caloriesBurned: '',
    }));
    setFlowPhase('form');
    setPickerOpen(false);
  }, []);

  const sourceChooser = !isEdit && flowPhase === 'source';
  const fromLibrary = form.source === 'exercise_library' && Boolean(form.exerciseId);

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          >
            <View style={styles.header}>
              <Text style={styles.title}>{isEdit ? 'Edit activity' : 'Add activity'}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                <X size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.dateLine}>Date: {dateKey}</Text>

            {sourceChooser ? (
              <>
                <ScrollView
                  style={styles.scroll}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.sectionLabel}>Choose a path</Text>
                  <Text style={styles.hint}>
                    Log from the exercise library (time-based calories) or add a custom activity manually.
                  </Text>

                  <TouchableOpacity
                    style={styles.choiceCard}
                    onPress={() => {
                      setForm(defaultForm());
                      setFlowPhase('form');
                    }}
                    activeOpacity={0.75}
                  >
                    <Pencil size={22} color={Colors.textPrimary} />
                    <View style={styles.choiceTextWrap}>
                      <Text style={styles.choiceTitle}>Manual</Text>
                      <Text style={styles.choiceSub}>Name, time in minutes, and calories burned.</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.choiceCard}
                    onPress={() => setPickerOpen(true)}
                    activeOpacity={0.75}
                  >
                    <Search size={22} color={Colors.textPrimary} />
                    <View style={styles.choiceTextWrap}>
                      <Text style={styles.choiceTitle}>Exercise library</Text>
                      <Text style={styles.choiceSub}>
                        Pick an exercise; calories scale to your current weight when you enter time.
                      </Text>
                    </View>
                  </TouchableOpacity>
                </ScrollView>
                <View style={styles.footer}>
                  <TouchableOpacity style={styles.secondaryBtnFull} onPress={onClose}>
                    <Text style={styles.secondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <ScrollView
                  style={styles.scroll}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {!isEdit && (
                    <TouchableOpacity
                      style={styles.changePath}
                      onPress={() => {
                        setFlowPhase('source');
                        setForm(defaultForm());
                      }}
                    >
                      <Text style={styles.changePathText}>← Change how I add</Text>
                    </TouchableOpacity>
                  )}

                  {fromLibrary ? (
                    <View style={styles.catalogBanner}>
                      <Text style={styles.catalogBannerLabel}>From library</Text>
                      <View style={styles.catalogMetaRow}>
                        {form.typeOfExercise ? (
                          <Text style={styles.catalogPill}>{form.typeOfExercise}</Text>
                        ) : null}
                        {form.intensity ? (
                          <Text style={styles.catalogPillMuted}>{form.intensity}</Text>
                        ) : null}
                      </View>
                      {form.met !== '' || form.kcalsPerHour80kg !== '' ? (
                        <Text style={styles.catalogStats}>
                          {form.met !== '' ? `MET ${form.met}` : ''}
                          {form.met !== '' && form.kcalsPerHour80kg !== '' ? ' · ' : ''}
                          {form.kcalsPerHour80kg !== ''
                            ? `${form.kcalsPerHour80kg} kcal/h @ 80 kg`
                            : ''}
                        </Text>
                      ) : null}
                      {form.category ? <Text style={styles.catalogCat}>{form.category}</Text> : null}
                      {form.shortInstructions ? (
                        <View style={styles.instructionsPreview}>
                          <Text style={styles.instructionsPreviewText} numberOfLines={6}>
                            {form.shortInstructions}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <LabeledInput
                    label="Name"
                    value={form.name}
                    onChangeText={(v) => set('name', v)}
                    placeholder={fromLibrary ? 'Exercise name' : 'e.g. Morning walk'}
                    Colors={Colors}
                    styles={styles}
                  />

                  <DurationMinutesField
                    value={form.durationMinutes}
                    onChangeText={(v) => set('durationMinutes', v)}
                    placeholder="30"
                    Colors={Colors}
                    styles={styles}
                  />

                  <LabeledInput
                    label="Calories burned"
                    hint={
                      fromLibrary
                        ? 'Filled from your weight and kcal/h (80 kg) when you enter time — you can adjust.'
                        : 'Enter the calories you want to log for this activity.'
                    }
                    value={form.caloriesBurned}
                    onChangeText={(v) => {
                      caloriesUserTouchedRef.current = true;
                      const cleaned = v.replace(/[^0-9.,]/g, '').replace(/(\..*)\./g, '$1');
                      set('caloriesBurned', cleaned);
                    }}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    Colors={Colors}
                    styles={styles}
                  />

                  <View style={{ height: 100 }} />
                </ScrollView>

                <View style={styles.footer}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} disabled={saving}>
                    <Text style={styles.secondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color={Colors.onPrimary} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <FirestoreExercisePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handleExercisePick}
      />
    </>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cardBackground },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  closeBtn: { padding: 4 },
  dateLine: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: Layout.screenPadding,
    marginBottom: 12,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 12,
    lineHeight: 18,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginBottom: 12,
  },
  choiceTextWrap: { flex: 1 },
  choiceTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  choiceSub: { fontSize: 13, color: Colors.textTertiary, marginTop: 4, lineHeight: 18 },
  changePath: { marginBottom: 12 },
  changePathText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.primary },
  catalogBanner: {
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catalogBannerLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textTertiary, marginBottom: 6 },
  catalogMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  catalogPill: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  catalogPillMuted: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
    backgroundColor: Colors.innerCard,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  catalogStats: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  catalogCat: { fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textSecondary, marginBottom: 8 },
  instructionsPreview: { maxHeight: 140 },
  instructionsPreviewText: { fontSize: 13, lineHeight: 20, color: Colors.textSecondary },
  field: { marginTop: 12 },
  label: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    marginBottom: 4,
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
    backgroundColor: Colors.background,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  durationInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    minWidth: 0,
  },
  durationSuffix: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    backgroundColor: Colors.innerCard,
  },
  durationSuffixText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: Layout.screenPadding,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.cardBackground,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.textPrimary,
    alignItems: 'center',
  },
  secondaryBtnFull: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.textPrimary,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.onPrimary,
  },
});
