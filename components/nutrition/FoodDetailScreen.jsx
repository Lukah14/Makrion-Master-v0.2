import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Image, ActivityIndicator, Platform, Modal, Pressable, Alert,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import {
  ArrowLeft, Bookmark,
  Footprints, PersonStanding, Bike, Flame,
  ChevronDown, Minus, Plus, Check,
} from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useSavedFoods } from '@/hooks/useSavedFoods';
import { getCategoryIcon } from '@/components/recipes/foodCategoryIcons';
import NutritionFacts from '@/components/recipes/NutritionFacts';
import {
  normalizeServing,
  selectBestServing,
  selectGramServing,
  formatServingLabel,
  getServingDropdownOptions,
  defaultQuantityForServing,
} from '@/lib/servingUtils';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const CHART_SIZE = 100;
const STROKE_WIDTH = 20;
const RADIUS = (CHART_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const MACRO_COLORS = {
  carbs: '#FFB84D',
  fat: '#5CB8FF',
  protein: '#FF6B6B',
};

function round1(n) {
  return Math.round(n * 10) / 10;
}

function DonutSegment({ percentage, offset, color }) {
  const strokeDash = (percentage / 100) * CIRCUMFERENCE;
  const strokeGap = CIRCUMFERENCE - strokeDash;
  return (
    <Circle
      cx={CHART_SIZE / 2}
      cy={CHART_SIZE / 2}
      r={RADIUS}
      stroke={color}
      strokeWidth={STROKE_WIDTH}
      strokeDasharray={`${strokeDash} ${strokeGap}`}
      strokeDashoffset={-offset}
      strokeLinecap="butt"
      fill="transparent"
    />
  );
}

function MacroSummaryCard({ label, value, unit, color, percentage }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.macroCard}>
      <View style={[styles.macroCardAccent, { backgroundColor: color }]} />
      <Text style={styles.macroCardValue}>{value}<Text style={styles.macroCardUnit}>{unit}</Text></Text>
      <Text style={styles.macroCardLabel}>{label}</Text>
      {percentage != null && (
        <Text style={[styles.macroCardPct, { color }]}>{percentage}%</Text>
      )}
    </View>
  );
}

function CalorieBreakdownInline({ protein, carbs, fat }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const proteinKcal = protein * 4;
  const carbsKcal = carbs * 4;
  const fatKcal = fat * 9;
  const totalKcal = proteinKcal + carbsKcal + fatKcal || 1;

  const carbsPct = Math.round((carbsKcal / totalKcal) * 100);
  const fatPct = Math.round((fatKcal / totalKcal) * 100);
  const proteinPct = 100 - carbsPct - fatPct;

  const macros = [
    { label: 'Carbs', pct: carbsPct, color: MACRO_COLORS.carbs },
    { label: 'Fat', pct: fatPct, color: MACRO_COLORS.fat },
    { label: 'Protein', pct: proteinPct, color: MACRO_COLORS.protein },
  ];

  let cumulativeOffset = 0;
  const segments = macros.map((m) => {
    const seg = { ...m, offset: cumulativeOffset };
    cumulativeOffset += (m.pct / 100) * CIRCUMFERENCE;
    return seg;
  });

  return (
    <View style={styles.breakdownContainer}>
      <Text style={styles.sectionTitle}>Calorie Breakdown</Text>
      <View style={styles.breakdownContent}>
        <View style={styles.breakdownLegend}>
          {macros.map((m) => (
            <View key={m.label} style={styles.breakdownLegendItem}>
              <View style={[styles.breakdownDot, { backgroundColor: m.color }]} />
              <Text style={styles.breakdownLegendText}>{m.label} ({m.pct}%)</Text>
            </View>
          ))}
        </View>
        <View style={styles.breakdownChart}>
          <Svg width={CHART_SIZE} height={CHART_SIZE}>
            <Circle cx={CHART_SIZE / 2} cy={CHART_SIZE / 2} r={RADIUS} stroke="#F0F0F0" strokeWidth={STROKE_WIDTH} fill="transparent" />
            <G rotation="-90" origin={`${CHART_SIZE / 2}, ${CHART_SIZE / 2}`}>
              {segments.map((seg) => (
                <DonutSegment key={seg.label} percentage={seg.pct} offset={seg.offset} color={seg.color} />
              ))}
            </G>
          </Svg>
        </View>
      </View>
    </View>
  );
}

