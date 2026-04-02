import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, Pressable, Platform,
  KeyboardAvoidingView, ScrollView, ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

function NutrientRow({ label, value, onChange, unit = 'g', required, indent }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={[styles.nutrientRow, indent && styles.nutrientRowIndent]}>
      <Text style={[styles.nutrientLabel, indent && styles.nutrientLabelSub]}>
        {indent && <Text style={styles.indent}>  </Text>}
        {label}
        {required && <Text style={styles.req}>*</Text>}
      </Text>
      <View style={[styles.nutrientInputWrap, indent && styles.nutrientInputWrapSub]}>
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

const INITIAL = {
  name: '', calories: '',
  protein: '', carbs: '', fiber: '', sugars: '',
  fat: '', saturatedFat: '', transFat: '',
  sodium: '',
};

export default function ManualAddSheet({ visible, onAdd, onClose }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const [form, setForm] = useState(INITIAL);
  const [mealType, setMealType] = useState('Breakfast');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (error) setError('');
  };

  const calNum = parseFloat(form.calories);
  const isValid = Number.isFinite(calNum) && calNum >= 0 && mealType;

  const reset = () => {
    setForm(INITIAL);
    setMealType('Breakfast');
    setError('');
    setSaving(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleAdd = async () => {
    if (!isValid) { setError('Enter a valid calorie amount'); return; }
    setError('');
    setSaving(true);

    const opt = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };

    try {
      await onAdd({
        name: form.name.trim() || 'Quick entry',
        calories: Math.round(calNum),
        protein: opt(form.protein),
        carbs: opt(form.carbs),
        fiber: opt(form.fiber),
        sugars: opt(form.sugars),
        fat: opt(form.fat),
        saturatedFat: opt(form.saturatedFat),
        transFat: opt(form.transFat),
        sodium: opt(form.sodium),
        mealType: mealType.toLowerCase(),
      });
      reset();
      onClose();
    } catch {
      setError('Failed to log. Try again.');
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>Manual Add</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                <X size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollInner}
            >
              {/* Name */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Lunch snack"
                  placeholderTextColor={Colors.textTertiary}
                  value={form.name}
                  onChangeText={set('name')}
                  autoCorrect={false}
                  selectionColor={Colors.textPrimary}
                />
              </View>

              {/* Calories — prominent */}
              <View style={styles.calorieField}>
                <Text style={styles.calorieLabel}>Calories<Text style={styles.req}>*</Text></Text>
                <View style={styles.calorieInputWrap}>
                  <TextInput
                    style={styles.calorieInput}
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                    value={form.calories}
                    onChangeText={set('calories')}
                    keyboardType="decimal-pad"
                    selectionColor={Colors.textPrimary}
                  />
                  <Text style={styles.calorieUnit}>kcal</Text>
                </View>
              </View>

              {/* Nutrition table */}
              <View style={styles.nutrientsCard}>
                <NutrientRow label="Protein"           value={form.protein}      onChange={set('protein')} />
                <View style={styles.divider} />
                <NutrientRow label="Total Carbohydrate" value={form.carbs}       onChange={set('carbs')} />
                <NutrientRow label="Dietary Fiber"      value={form.fiber}       onChange={set('fiber')} indent />
                <NutrientRow label="Sugars"             value={form.sugars}      onChange={set('sugars')} indent />
                <View style={styles.divider} />
                <NutrientRow label="Total Fat"          value={form.fat}         onChange={set('fat')} />
                <NutrientRow label="Saturated Fat"      value={form.saturatedFat} onChange={set('saturatedFat')} indent />
                <NutrientRow label="Trans Fat"          value={form.transFat}    onChange={set('transFat')} indent />
                <View style={styles.divider} />
                <NutrientRow label="Sodium"             value={form.sodium}      onChange={set('sodium')} unit="mg" />
              </View>

              {/* Meal selector */}
              <View style={styles.mealSection}>
                <Text style={styles.mealLabel}>Add to<Text style={styles.req}>*</Text></Text>
                <View style={styles.mealChips}>
                  {MEALS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.mealChip, mealType === m && styles.mealChipActive]}
                      onPress={() => setMealType(m)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.mealChipText, mealType === m && styles.mealChipTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>

            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={[styles.addBtn, !isValid && styles.addBtnDisabled]}
                onPress={handleAdd}
                activeOpacity={0.85}
                disabled={!isValid || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.onPrimary} />
                ) : (
                  <Text style={[styles.addBtnText, !isValid && styles.addBtnTextDisabled]}>
                    Add to Food Log
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
  keyboardWrap: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  handle: {
    width: 36, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginTop: 12,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  title: {
    fontSize: 20, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollInner: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },

  field: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textSecondary, marginBottom: 8,
  },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textPrimary, backgroundColor: Colors.background,
  },

  calorieField: { marginBottom: 20 },
  calorieLabel: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary, marginBottom: 10,
  },
  req: { color: Colors.error },
  calorieInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.textPrimary, borderRadius: 16,
    backgroundColor: Colors.background, paddingHorizontal: 16,
  },
  calorieInput: {
    flex: 1, fontSize: 28, fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary, paddingVertical: 16, textAlign: 'left',
  },
  calorieUnit: {
    fontSize: 16, fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary, marginLeft: 8,
  },

  nutrientsCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 4,
    marginBottom: 24,
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
    paddingVertical: 11,
  },
  nutrientRowIndent: {
    paddingLeft: 36,
  },
  nutrientLabel: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    flex: 1,
  },
  nutrientLabelSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textSecondary,
    fontSize: 14,
  },
  indent: {
    color: 'transparent',
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
  nutrientInputWrapSub: {
    width: 90,
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
    width: 20,
  },

  mealSection: { marginBottom: 16 },
  mealLabel: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary, marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  mealChips: {
    flexDirection: 'row', gap: 8, flexWrap: 'wrap',
  },
  mealChip: {
    flex: 1, minWidth: '22%',
    paddingVertical: 12, alignItems: 'center',
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  mealChipActive: {
    backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary,
  },
  mealChipText: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textSecondary,
  },
  mealChipTextActive: {
    color: Colors.onPrimary, fontFamily: 'PlusJakartaSans-SemiBold',
  },

  error: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.error, textAlign: 'center', marginTop: 4,
  },
  bottomBar: {
    paddingHorizontal: 20, paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  addBtn: {
    backgroundColor: Colors.textPrimary, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: Colors.border },
  addBtnText: {
    fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.onPrimary,
  },
  addBtnTextDisabled: { color: Colors.textTertiary },
});
