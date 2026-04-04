import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  StyleSheet, SafeAreaView, TextInput,
} from 'react-native';
import { X, Search, Plus, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import {
  EMPTY_RECIPE_FILTERS,
  SORT_OPTIONS,
  countActiveFilters,
} from '@/lib/recipeFilters';

export { EMPTY_RECIPE_FILTERS as EMPTY_FILTERS } from '@/lib/recipeFilters';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
const NUTRITION_GOALS = ['High Protein', 'Low Calorie', 'Low Carb', 'Low Fat', 'Balanced'];
const CALORIE_PRESETS = [
  { value: '0-200', label: '0–200 kcal' },
  { value: '200-400', label: '200–400 kcal' },
  { value: '400-600', label: '400–600 kcal' },
  { value: 'custom', label: 'Custom range' },
];
const MACRO_PRESETS = [
  { value: '0-10', label: '0–10g' },
  { value: '10-20', label: '10–20g' },
  { value: '20+', label: '20g+' },
];
const CARB_PRESETS = [
  { value: '0-20', label: '0–20g' },
  { value: '20-40', label: '20–40g' },
  { value: '40+', label: '40g+' },
];
const FAT_PRESETS = MACRO_PRESETS;
const TIME_PRESETS = ['Under 10 min', 'Under 20 min', 'Under 30 min', '30+ min'];
const TOTAL_TIME_PRESETS = [
  { value: 'Quick recipes', label: 'Quick (≤20 min total)' },
  { value: 'Medium recipes', label: 'Medium (21–45 min)' },
  { value: 'Long recipes', label: 'Long (45+ min)' },
];
const DIETARY_PREFS = [
  'Vegetarian',
  'Vegan',
  'Gluten Free',
  'Dairy Free',
  'High Fiber',
  'Keto-friendly',
];
const INGREDIENT_SUGGESTIONS = [
  'chicken', 'egg', 'oats', 'rice', 'avocado', 'tomato', 'salmon', 'broccoli', 'banana', 'pasta',
];

const SECTION_LIMIT = 8;

function IngredientChip({ label, onRemove }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <View style={styles.ingChip}>
      <Text style={styles.ingChipLabel} numberOfLines={1}>{label}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
        <X size={12} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function SectionTitle({ title, count }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count > 0 && (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function ChipGrid({ options, selected, onToggle, singleKey, expanded, onExpand, limit = SECTION_LIMIT }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const list = typeof options[0] === 'string' ? options.map((o) => ({ value: o, label: o })) : options;
  const vis = expanded ? list : list.slice(0, limit);
  return (
    <View style={styles.chipWrap}>
      {vis.map((opt) => {
        const val = opt.value ?? opt;
        const active = singleKey
          ? selected === val
          : (selected || []).includes(val);
        return (
          <TouchableOpacity
            key={String(val)}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onToggle(val)}
            activeOpacity={0.7}
          >
            {active && <View style={styles.chipDot} />}
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label ?? opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MultiChipRow({ options, selected, onToggle, expanded, onExpand, limit = SECTION_LIMIT }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const vis = expanded ? options : options.slice(0, limit);
  const hasMore = options.length > limit;
  return (
    <>
      <View style={styles.chipWrap}>
        {vis.map((opt) => {
          const active = selected.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onToggle(opt)}
              activeOpacity={0.7}
            >
              {active && <View style={styles.chipDot} />}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {hasMore && (
        <TouchableOpacity style={styles.expandBtn} onPress={onExpand} activeOpacity={0.7}>
          {expanded ? <ChevronUp size={15} color={Colors.textTertiary} /> : <ChevronDown size={15} color={Colors.textTertiary} />}
          <Text style={styles.expandText}>{expanded ? 'Show less' : `Show ${options.length - limit} more`}</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

export default function RecipeFilterSheet({ visible, filters, onApply, onClose }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [local, setLocal] = useState(() => ({ ...EMPTY_RECIPE_FILTERS, ...filters }));
  const [ingQ, setIngQ] = useState('');
  const [exQ, setExQ] = useState('');
  const [showIngSuggest, setShowIngSuggest] = useState(false);
  const [showExSuggest, setShowExSuggest] = useState(false);
  const [expandMeal, setExpandMeal] = useState(false);
  const [expandDiet, setExpandDiet] = useState(false);
  const prevVisible = useRef(false);

  useEffect(() => {
    if (visible && !prevVisible.current) {
      setLocal({ ...EMPTY_RECIPE_FILTERS, ...filters });
    }
    prevVisible.current = visible;
  }, [visible, filters]);

  const sync = (patch) => setLocal((p) => ({ ...p, ...patch }));

  const toggleArr = (key, val) => {
    setLocal((p) => {
      const arr = [...(p[key] || [])];
      const i = arr.indexOf(val);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(val);
      return { ...p, [key]: arr };
    });
  };

  const toggleSingle = (key, val) => {
    setLocal((p) => ({ ...p, [key]: p[key] === val ? null : val }));
  };

  const addInclude = (raw) => {
    const t = (raw || ingQ).trim();
    if (!t) return;
    setLocal((p) => {
      const arr = [...(p.ingredientsInclude || [])];
      if (!arr.some((x) => x.toLowerCase() === t.toLowerCase())) arr.push(t);
      return { ...p, ingredientsInclude: arr };
    });
    setIngQ('');
    setShowIngSuggest(false);
  };

  const addExclude = (raw) => {
    const t = (raw || exQ).trim();
    if (!t) return;
    setLocal((p) => {
      const arr = [...(p.ingredientsExclude || [])];
      if (!arr.some((x) => x.toLowerCase() === t.toLowerCase())) arr.push(t);
      return { ...p, ingredientsExclude: arr };
    });
    setExQ('');
    setShowExSuggest(false);
  };

  const reset = () => {
    setLocal({ ...EMPTY_RECIPE_FILTERS });
    setIngQ('');
    setExQ('');
  };

  const apply = () => {
    onApply({ ...local });
    onClose();
  };

  const totalActive = countActiveFilters(local);
  const sugIng = INGREDIENT_SUGGESTIONS.filter(
    (s) =>
      !local.ingredientsInclude?.some((i) => i.toLowerCase() === s) &&
      (ingQ.length === 0 || s.includes(ingQ.toLowerCase()))
  ).slice(0, 8);
  const sugEx = INGREDIENT_SUGGESTIONS.filter(
    (s) =>
      !local.ingredientsExclude?.some((i) => i.toLowerCase() === s) &&
      (exQ.length === 0 || s.includes(exQ.toLowerCase()))
  ).slice(0, 8);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Filter Recipes</Text>
          {totalActive > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{totalActive}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <SectionTitle title="Sort by" count={local.sortBy !== 'relevance' ? 1 : 0} />
            <ChipGrid
              options={SORT_OPTIONS}
              selected={local.sortBy}
              singleKey
              onToggle={(val) => sync({ sortBy: local.sortBy === val ? 'relevance' : val })}
              expanded
            />
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <SectionTitle title="Meal type" count={local.mealType?.length || 0} />
            <MultiChipRow
              options={MEAL_TYPES}
              selected={local.mealType || []}
              onToggle={(v) => toggleArr('mealType', v)}
              expanded={expandMeal}
              onExpand={() => setExpandMeal(!expandMeal)}
              limit={5}
            />
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <SectionTitle title="Nutrition goal" count={local.nutritionGoal?.length || 0} />
            <MultiChipRow
              options={NUTRITION_GOALS}
              selected={local.nutritionGoal || []}
              onToggle={(v) => toggleArr('nutritionGoal', v)}
              expanded={expandDiet}
              onExpand={() => setExpandDiet(!expandDiet)}
              limit={5}
            />
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <SectionTitle title="Calories (per serving)" count={local.calorieRange ? 1 : 0} />
            <ChipGrid
              options={CALORIE_PRESETS}
              selected={local.calorieRange}
              singleKey
              onToggle={(v) => toggleSingle('calorieRange', v)}
              expanded
            />
            {local.calorieRange === 'custom' && (
              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Min"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                  value={local.calorieMin}
                  onChangeText={(t) => sync({ calorieMin: t })}
                />
                <Text style={styles.customSep}>–</Text>
                <TextInput
                  style={styles.customInput}
                  placeholder="Max"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                  value={local.calorieMax}
                  onChangeText={(t) => sync({ calorieMax: t })}
                />
              </View>
            )}
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <SectionTitle title="Protein (per serving)" count={local.proteinRange ? 1 : 0} />
            <ChipGrid options={MACRO_PRESETS} selected={local.proteinRange} singleKey onToggle={(v) => toggleSingle('proteinRange', v)} expanded />
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <SectionTitle title="Carbs (per serving)" count={local.carbsRange ? 1 : 0} />
            <ChipGrid options={CARB_PRESETS} selected={local.carbsRange} singleKey onToggle={(v) => toggleSingle('carbsRange', v)} expanded />
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <SectionTitle title="Fat (per serving)" count={local.fatRange ? 1 : 0} />
            <ChipGrid options={FAT_PRESETS} selected={local.fatRange} singleKey onToggle={(v) => toggleSingle('fatRange', v)} expanded />
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <SectionTitle title="Prep time" count={local.prepTime?.length || 0} />
            <MultiChipRow options={TIME_PRESETS} selected={local.prepTime || []} onToggle={(v) => toggleArr('prepTime', v)} expanded limit={8} />
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <SectionTitle title="Cook time" count={local.cookTime?.length || 0} />
            <MultiChipRow options={TIME_PRESETS} selected={local.cookTime || []} onToggle={(v) => toggleArr('cookTime', v)} expanded limit={8} />
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <SectionTitle title="Total time" count={local.totalTime?.length || 0} />
            <MultiChipRow
              options={TOTAL_TIME_PRESETS.map((x) => x.label)}
              selected={local.totalTime || []}
              onToggle={(v) => toggleArr('totalTime', v)}
              expanded
              limit={8}
            />
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <SectionTitle title="Include ingredients" count={local.ingredientsInclude?.length || 0} />
            <View style={styles.ingredientSearch}>
              <Search size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.ingredientInput}
                placeholder="e.g. chicken, oats…"
                placeholderTextColor={Colors.textTertiary}
                value={ingQ}
                onChangeText={(t) => { setIngQ(t); setShowIngSuggest(true); }}
                onFocus={() => setShowIngSuggest(true)}
                onSubmitEditing={() => addInclude()}
              />
              <TouchableOpacity onPress={() => addInclude()} activeOpacity={0.7}>
                <Plus size={18} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {showIngSuggest && sugIng.length > 0 && (
              <View style={styles.suggestionsBox}>
                {sugIng.map((s) => (
                  <TouchableOpacity key={s} style={styles.suggestionRow} onPress={() => addInclude(s)} activeOpacity={0.7}>
                    <Text style={styles.suggestionText}>{s}</Text>
                    <Plus size={14} color={Colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.ingChipRow}>
              {(local.ingredientsInclude || []).map((ing) => (
                <IngredientChip key={ing} label={ing} onRemove={() => setLocal((p) => ({ ...p, ingredientsInclude: p.ingredientsInclude.filter((x) => x !== ing) }))} />
              ))}
            </View>
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <SectionTitle title="Exclude ingredients" count={local.ingredientsExclude?.length || 0} />
            <View style={styles.ingredientSearch}>
              <Search size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.ingredientInput}
                placeholder="e.g. dairy, nuts…"
                placeholderTextColor={Colors.textTertiary}
                value={exQ}
                onChangeText={(t) => { setExQ(t); setShowExSuggest(true); }}
                onFocus={() => setShowExSuggest(true)}
                onSubmitEditing={() => addExclude()}
              />
              <TouchableOpacity onPress={() => addExclude()} activeOpacity={0.7}>
                <Plus size={18} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {showExSuggest && sugEx.length > 0 && (
              <View style={styles.suggestionsBox}>
                {sugEx.map((s) => (
                  <TouchableOpacity key={s} style={styles.suggestionRow} onPress={() => addExclude(s)} activeOpacity={0.7}>
                    <Text style={styles.suggestionText}>{s}</Text>
                    <Plus size={14} color={Colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.ingChipRow}>
              {(local.ingredientsExclude || []).map((ing) => (
                <IngredientChip key={ing} label={ing} onRemove={() => setLocal((p) => ({ ...p, ingredientsExclude: p.ingredientsExclude.filter((x) => x !== ing) }))} />
              ))}
            </View>
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <SectionTitle title="Dietary preferences" count={local.dietary?.length || 0} />
            <MultiChipRow options={DIETARY_PREFS} selected={local.dietary || []} onToggle={(v) => toggleArr('dietary', v)} expanded limit={8} />
            <View style={{ height: 24 }} />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetBtn} onPress={reset} activeOpacity={0.7}>
            <Text style={styles.resetText}>{totalActive > 0 ? `Reset (${totalActive})` : 'Reset'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtn} onPress={apply} activeOpacity={0.85}>
            <Text style={styles.applyText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cardBackground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  headerBadge: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.onPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 8 },
  section: { paddingTop: 18 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  sectionBadge: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBackground,
    gap: 5,
  },
  chipActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.onPrimary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.onPrimary,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  customSep: { fontSize: 16, color: Colors.textTertiary },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  expandText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 16,
  },
  ingredientSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ingredientInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textPrimary,
  },
  suggestionsBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
  },
  ingChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  ingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ingChipLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    maxWidth: 120,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.onPrimary,
  },
});
