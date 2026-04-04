import { useState, useEffect, useCallback } from 'react';
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
import { Layout } from '@/constants/layout';
import ActivityTypeSelector from '@/components/activity/ActivityTypeSelector';
import FirestoreExercisePickerModal from '@/components/activity/FirestoreExercisePickerModal';
import { validateActivityForm } from '@/lib/activityValidation';
import { editorTypeFromEntry } from '@/lib/activityTypes';
import { snapshotFromExerciseDefinition } from '@/lib/activityLogMapping';

function defaultForm(type = 'time') {
  return {
    type,
    name: '',
    durationMinutes: '',
    distanceKm: '',
    sets: '',
    repsPerSet: '',
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

function distanceKmFromEntry(entry) {
  const dk = Number(entry?.distanceKm);
  if (dk > 0) return String(dk);
  const dm = Number(entry?.distanceMeters);
  if (dm > 0) return String(Math.round((dm / 1000) * 1000) / 1000);
  return '';
}

function entryToForm(entry) {
  const type = editorTypeFromEntry(entry);
  const fromCatalog = entry.source === 'firestore';
  return {
    type,
    name: entry.name || '',
    durationMinutes: entry.durationMinutes != null ? String(entry.durationMinutes) : '',
    distanceKm: distanceKmFromEntry(entry),
    sets: entry.sets != null ? String(entry.sets) : '',
    repsPerSet:
      entry.repsPerSet != null
        ? String(entry.repsPerSet)
        : (entry.reps != null ? String(entry.reps) : ''),
    source: fromCatalog ? 'firestore' : 'manual',
    exerciseId: fromCatalog ? (entry.exerciseId || '') : '',
    category: entry.category || entry.exerciseCategory || '',
    shortInstructions:
      entry.shortInstructions || entry.instructions || '',
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
  if (form.source === 'firestore' && form.exerciseId) {
    return {
      source: 'firestore',
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

/** Manual duration in minutes: numeric field + visible "min" suffix. */
function DurationMinutesField({
  optional,
  value,
  onChangeText,
  placeholder = '30',
  Colors,
  styles,
}) {
  const onChange = (t) => {
    const cleaned = t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    onChangeText(cleaned);
  };
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Duration</Text>
      <Text style={styles.hint}>
        {optional
          ? 'Optional — minutes only. Add if you want time on your log (helps calories for library exercises).'
          : 'Minutes only — type a number (e.g. 15, 30, 45). Unit is always minutes.'}
      </Text>
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
  const styles = createStyles(Colors);
  const isEdit = Boolean(initialEntry?.id);

  const [flowPhase, setFlowPhase] = useState('source');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [form, setForm] = useState(() => defaultForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initialEntry?.id) {
      setFlowPhase('form');
      setForm(entryToForm(initialEntry));
    } else {
      setFlowPhase('source');
      setForm(defaultForm('time'));
    }
    setPickerOpen(false);
  }, [visible, initialEntry]);

  const set = useCallback((key, v) => {
    setForm((prev) => ({ ...prev, [key]: v }));
  }, []);

  const buildRaw = useCallback(
    () => ({
      name: form.name,
      durationMinutes: form.durationMinutes,
      distanceKm: form.distanceKm,
      sets: form.sets,
      repsPerSet: form.repsPerSet,
    }),
    [form],
  );

  const handleSave = async () => {
    const raw = { type: form.type, ...buildRaw() };
    const result = validateActivityForm(form.type, raw);
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
    setForm((prev) => ({
      ...prev,
      ...snap,
      durationMinutes: '',
      distanceKm: '',
      sets: '',
      repsPerSet: '',
    }));
    setFlowPhase('form');
    setPickerOpen(false);
  }, []);

  const type = form.type;
  const sourceChooser = !isEdit && flowPhase === 'source';
  const lockedType = form.source === 'firestore' && form.exerciseId && form.typeOfExercise === 'Strength';

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
                    Use the exercise library from Firestore, or enter a custom activity manually.
                  </Text>

                  <TouchableOpacity
                    style={styles.choiceCard}
                    onPress={() => {
                      setForm(defaultForm('time'));
                      setFlowPhase('form');
                    }}
                    activeOpacity={0.75}
                  >
                    <Pencil size={22} color={Colors.textPrimary} />
                    <View style={styles.choiceTextWrap}>
                      <Text style={styles.choiceTitle}>Manual</Text>
                      <Text style={styles.choiceSub}>Type any name and choose time, distance, or reps.</Text>
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
                      <Text style={styles.choiceSub}>Browse MET and kcal/h (80 kg) values, then log duration or reps.</Text>
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
                        setForm(defaultForm('time'));
                      }}
                    >
                      <Text style={styles.changePathText}>← Change how I add</Text>
                    </TouchableOpacity>
                  )}

                  {form.source === 'firestore' && form.exerciseId ? (
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

                  <Text style={styles.sectionLabel}>Log type</Text>
                  <Text style={styles.hint}>
                    {lockedType
                      ? 'Strength exercises use reps. Enter sets and reps below (optional duration for calories).'
                      : 'Time, distance, or reps — cardio library exercises default to time; you can switch to distance if needed.'}
                  </Text>
                  <ActivityTypeSelector
                    value={type}
                    onChange={(t) => set('type', t)}
                    disabled={saving || lockedType}
                  />

                  <LabeledInput
                    label="Name"
                    value={form.name}
                    onChangeText={(v) => set('name', v)}
                    placeholder="e.g. Morning run"
                    Colors={Colors}
                    styles={styles}
                  />

                  {type === 'time' && (
                    <DurationMinutesField
                      optional={false}
                      value={form.durationMinutes}
                      onChangeText={(v) => set('durationMinutes', v)}
                      placeholder="30"
                      Colors={Colors}
                      styles={styles}
                    />
                  )}

                  {type === 'distance' && (
                    <>
                      <DurationMinutesField
                        optional={false}
                        value={form.durationMinutes}
                        onChangeText={(v) => set('durationMinutes', v)}
                        placeholder="45"
                        Colors={Colors}
                        styles={styles}
                      />
                      <LabeledInput
                        label="Distance"
                        hint="Kilometers (km)"
                        value={form.distanceKm}
                        onChangeText={(v) => set('distanceKm', v)}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 5.2"
                        Colors={Colors}
                        styles={styles}
                      />
                    </>
                  )}

                  {type === 'reps' && (
                    <>
                      <LabeledInput
                        label="Reps per set"
                        value={form.repsPerSet}
                        onChangeText={(v) => set('repsPerSet', v)}
                        keyboardType="number-pad"
                        placeholder="e.g. 10"
                        Colors={Colors}
                        styles={styles}
                      />
                      <LabeledInput
                        label="Sets"
                        value={form.sets}
                        onChangeText={(v) => set('sets', v)}
                        keyboardType="number-pad"
                        placeholder="e.g. 3"
                        Colors={Colors}
                        styles={styles}
                      />
                      <DurationMinutesField
                        optional
                        value={form.durationMinutes}
                        onChangeText={(v) => set('durationMinutes', v)}
                        placeholder=""
                        Colors={Colors}
                        styles={styles}
                      />
                    </>
                  )}

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
