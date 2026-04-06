import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, Pressable, Platform,
  KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

function round1(n) {
  return Math.round(n * 10) / 10;
}

function strOrEmpty(v) {
  if (v == null || v === '') return '';
  return String(v);
}

function NutrientRow({ label, value, onChange, unit = 'g', required, Colors, styles }) {
  return (
    <View style={styles.nutrientRow}>
      <Text style={styles.nutrientLabel}>
        {label}
        {required ? <Text style={styles.req}>*</Text> : null}
      </Text>
      <View style={styles.nutrientInputWrap}>
        <TextInput
          style={styles.nutrientInput}
          placeholder="0"
          placeholderTextColor={Colors.textTertiary}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          selectionColor={Colors.textPrimary}
        />
        <Text style={styles.nutrientUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function parseRequiredNonNeg(raw, label) {
  const t = String(raw ?? '').trim();
  if (t === '') return { ok: false, message: `${label} is required.` };
  const n = parseFloat(t.replace(',', '.'));
  if (!Number.isFinite(n)) return { ok: false, message: `${label} must be a number.` };
  if (n < 0) return { ok: false, message: `${label} cannot be negative.` };
  return { ok: true, value: n };
}

function parseOptionalNonNeg(raw) {
  const t = String(raw ?? '').trim();
  if (t === '') return { ok: true, value: 0 };
  const n = parseFloat(t.replace(',', '.'));
  if (!Number.isFinite(n)) return { ok: false, message: 'Optional nutrients must be valid numbers.' };
  if (n < 0) return { ok: false, message: 'Values cannot be negative.' };
  return { ok: true, value: n };
}

export default function EditManualEntrySheet({ visible, entry, onSave, onClose }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugars, setSugars] = useState('');
  const [sodium, setSodium] = useState('');
  const [mealType, setMealType] = useState('breakfast');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !entry) return;
    const n = entry.nutrientsSnapshot || {};
    setName(entry.nameSnapshot || '');
    setCalories(strOrEmpty(n.kcal));
    setProtein(strOrEmpty(n.protein));
    setCarbs(strOrEmpty(n.carbs));
    setFat(strOrEmpty(n.fat));
    setFiber(strOrEmpty(n.fiber));
    setSugars(strOrEmpty(n.sugars));
    setSodium(strOrEmpty(n.sodium));
    const m = entry.mealType;
    setMealType(MEALS.some((x) => x.key === m) ? m : 'snack');
    setError('');
  }, [visible, entry?.id]);

  if (!entry) return null;

  const calR = parseRequiredNonNeg(calories, 'Calories');
  const protR = parseRequiredNonNeg(protein, 'Protein');
  const carbR = parseRequiredNonNeg(carbs, 'Carbs');
  const fatR = parseRequiredNonNeg(fat, 'Fat');
  const fiberR = parseOptionalNonNeg(fiber);
  const sugarR = parseOptionalNonNeg(sugars);
  const saltR = parseOptionalNonNeg(sodium);

  const nameOk = name.trim().length > 0;
  const isValid =
    nameOk &&
    calR.ok &&
    protR.ok &&
    carbR.ok &&
    fatR.ok &&
    fiberR.ok &&
    sugarR.ok &&
    saltR.ok;

  const handleSave = () => {
    if (!name.trim()) {
      setError('Enter a food name.');
      return;
    }
    if (!calR.ok) { setError(calR.message); return; }
    if (!protR.ok) { setError(protR.message); return; }
    if (!carbR.ok) { setError(carbR.message); return; }
    if (!fatR.ok) { setError(fatR.message); return; }
    if (!fiberR.ok) { setError(fiberR.message); return; }
    if (!sugarR.ok) { setError(sugarR.message); return; }
    if (!saltR.ok) { setError(saltR.message); return; }

    const nutrientsSnapshot = {
      kcal: Math.round(calR.value),
      protein: round1(protR.value),
      carbs: round1(carbR.value),
      fat: round1(fatR.value),
      fiber: round1(fiberR.value),
      sugars: round1(sugarR.value),
      sodium: round1(saltR.value),
      saturatedFat: round1(entry.nutrientsSnapshot?.saturatedFat ?? 0),
      transFat: round1(entry.nutrientsSnapshot?.transFat ?? 0),
    };

    onSave(entry.id, {
      nameSnapshot: name.trim(),
      mealType,
      nutrientsSnapshot,
      grams: null,
      servings: null,
      servingGrams: null,
      servingLabel: null,
      source: 'manual',
      amountType: 'manual',
      type: 'manual',
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>Edit entry</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <X size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>Direct nutrition — no serving size</Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollInner}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Name<Text style={styles.req}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={(t) => { setName(t); if (error) setError(''); }}
                  placeholder="Food name"
                  placeholderTextColor={Colors.textTertiary}
                  selectionColor={Colors.textPrimary}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Calories<Text style={styles.req}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={calories}
                  onChangeText={(t) => { setCalories(t); if (error) setError(''); }}
                  keyboardType="decimal-pad"
                  placeholder="kcal"
                  placeholderTextColor={Colors.textTertiary}
                  selectionColor={Colors.textPrimary}
                />
              </View>

              <View style={styles.nutrientsCard}>
                <NutrientRow label="Protein" value={protein} onChange={(t) => { setProtein(t); if (error) setError(''); }} required Colors={Colors} styles={styles} />
                <View style={styles.divider} />
                <NutrientRow label="Carbs" value={carbs} onChange={(t) => { setCarbs(t); if (error) setError(''); }} required Colors={Colors} styles={styles} />
                <View style={styles.divider} />
                <NutrientRow label="Fat" value={fat} onChange={(t) => { setFat(t); if (error) setError(''); }} required Colors={Colors} styles={styles} />
                <View style={styles.divider} />
                <NutrientRow label="Fiber" value={fiber} onChange={(t) => { setFiber(t); if (error) setError(''); }} Colors={Colors} styles={styles} />
                <View style={styles.divider} />
                <NutrientRow label="Sugar" value={sugars} onChange={(t) => { setSugars(t); if (error) setError(''); }} Colors={Colors} styles={styles} />
                <View style={styles.divider} />
                <NutrientRow label="Salt" value={sodium} onChange={(t) => { setSodium(t); if (error) setError(''); }} unit="mg" Colors={Colors} styles={styles} />
              </View>

              <Text style={styles.mealLabel}>Meal</Text>
              <View style={styles.mealChips}>
                {MEALS.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.mealChip, mealType === key && styles.mealChipActive]}
                    onPress={() => setMealType(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.mealChipText, mealType === key && styles.mealChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={!isValid}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  keyboardWrap: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textTertiary,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  req: { color: Colors.error },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  nutrientsCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 16,
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  nutrientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  nutrientLabel: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    flex: 1,
  },
  nutrientInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    width: 100,
  },
  nutrientInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    paddingVertical: 8,
    textAlign: 'right',
  },
  nutrientUnit: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
    marginLeft: 4,
    width: 24,
  },
  mealLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  mealChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  mealChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  mealChipActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  mealChipText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textSecondary,
  },
  mealChipTextActive: {
    color: Colors.onPrimary,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  error: {
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
    marginTop: 8,
  },
  saveBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: Colors.textPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.onPrimary,
  },
});