const BURN_ACTIVITIES = [
  { label: 'Steps', icon: Footprints, calcFn: (cal) => Math.round(cal / 0.04), unit: 'steps' },
  { label: 'Walking', icon: PersonStanding, calcFn: (cal) => Math.round(cal / 4.5), unit: 'min' },
  { label: 'Running', icon: Flame, calcFn: (cal) => Math.round(cal / 10), unit: 'min' },
  { label: 'Cycling', icon: Bike, calcFn: (cal) => Math.round(cal / 7.5), unit: 'min' },
];

function HowToBurnSection({ calories }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  if (!calories || calories <= 0) return null;
  return (
    <View style={styles.burnContainer}>
      <Text style={styles.sectionTitle}>How to burn {calories} calories?</Text>
      <View style={styles.burnGrid}>
        {BURN_ACTIVITIES.map((activity) => {
          const IconComp = activity.icon;
          const amount = activity.calcFn(calories);
          return (
            <View key={activity.label} style={styles.burnCard}>
              <View style={styles.burnIconWrap}>
                <IconComp size={20} color={Colors.textPrimary} strokeWidth={1.8} />
              </View>
              <Text style={styles.burnAmount}>{amount.toLocaleString()}</Text>
              <Text style={styles.burnUnit}>{activity.unit}</Text>
              <Text style={styles.burnLabel}>{activity.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ServingPicker({ servings, selectedId, onSelect, visible, onClose }) {
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

function computeNutrition(serving, quantity) {
  if (!serving) return { calories: 0, protein: 0, carbs: 0, fat: 0, saturated_fat: 0, trans_fat: 0, polyunsaturated_fat: 0, monounsaturated_fat: 0, fiber: 0, sugar: 0, cholesterol: 0, sodium: 0 };

  if (serving.isGramServing && serving.per100g) {
    const factor = quantity / 100;
    return {
      calories: Math.round(serving.per100g.calories * factor),
      protein: round1(serving.per100g.protein * factor),
      carbs: round1(serving.per100g.carbohydrate * factor),
      fat: round1(serving.per100g.fat * factor),
      saturated_fat: round1(serving.per100g.saturated_fat * factor),
      trans_fat: round1(serving.per100g.trans_fat * factor),
      polyunsaturated_fat: round1(serving.per100g.polyunsaturated_fat * factor),
      monounsaturated_fat: round1(serving.per100g.monounsaturated_fat * factor),
      fiber: round1(serving.per100g.fiber * factor),
      sugar: round1(serving.per100g.sugar * factor),
      cholesterol: Math.round(serving.per100g.cholesterol * factor),
      sodium: Math.round(serving.per100g.sodium * factor),
    };
  }

  const factor = quantity / serving.numberOfUnits;
  return {
    calories: Math.round(serving.nutrition.calories * factor),
    protein: round1(serving.nutrition.protein * factor),
    carbs: round1(serving.nutrition.carbohydrate * factor),
    fat: round1(serving.nutrition.fat * factor),
    saturated_fat: round1(serving.nutrition.saturated_fat * factor),
    trans_fat: round1(serving.nutrition.trans_fat * factor),
    polyunsaturated_fat: round1(serving.nutrition.polyunsaturated_fat * factor),
    monounsaturated_fat: round1(serving.nutrition.monounsaturated_fat * factor),
    fiber: round1(serving.nutrition.fiber * factor),
    sugar: round1(serving.nutrition.sugar * factor),
    cholesterol: Math.round(serving.nutrition.cholesterol * factor),
    sodium: Math.round(serving.nutrition.sodium * factor),
  };
}

function ensureGramServing(servingsList) {
  if (!servingsList || servingsList.length === 0) return servingsList;
  if (servingsList.some((s) => s.isGramServing)) return servingsList;

  const donor = servingsList.find((s) => s.per100g) || servingsList[0];
  if (!donor) return servingsList;

  let per100g = donor.per100g;
  if (!per100g && donor.metricAmount > 0) {
    const grams = donor.metricUnit === 'oz' ? donor.metricAmount * 28.3495 : donor.metricAmount;
    if (grams > 0) {
      const f = 100 / grams;
      per100g = {};
      for (const k of Object.keys(donor.nutrition)) per100g[k] = round1(donor.nutrition[k] * f);
    }
  }
  if (!per100g) return servingsList;

  return [
    {
      id: 'synthetic_100g',
      description: '100g',
      numberOfUnits: 100,
      metricAmount: 100,
      metricUnit: 'g',
      isDefault: false,
      isGramServing: true,
      nutrition: per100g,
      per100g,
      displayLabel: 'grams',
    },
    ...servingsList,
  ];
}

export default function FoodDetailScreen({ food: initialFood, onBack, onAddToLog }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const { isFoodSaved, toggleSaveFood } = useSavedFoods();

  const [servings, setServings] = useState(() => ensureGramServing(initialFood.servings || []));
  const [selectedServing, setSelectedServing] = useState(
    initialFood.defaultServing || (initialFood.servings ? selectBestServing(initialFood.servings) : null)
  );
  const [quantity, setQuantity] = useState(() => {
    const best = initialFood.defaultServing || (initialFood.servings ? selectBestServing(initialFood.servings) : null);
    if (!best) return 100;
    return defaultQuantityForServing(best);
  });
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (initialFood?.source === 'fatsecret' && initialFood?.id && (!initialFood.servings || initialFood.servings.length === 0)) {
      fetchFoodDetail(initialFood.id);
    }
  }, [initialFood?.id]);

  const fetchFoodDetail = async (foodId) => {
    setLoading(true);
    try {
      const url = `${SUPABASE_URL}/functions/v1/fatsecret-proxy?action=get&food_id=${foodId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      });
      if (res.ok) {
        const data = await res.json();
        const foodDetail = data?.food;
        if (foodDetail && foodDetail.servings) {
          const normalized = foodDetail.servings.map((raw, i) => {
            const metricAmount = raw.metricAmount || 0;
            const metricUnit = raw.metricUnit || '';
            const numberOfUnits = raw.numberOfUnits || 1;
            const description = raw.description || '1 serving';
            const isDefault = raw.isDefault || false;

            const isGramServing =
              description.toLowerCase() === 'g' ||
              description.toLowerCase() === '1 g' ||
              (description.match(/^[\d.]+ ?g$/i) && !description.includes('('));

            let per100g = null;
            if (metricAmount > 0 && (metricUnit === 'g' || metricUnit === 'ml' || metricUnit === 'oz')) {
              const grams = metricUnit === 'oz' ? metricAmount * 28.3495 : metricAmount;
              if (grams > 0) {
                per100g = {};
                const factor = 100 / grams;
                per100g.calories = round1(raw.calories * factor);
                per100g.protein = round1(raw.protein * factor);
                per100g.carbohydrate = round1(raw.carbohydrate * factor);
                per100g.fat = round1(raw.fat * factor);
                per100g.saturated_fat = round1(raw.saturated_fat * factor);
                per100g.trans_fat = round1(raw.trans_fat * factor);
                per100g.polyunsaturated_fat = round1(raw.polyunsaturated_fat * factor);
                per100g.monounsaturated_fat = round1(raw.monounsaturated_fat * factor);
                per100g.fiber = round1(raw.fiber * factor);
                per100g.sugar = round1(raw.sugar * factor);
                per100g.cholesterol = round1(raw.cholesterol * factor);
                per100g.sodium = round1(raw.sodium * factor);
              }
            }

            return {
              id: raw.id || `serving_${i}`,
              description,
              numberOfUnits,
              metricAmount,
              metricUnit,
              isDefault,
              isGramServing,
              nutrition: {
                calories: raw.calories || 0,
                protein: raw.protein || 0,
                carbohydrate: raw.carbohydrate || 0,
                fat: raw.fat || 0,
                saturated_fat: raw.saturated_fat || 0,
                trans_fat: raw.trans_fat || 0,
                polyunsaturated_fat: raw.polyunsaturated_fat || 0,
                monounsaturated_fat: raw.monounsaturated_fat || 0,
                fiber: raw.fiber || 0,
                sugar: raw.sugar || 0,
                cholesterol: raw.cholesterol || 0,
                sodium: raw.sodium || 0,
              },
              per100g,
              displayLabel: formatServingLabel(description, metricAmount, metricUnit, isGramServing),
            };
          });

          const withGram = ensureGramServing(normalized);
          setServings(withGram);
          const best = selectBestServing(withGram);
          if (best) {
            setSelectedServing(best);
            setQuantity(defaultQuantityForServing(best));
          }
        }
      }
    } catch {}
    setLoading(false);
  };

  const handleServingSelect = (serving) => {
    setSelectedServing(serving);
    setQuantity(defaultQuantityForServing(serving));
  };

  const nutrition = computeNutrition(selectedServing, quantity);

  const proteinKcal = nutrition.protein * 4;
  const carbsKcal = nutrition.carbs * 4;
  const fatKcal = nutrition.fat * 9;
  const totalKcal = proteinKcal + carbsKcal + fatKcal || 1;
  const proteinPct = Math.round((proteinKcal / totalKcal) * 100);
  const carbsPct = Math.round((carbsKcal / totalKcal) * 100);
  const fatPct = 100 - proteinPct - carbsPct;

  const categoryIcon = getCategoryIcon(initialFood.name);

  const isGramMode = selectedServing?.isGramServing;
  const qtyStep = isGramMode ? 10 : 0.5;
  const qtyMin = isGramMode ? 1 : 0.5;
  const qtyUnit = isGramMode ? 'g' : '';

  const decrementQty = () => setQuantity((q) => Math.max(qtyMin, round1(q - qtyStep)));
  const incrementQty = () => setQuantity((q) => round1(q + qtyStep));

  const nutritionFactsData = {
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
    saturatedFat: nutrition.saturated_fat,
    transFat: nutrition.trans_fat,
    polyunsaturatedFat: nutrition.polyunsaturated_fat,
    monounsaturatedFat: nutrition.monounsaturated_fat,
    fiber: nutrition.fiber,
    sugar: nutrition.sugar,
    cholesterol: nutrition.cholesterol,
    sodium: nutrition.sodium,
    servingSize: selectedServing
      ? (isGramMode ? `${quantity}g` : `${quantity} x ${selectedServing.description}`)
      : `${quantity}g`,
    servings: 1,
  };

  const servingLabel = selectedServing?.displayLabel || initialFood.servingText || '1 serving';

  const buildFoodForFavorite = useCallback(() => {
    let per100g = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const donor = selectedServing;
    if (donor?.per100g) {
      const p = donor.per100g;
      per100g = {
        kcal: p.calories ?? p.kcal ?? 0,
        protein: p.protein ?? 0,
        carbs: p.carbohydrate ?? p.carbs ?? 0,
        fat: p.fat ?? 0,
      };
    } else if (initialFood.per100g) {
      const p = initialFood.per100g;
      per100g = {
        kcal: p.kcal ?? p.calories ?? 0,
        protein: p.protein ?? 0,
        carbs: p.carbs ?? p.carbohydrate ?? 0,
        fat: p.fat ?? 0,
      };
    }
    const servingGrams = initialFood.servingGrams || donor?.metricAmount || 100;
    return {
      id: initialFood.id,
      name: initialFood.name,
      brand: initialFood.brand || '',
      category: initialFood.category || '',
      per100g,
      servingGrams,
      source: initialFood.source || 'fatsecret',
    };
  }, [initialFood, selectedServing]);

  const bookmarked = isFoodSaved(initialFood.id);

  const handleBookmark = async () => {
    try {
      await toggleSaveFood(buildFoodForFavorite());
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not update saved foods');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>Food Details</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleBookmark} activeOpacity={0.7}>
          <Bookmark size={20} color={bookmarked ? Colors.textPrimary : Colors.textSecondary} fill={bookmarked ? Colors.textPrimary : 'transparent'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroIconWrap}>
            <Image source={categoryIcon} style={styles.heroIcon} />
          </View>
          <Text style={styles.heroName}>{initialFood.name}</Text>
          {initialFood.brand && <Text style={styles.heroBrand}>{initialFood.brand}</Text>}
        </View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading nutrition details...</Text>
          </View>
        )}

        <View style={styles.amountSection}>
          <View style={styles.amountRow}>
            <View style={styles.amountCol}>
              <Text style={styles.amountLabel}>Amount</Text>
              <View style={styles.amountControls}>
                <TouchableOpacity onPress={decrementQty} style={styles.qtyBtn} activeOpacity={0.7}>
                  <Minus size={16} color={Colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
                <View style={styles.qtyInputWrap}>
                  <TextInput
                    style={styles.qtyInput}
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
                  {qtyUnit ? <Text style={styles.qtyUnit}>{qtyUnit}</Text> : null}
                </View>
                <TouchableOpacity onPress={incrementQty} style={styles.qtyBtn} activeOpacity={0.7}>
                  <Plus size={16} color={Colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>

            {servings.length > 0 && (
              <View style={styles.servingCol}>
                <Text style={styles.amountLabel}>Serving</Text>
                <TouchableOpacity
                  style={styles.servingSelector}
                  onPress={() => setPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.servingSelectorText} numberOfLines={1}>{servingLabel}</Text>
                  <ChevronDown size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.macroCardsRow}>
          <MacroSummaryCard label="Calories" value={nutrition.calories} unit=" kcal" color={Colors.calories} />
          <MacroSummaryCard label="Protein" value={nutrition.protein} unit="g" color={MACRO_COLORS.protein} percentage={proteinPct} />
          <MacroSummaryCard label="Carbs" value={nutrition.carbs} unit="g" color={MACRO_COLORS.carbs} percentage={carbsPct} />
          <MacroSummaryCard label="Fat" value={nutrition.fat} unit="g" color={MACRO_COLORS.fat} percentage={fatPct} />
        </View>

        <CalorieBreakdownInline protein={nutrition.protein} carbs={nutrition.carbs} fat={nutrition.fat} />

        <HowToBurnSection calories={nutrition.calories} />

        <View style={styles.nutritionFactsWrap}>
          <NutritionFacts recipe={nutritionFactsData} />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addToLogBtn}
          activeOpacity={0.85}
          onPress={() => onAddToLog?.(initialFood)}
        >
          <Plus size={20} color={Colors.onPrimary} strokeWidth={2.5} />
          <Text style={styles.addToLogText}>Add to Food Log</Text>
        </TouchableOpacity>
      </View>

      {servings.length > 0 && (
        <ServingPicker
          servings={servings}
          selectedId={selectedServing?.id}
          onSelect={handleServingSelect}
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
        />
      )}
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cardBackground },
  topBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.cardBackground, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1, fontSize: 17, fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary, textAlign: 'center', marginHorizontal: 8,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  heroSection: { alignItems: 'center', marginBottom: 24 },
  heroIconWrap: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  heroIcon: { width: 48, height: 48, resizeMode: 'contain' },
  heroName: {
    fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary,
    textAlign: 'center', marginBottom: 4,
  },
  heroBrand: { fontSize: 14, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textTertiary },
  loadingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 12, marginBottom: 8,
  },
  loadingText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textTertiary },
  amountSection: { marginBottom: 20 },
  amountRow: { flexDirection: 'row', gap: 12 },
  amountCol: { flex: 1 },
  servingCol: { flex: 1.3 },
  amountLabel: {
    fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  amountControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 40, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cardBackground,
  },
  qtyInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 12, height: 44, minWidth: 60, paddingHorizontal: 6, backgroundColor: Colors.background,
  },
  qtyInput: {
    flex: 1, fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary,
    textAlign: 'center', minWidth: 40, paddingVertical: 0,
  },
  qtyUnit: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textTertiary, marginLeft: 2 },
  servingSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 44, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 12, backgroundColor: Colors.background, gap: 6,
  },
  servingSelectorText: {
    flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary,
  },
  macroCardsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  macroCard: {
    flex: 1, backgroundColor: Colors.cardBackground, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  macroCardAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    borderTopLeftRadius: 14, borderTopRightRadius: 14,
  },
  macroCardValue: { fontSize: 17, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, marginTop: 4 },
  macroCardUnit: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textTertiary },
  macroCardLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textTertiary, marginTop: 2 },
  macroCardPct: { fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, marginBottom: 14 },
  breakdownContainer: {
    backgroundColor: Colors.cardBackground, borderRadius: 20, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: Colors.border,
  },
  breakdownContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  breakdownLegend: { flex: 1, gap: 12, paddingRight: 16 },
  breakdownLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownDot: { width: 14, height: 14, borderRadius: 3 },
  breakdownLegendText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textSecondary },
  breakdownChart: { width: CHART_SIZE, height: CHART_SIZE, flexShrink: 0 },
  burnContainer: { marginBottom: 24 },
  burnGrid: { flexDirection: 'row', gap: 10 },
  burnCard: {
    flex: 1, backgroundColor: Colors.cardBackground, borderRadius: 16, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  burnIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  burnAmount: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  burnUnit: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textTertiary, marginTop: 1 },
  burnLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', color: Colors.textTertiary, marginTop: 2 },
  nutritionFactsWrap: { marginBottom: 0 },
  bottomBar: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: Colors.cardBackground, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  addToLogBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.textPrimary, borderRadius: 16, paddingVertical: 18,
  },
  addToLogText: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.onPrimary },
  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: Colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    maxHeight: '60%',
  },
  pickerTitle: {
    fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, marginBottom: 16,
  },
  pickerScroll: { flexGrow: 0 },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4,
  },
  pickerOptionActive: { backgroundColor: Colors.background },
  pickerOptionText: { fontSize: 15, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textSecondary },
  pickerOptionTextActive: { fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary },
});
