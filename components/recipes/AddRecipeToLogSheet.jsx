import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  SafeAreaView, ScrollView,
} from 'react-native';
import { X, Minus, Plus, Check } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch', label: 'Lunch', emoji: '🥗' },
  { id: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { id: 'snack', label: 'Snack', emoji: '🍎' },
];

const DEFAULT_LOG_SERVINGS = 1;

export default function AddRecipeToLogSheet({ visible, recipe, onAdd, onClose }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const [servings, setServings] = useState(DEFAULT_LOG_SERVINGS);
  const [mealType, setMealType] = useState('lunch');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!visible || !recipe) return;
    setServings(DEFAULT_LOG_SERVINGS);
  }, [visible, recipe?.id]);

  if (!recipe) return null;

  const nps = recipe.nutritionPerServing || {};
  const perServing = {
    calories: nps.kcal || nps.calories || recipe.calories || 0,
    protein: nps.protein || recipe.protein || 0,
    carbs: nps.carbs || recipe.carbs || 0,
    fat: nps.fat || recipe.fat || 0,
  };

  const total = {
    calories: Math.round(perServing.calories * servings),
    protein: Math.round(perServing.protein * servings),
    carbs: Math.round(perServing.carbs * servings),
    fat: Math.round(perServing.fat * servings),
  };

  const handleAdd = () => {
    setAdded(true);
    setTimeout(() => {
      onAdd({ recipe, servings, mealType, ...total });
      setAdded(false);
      setServings(DEFAULT_LOG_SERVINGS);
      setMealType('lunch');
    }, 600);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add to Food Log</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.recipeNameRow}>
            <Text style={styles.recipeName}>{recipe.name}</Text>
            <Text style={styles.recipeCategory}>{recipe.category}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Servings</Text>
            <View style={styles.servingControl}>
              <TouchableOpacity
                style={[styles.servingBtn, servings <= 0.5 && styles.servingBtnDisabled]}
                onPress={() => setServings((s) => Math.max(0.5, s - 0.5))}
                activeOpacity={0.7}
              >
                <Minus size={18} color={servings <= 0.5 ? Colors.textTertiary : Colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
              <View style={styles.servingDisplay}>
                <Text style={styles.servingValue}>{servings}</Text>
                <Text style={styles.servingUnit}>serving{servings !== 1 ? 's' : ''}</Text>
              </View>
              <TouchableOpacity
                style={styles.servingBtn}
                onPress={() => setServings((s) => s + 0.5)}
                activeOpacity={0.7}
              >
                <Plus size={18} color={Colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Meal type</Text>
            <View style={styles.mealTypeRow}>
              {MEAL_TYPES.map((mt) => (
                <TouchableOpacity
                  key={mt.id}
                  style={[styles.mealTypeBtn, mealType === mt.id && styles.mealTypeBtnActive]}
                  onPress={() => setMealType(mt.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.mealTypeEmoji}>{mt.emoji}</Text>
                  <Text style={[styles.mealTypeLabel, mealType === mt.id && styles.mealTypeLabelActive]}>
                    {mt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.nutritionCard}>
            <Text style={styles.cardLabel}>Nutrition summary</Text>
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{total.calories}</Text>
                <Text style={styles.macroLabel}>kcal</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: Colors.proteinRing }]}>{total.protein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: Colors.carbsRing }]}>{total.carbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: Colors.fatRing }]}>{total.fat}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
            <Text style={styles.perServingNote}>Per {servings} serving{servings !== 1 ? 's' : ''}</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.addBtn, added && styles.addBtnSuccess]}
            onPress={handleAdd}
            activeOpacity={0.85}
          >
            {added ? (
              <>
                <Check size={20} color={Colors.onPrimary} strokeWidth={2.5} />
                <Text style={styles.addBtnText}>Added!</Text>
              </>
            ) : (
              <Text style={styles.addBtnText}>Add to Food Log</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  scroll: { flex: 1, padding: 16 },
  recipeNameRow: { marginBottom: 16 },
  recipeName: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  recipeCategory: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  servingControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingBtnDisabled: { opacity: 0.4 },
  servingDisplay: { alignItems: 'center' },
  servingValue: {
    fontSize: 32,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  servingUnit: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTypeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    gap: 4,
  },
  mealTypeBtnActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  mealTypeEmoji: { fontSize: 20 },
  mealTypeLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
  mealTypeLabelActive: { color: Colors.onPrimary },
  nutritionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  macroItem: { flex: 1, alignItems: 'center' },
  macroValue: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  macroLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  macroDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  perServingNote: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.textPrimary,
    borderRadius: 18,
    paddingVertical: 18,
  },
  addBtnSuccess: { backgroundColor: Colors.success },
  addBtnText: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.onPrimary,
  },
});
