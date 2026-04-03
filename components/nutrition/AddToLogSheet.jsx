import { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  StyleSheet, Pressable, Platform, ScrollView,
} from 'react-native';
import { X, ChevronDown, Minus, Plus, Check } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { MEAL_TYPES } from '@/data/foodDatabase';
import {
  selectBestServing,
  getServingDropdownOptions,
} from '@/lib/servingUtils';

function round1(n) {
  return Math.round(n * 10) / 10;
}

function computeNutrition(serving, quantity) {
  if (!serving) return { calories: 0, protein: 0, carbs: 0, fat: 0 };

  if (serving.isGramServing && serving.per100g) {
    const factor = quantity / 100;
    return {
      calories: Math.round(serving.per100g.calories * factor),
      protein: round1(serving.per100g.protein * factor),
      carbs: round1(serving.per100g.carbohydrate * factor),
      fat: round1(serving.per100g.fat * factor),
    };
  }

  const factor = quantity / serving.numberOfUnits;
  return {
    calories: Math.round(serving.nutrition.calories * factor),
    protein: round1(serving.nutrition.protein * factor),
    carbs: round1(serving.nutrition.carbohydrate * factor),
    fat: round1(serving.nutrition.fat * factor),
  };
}

function ServingPickerInline({ servings, selectedId, onSelect, visible, onClose }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const options = getServingDropdownOptions(servings);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={styles.pickerSheet} onPress={() => {}}>
          <Text style={styles.pickerTitle}>Select Serving</Text>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
            {options.map((s) => {
              const isSelected = s.id === selectedId;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.pickerOption, isSelected && styles.pickerOptionActive]}
                  onPress={() => { onSelect(s); onClose(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextActive]}>
                    {s.displayLabel}
                  </Text>
                  {isSelected && <Check size={18} color={Colors.textPrimary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function AddToLogSheet({ visible, food, onAdd, onClose, initialMealType }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const [mealType, setMealType] = useState('Breakfast');
  const [selectedServing, setSelectedServing] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (visible && initialMealType) {
      const label = initialMealType.charAt(0).toUpperCase() + initialMealType.slice(1);
      if (MEAL_TYPES.includes(label)) setMealType(label);
    }
  }, [visible, initialMealType]);

  useEffect(() => {
    if (food && visible) {
      const best = food.defaultServing || selectBestServing(food.servings);
      setSelectedServing(best);
      setQuantity(best ? (best.isGramServing ? 100 : 1) : 100);
    }
  }, [food?.id, visible]);

  if (!food) return null;

  const servings = food.servings || [];
  const hasServings = servings.length > 0 && selectedServing;

  let nutrition;
  if (hasServings) {
    nutrition = computeNutrition(selectedServing, quantity);
  } else {
    const factor = quantity / 100;
    nutrition = {
      calories: Math.round((food.calories || 0) * factor),
      protein: round1((food.protein || 0) * factor),
      carbs: round1((food.carbs || 0) * factor),
      fat: round1((food.fat || 0) * factor),
    };
  }

  const isGramMode = hasServings ? selectedServing.isGramServing : true;
  const qtyStep = isGramMode ? 10 : 0.5;
  const qtyMin = isGramMode ? 1 : 0.5;

  const decrementQty = () => setQuantity((q) => Math.max(qtyMin, round1(q - qtyStep)));
  const incrementQty = () => setQuantity((q) => round1(q + qtyStep));

  const handleServingSelect = (serving) => {
    setSelectedServing(serving);
    setQuantity(serving.isGramServing ? 100 : 1);
  };

  const servingLabel = hasServings
    ? selectedServing.displayLabel
    : '100g';

  const handleAdd = () => {
    onAdd({
      food,
      mealType,
      quantity,
      serving: selectedServing,
      servingLabel,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.foodName} numberOfLines={1}>{food.name}</Text>
              {food.brand && <Text style={styles.foodBrand}>{food.brand}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Meal</Text>
            <View style={styles.mealRow}>
              {MEAL_TYPES.map((m) => (
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

          <View style={styles.section}>
            <View style={styles.amountRow}>
              <View style={styles.amountCol}>
                <Text style={styles.label}>Amount</Text>
                <View style={styles.amountControls}>
                  <TouchableOpacity onPress={decrementQty} style={styles.qtyBtn} activeOpacity={0.7}>
                    <Minus size={14} color={Colors.textPrimary} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <View style={styles.qtyInputWrap}>
                    <TextInput
                      style={styles.quantityInput}
                      value={String(quantity)}
                      onChangeText={(t) => {
                        const n = parseFloat(t);
                        if (Number.isFinite(n) && n >= 0) setQuantity(n);
                        else if (t === '' || t === '0') setQuantity(0);
                      }}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                      selectionColor={Colors.textPrimary}
                    />
                    {isGramMode && <Text style={styles.qtyUnit}>g</Text>}
                  </View>
                  <TouchableOpacity onPress={incrementQty} style={styles.qtyBtn} activeOpacity={0.7}>
                    <Plus size={14} color={Colors.textPrimary} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>

              {servings.length > 1 && (
                <View style={styles.servingCol}>
                  <Text style={styles.label}>Serving</Text>
                  <TouchableOpacity
                    style={styles.servingSelector}
                    onPress={() => setPickerVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.servingSelectorText} numberOfLines={1}>{servingLabel}</Text>
                    <ChevronDown size={14} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              )}

              {servings.length === 1 && (
                <View style={styles.servingCol}>
                  <Text style={styles.label}>Serving</Text>
                  <View style={styles.servingDisplay}>
                    <Text style={styles.servingDisplayText} numberOfLines={1}>{servingLabel}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={styles.nutritionPreview}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionVal}>{nutrition.calories}</Text>
              <Text style={styles.nutritionLabel}>kcal</Text>
            </View>
            <View style={styles.nutritionDivider} />
            <View style={styles.nutritionItem}>
              <Text style={[styles.nutritionVal, { color: '#FF6B6B' }]}>{nutrition.protein}g</Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            <View style={styles.nutritionDivider} />
            <View style={styles.nutritionItem}>
              <Text style={[styles.nutritionVal, { color: '#FFB84D' }]}>{nutrition.carbs}g</Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>
            <View style={styles.nutritionDivider} />
            <View style={styles.nutritionItem}>
              <Text style={[styles.nutritionVal, { color: '#5CB8FF' }]}>{nutrition.fat}g</Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.85}>
            <Text style={styles.addBtnText}>Add to Food Log</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>

      {servings.length > 1 && (
        <ServingPickerInline
          servings={servings}
          selectedId={selectedServing?.id}
          onSelect={handleServingSelect}
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
        />
      )}
    </Modal>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  foodName: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  foodBrand: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginBottom: 20 },
  label: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  mealRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mealChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBackground,
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
  amountRow: {
    flexDirection: 'row',
    gap: 12,
  },
  amountCol: { flex: 1 },
  servingCol: { flex: 1.3 },
  amountControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 36,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
  },
  qtyInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    height: 44,
    minWidth: 56,
    paddingHorizontal: 6,
    backgroundColor: Colors.background,
  },
  quantityInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    minWidth: 36,
    paddingVertical: 0,
  },
  qtyUnit: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
    marginLeft: 2,
  },
  servingSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    gap: 6,
  },
  servingSelectorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  servingDisplay: {
    height: 44,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    justifyContent: 'center',
  },
  servingDisplayText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  nutritionPreview: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 20,
  },
  nutritionItem: {
    flex: 1,
    alignItems: 'center',
  },
  nutritionVal: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  nutritionLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  nutritionDivider: {
    width: 1,
    backgroundColor: Colors.border,
    height: '80%',
    alignSelf: 'center',
  },
  addBtn: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.onPrimary,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    maxHeight: '50%',
  },
  pickerTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  pickerScroll: { flexGrow: 0 },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  pickerOptionActive: { backgroundColor: Colors.background },
  pickerOptionText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textSecondary,
  },
  pickerOptionTextActive: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
});
