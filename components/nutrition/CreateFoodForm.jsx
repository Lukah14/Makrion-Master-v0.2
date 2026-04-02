import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, Pressable,
} from 'react-native';
import { ArrowLeft, ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import {
  SERVING_UNITS,
  validateFoodForm,
  isFormComplete,
  canConvertToGrams,
  toGrams,
} from '@/lib/servingConversion';

const INITIAL_FORM = {
  name: '',
  brand: '',
  servingAmount: '',
  servingUnit: 'g',
  servingsPerContainer: '',
  gramsEquivalent: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  saturatedFat: '',
  sugar: '',
  fiber: '',
  sodium: '',
  vitaminA: '',
  vitaminC: '',
  calcium: '',
  iron: '',
};

function FormField({ label, value, onChangeText, placeholder, required, error, keyboardType, inputRef }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>
          {label}{required && <Text style={styles.required}>*</Text>}
        </Text>
        {placeholder && <Text style={styles.fieldHint}>{placeholder}</Text>}
      </View>
      <TextInput
        ref={inputRef}
        style={[styles.fieldInput, error && styles.fieldInputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        keyboardType={keyboardType || 'default'}
        autoCorrect={false}
        selectionColor={Colors.textPrimary}
      />
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

function NutritionField({ label, value, onChangeText, unit = 'g', required, error }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.nutriFieldWrap}>
      <View style={styles.nutriRow}>
        <Text style={[styles.nutriLabel, required && styles.nutriLabelRequired]}>
          {label}{required && <Text style={styles.required}>*</Text>}
        </Text>
        <View style={styles.nutriInputWrap}>
          <TextInput
            style={[styles.nutriInput, error && styles.fieldInputError]}
            value={value}
            onChangeText={onChangeText}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
            selectionColor={Colors.textPrimary}
          />
          <Text style={styles.nutriUnit}>({unit})</Text>
        </View>
      </View>
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

function UnitPicker({ selected, onSelect, visible, onClose }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={styles.pickerSheet} onPress={() => {}}>
          <Text style={styles.pickerTitle}>Select Unit</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerScroll}>
            {SERVING_UNITS.map((u) => {
              const active = u.value === selected;
              return (
                <TouchableOpacity
                  key={u.value}
                  style={[styles.pickerOption, active && styles.pickerOptionActive]}
                  onPress={() => { onSelect(u.value); onClose(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerOptionText, active && styles.pickerOptionTextActive]}>
                    {u.label}
                  </Text>
                  {active && <Check size={18} color={Colors.textPrimary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function CreateFoodForm({ onSave, onBack, saving }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [step, setStep] = useState(1);
  const scrollRef = useRef(null);

  const set = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const handleUnitChange = (unit) => {
    setForm((prev) => {
      const amount = parseFloat(prev.servingAmount);
      const autoGrams = (Number.isFinite(amount) && amount > 0)
        ? toGrams(amount, unit)
        : null;
      return {
        ...prev,
        servingUnit: unit,
        gramsEquivalent: autoGrams != null ? String(autoGrams) : '',
      };
    });
  };

  const handleServingAmountChange = (val) => {
    setForm((prev) => {
      const amount = parseFloat(val);
      const autoGrams = (Number.isFinite(amount) && amount > 0)
        ? toGrams(amount, prev.servingUnit)
        : null;
      return {
        ...prev,
        servingAmount: val,
        gramsEquivalent: autoGrams != null ? String(autoGrams) : prev.gramsEquivalent,
      };
    });
    if (errors.servingAmount) {
      setErrors((prev) => { const next = { ...prev }; delete next.servingAmount; return next; });
    }
  };

  const goToStep2 = () => {
    const partialErrors = {};
    if (!form.name?.trim()) partialErrors.name = 'Food name is required';
    const amt = parseFloat(form.servingAmount);
    if (!Number.isFinite(amt) || amt <= 0) partialErrors.servingAmount = 'Required';
    if (!form.servingUnit?.trim()) partialErrors.servingUnit = 'Required';

    if (Object.keys(partialErrors).length > 0) {
      setErrors(partialErrors);
      return;
    }
    setStep(2);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleSave = () => {
    const { isValid, errors: validationErrors } = validateFoodForm(form);
    if (!isValid) {
      setErrors(validationErrors);
      if (validationErrors.name || validationErrors.servingAmount || validationErrors.servingUnit) {
        setStep(1);
      }
      return;
    }

    const servingAmount = parseFloat(form.servingAmount);
    const unit = form.servingUnit;
    let gramsEquivalent = parseFloat(form.gramsEquivalent);
    if (!Number.isFinite(gramsEquivalent) || gramsEquivalent <= 0) {
      gramsEquivalent = canConvertToGrams(unit) ? toGrams(servingAmount, unit) : null;
    }

    const optionalNum = (val) => {
      if (val === '' || val == null) return null;
      const n = parseFloat(val);
      return Number.isFinite(n) ? n : null;
    };

    onSave({
      name: form.name.trim(),
      brand: form.brand.trim(),
      description: form.name.trim(),
      defaultServing: {
        amount: servingAmount,
        unit,
        gramsEquivalent,
      },
      servingsPerContainer: optionalNum(form.servingsPerContainer),
      nutritionPerServing: {
        calories: parseFloat(form.calories) || 0,
        protein: parseFloat(form.protein) || 0,
        carbs: parseFloat(form.carbs) || 0,
        fat: parseFloat(form.fat) || 0,
        saturatedFat: optionalNum(form.saturatedFat),
        sugar: optionalNum(form.sugar),
        fiber: optionalNum(form.fiber),
        sodium: optionalNum(form.sodium),
        vitaminA: optionalNum(form.vitaminA),
        vitaminC: optionalNum(form.vitaminC),
        calcium: optionalNum(form.calcium),
        iron: optionalNum(form.iron),
      },
    });
  };

  const unitLabel = SERVING_UNITS.find((u) => u.value === form.servingUnit)?.label || form.servingUnit;
  const showGramsField = !canConvertToGrams(form.servingUnit);

  const step1Complete = !!(
    form.name?.trim() &&
    parseFloat(form.servingAmount) > 0 &&
    form.servingUnit?.trim()
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={step === 2 ? () => setStep(1) : onBack}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Food</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
        <View style={[styles.stepBar, step >= 2 && styles.stepBarActive]} />
        <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollInner}
        >
          {step === 1 && (
            <>
              <Text style={styles.sectionLabel}>Basic Info</Text>
              <FormField
                label="Brand name"
                value={form.brand}
                onChangeText={set('brand')}
                placeholder="ex. Campbell's"
              />
              <FormField
                label="Food name"
                value={form.name}
                onChangeText={set('name')}
                placeholder="ex. Tomato Soup"
                required
                error={errors.name}
              />

              <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Serving Info</Text>

              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Serving size"
                    value={form.servingAmount}
                    onChangeText={handleServingAmountChange}
                    placeholder="ex. 250"
                    required
                    error={errors.servingAmount}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>Unit<Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity
                      style={[styles.unitSelector, errors.servingUnit && styles.fieldInputError]}
                      onPress={() => setUnitPickerVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.unitSelectorText}>{unitLabel}</Text>
                      <ChevronDown size={16} color={Colors.textTertiary} />
                    </TouchableOpacity>
                    {errors.servingUnit && <Text style={styles.fieldError}>{errors.servingUnit}</Text>}
                  </View>
                </View>
              </View>

              {showGramsField && (
                <FormField
                  label="Gram equivalent"
                  value={form.gramsEquivalent}
                  onChangeText={set('gramsEquivalent')}
                  placeholder="ex. 50 (grams per serving)"
                  keyboardType="decimal-pad"
                />
              )}

              <FormField
                label="Servings per container"
                value={form.servingsPerContainer}
                onChangeText={set('servingsPerContainer')}
                placeholder="ex. 1"
                keyboardType="decimal-pad"
              />
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.sectionLabel}>Core Nutrition</Text>
              <Text style={styles.sectionHint}>
                Per {form.servingAmount || '1'} {form.servingUnit || 'serving'}
              </Text>

              <NutritionField label="Calories" value={form.calories} onChangeText={set('calories')} unit="kcal" required error={errors.calories} />
              <NutritionField label="Protein" value={form.protein} onChangeText={set('protein')} required error={errors.protein} />
              <NutritionField label="Carbs" value={form.carbs} onChangeText={set('carbs')} required error={errors.carbs} />
              <NutritionField label="Total fat" value={form.fat} onChangeText={set('fat')} required error={errors.fat} />

              <View style={styles.optionalDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Optional</Text>
                <View style={styles.dividerLine} />
              </View>

              <NutritionField label="Saturated fat" value={form.saturatedFat} onChangeText={set('saturatedFat')} error={errors.saturatedFat} />
              <NutritionField label="Sugar" value={form.sugar} onChangeText={set('sugar')} error={errors.sugar} />
              <NutritionField label="Fiber" value={form.fiber} onChangeText={set('fiber')} error={errors.fiber} />
              <NutritionField label="Sodium" value={form.sodium} onChangeText={set('sodium')} unit="mg" error={errors.sodium} />
              <NutritionField label="Vitamin A" value={form.vitaminA} onChangeText={set('vitaminA')} unit="%" error={errors.vitaminA} />
              <NutritionField label="Vitamin C" value={form.vitaminC} onChangeText={set('vitaminC')} unit="%" error={errors.vitaminC} />
              <NutritionField label="Calcium" value={form.calcium} onChangeText={set('calcium')} unit="%" error={errors.calcium} />
              <NutritionField label="Iron" value={form.iron} onChangeText={set('iron')} unit="%" error={errors.iron} />

              <View style={{ height: 24 }} />
            </>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          {step === 1 ? (
            <TouchableOpacity
              style={[styles.nextBtn, !step1Complete && styles.nextBtnDisabled]}
              onPress={goToStep2}
              activeOpacity={0.85}
              disabled={!step1Complete}
            >
              <Text style={[styles.nextBtnText, !step1Complete && styles.nextBtnTextDisabled]}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <Text style={styles.saveBtnText}>Save food</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      <UnitPicker
        selected={form.servingUnit}
        onSelect={handleUnitChange}
        visible={unitPickerVisible}
        onClose={() => setUnitPickerVisible(false)}
      />
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cardBackground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary,
  },
  stepIndicator: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 4,
  },
  stepDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.border,
  },
  stepDotActive: { backgroundColor: Colors.textPrimary },
  stepBar: {
    width: 40, height: 3, borderRadius: 1.5,
    backgroundColor: Colors.border,
  },
  stepBarActive: { backgroundColor: Colors.textPrimary },
  scrollContent: { flex: 1 },
  scrollInner: { paddingHorizontal: 20, paddingBottom: 24 },
  sectionLabel: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 16, marginTop: 8,
  },
  sectionHint: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary, marginBottom: 16, marginTop: -8,
  },
  fieldWrap: { marginBottom: 16 },
  fieldLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textSecondary,
  },
  fieldHint: {
    fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', color: Colors.textTertiary,
  },
  required: { color: Colors.error, fontSize: 13 },
  fieldInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, fontFamily: 'PlusJakartaSans-Regular', color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  fieldInputError: { borderColor: Colors.error },
  fieldError: {
    fontSize: 12, fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.error, marginTop: 4,
  },
  rowFields: { flexDirection: 'row', gap: 12 },
  unitSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.background,
  },
  unitSelectorText: {
    fontSize: 16, fontFamily: 'PlusJakartaSans-Regular', color: Colors.textPrimary,
  },
  nutriFieldWrap: { marginBottom: 4 },
  nutriRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  nutriLabel: {
    fontSize: 15, fontFamily: 'PlusJakartaSans-Regular', color: Colors.textSecondary,
    flex: 1,
  },
  nutriLabelRequired: {
    fontFamily: 'PlusJakartaSans-Medium', color: Colors.textPrimary,
  },
  nutriInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  nutriInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 16, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary,
    minWidth: 80, textAlign: 'right',
    backgroundColor: Colors.background,
  },
  nutriUnit: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', color: Colors.textTertiary,
    width: 36,
  },
  optionalDivider: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: {
    fontSize: 12, fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  bottomBar: {
    paddingHorizontal: 20, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  nextBtn: {
    backgroundColor: Colors.textPrimary, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: Colors.border },
  nextBtnText: {
    fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.onPrimary,
  },
  nextBtnTextDisabled: { color: Colors.textTertiary },
  saveBtn: {
    backgroundColor: Colors.textPrimary, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.onPrimary,
  },
  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: Colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    maxHeight: '60%',
  },
  pickerTitle: {
    fontSize: 18, fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary, marginBottom: 16,
  },
  pickerScroll: { flexGrow: 0 },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, marginBottom: 4,
  },
  pickerOptionActive: { backgroundColor: Colors.background },
  pickerOptionText: {
    fontSize: 15, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textSecondary,
  },
  pickerOptionTextActive: {
    fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary,
  },
});
