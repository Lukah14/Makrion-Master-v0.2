import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  StyleSheet, SafeAreaView, TextInput, Switch, Animated,
} from 'react-native';
import { X, Search, Plus, ChevronDown, ChevronUp, Pencil } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { RECIPE_FILTER_OPTIONS } from '@/data/recipeData';

export const EMPTY_FILTERS = {
  mealType: [],
  diet: [],
  cookTime: [],
  cuisine: [],
  nutrition: [],
  ingredients: [],
  applyPreferences: false,
  savedOnly: false,
};

const INGREDIENT_SUGGESTIONS = [
  'Chicken', 'Ground Beef', 'Salmon', 'Eggs', 'Tofu',
  'Banana', 'Oats', 'Yogurt', 'Avocado', 'Tomato',
];

const SECTION_INITIAL_COUNT = 6;

function IngredientChip({ label, onRemove }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.ingChip}>
      <View style={styles.ingAvatar}>
        <Text style={styles.ingAvatarText}>{label.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.ingChipLabel} numberOfLines={1}>{label}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
        <X size={12} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function ToggleRow({ label, value, onToggle, onEdit, editLabel }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={styles.toggleRight}>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.editLink} activeOpacity={0.7}>
            <Pencil size={13} color={Colors.primary} />
            <Text style={styles.editLinkText}>{editLabel || 'Edit'}</Text>
          </TouchableOpacity>
        )}
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={Colors.border}
        />
      </View>
    </View>
  );
}

function FilterSection({ title, options, selected, onToggle, initialCount }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const [expanded, setExpanded] = useState(false);
  const limit = initialCount ?? SECTION_INITIAL_COUNT;
  const visible = expanded ? options : options.slice(0, limit);
  const hasMore = options.length > limit;

  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {selected.length > 0 && (
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{selected.length}</Text>
          </View>
        )}
      </View>
      <View style={styles.chipWrap}>
        {visible.map((opt) => {
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
        <TouchableOpacity style={styles.expandBtn} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
          {expanded ? <ChevronUp size={15} color={Colors.textTertiary} /> : <ChevronDown size={15} color={Colors.textTertiary} />}
          <Text style={styles.expandText}>{expanded ? `Show less` : `Show ${options.length - limit} more`}</Text>
        </TouchableOpacity>
      )}
      <View style={styles.divider} />
    </View>
  );
}

export default function RecipeFilterSheet({ visible, filters, onApply, onClose }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const [localFilters, setLocalFilters] = useState(filters || EMPTY_FILTERS);
  const [ingredientQuery, setIngredientQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const ingredients = localFilters.ingredients || [];

  const syncFilters = (updater) => {
    setLocalFilters((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  };

  const toggleChip = (key, value) => {
    syncFilters((prev) => {
      const arr = prev[key] || [];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  };

  const addIngredient = (ing) => {
    const trimmed = (ing || ingredientQuery).trim();
    if (!trimmed) return;
    if (!ingredients.map((i) => i.toLowerCase()).includes(trimmed.toLowerCase())) {
      syncFilters((prev) => ({
        ...prev,
        ingredients: [...(prev.ingredients || []), trimmed],
      }));
    }
    setIngredientQuery('');
    setShowSuggestions(false);
  };

  const removeIngredient = (ing) => {
    syncFilters((prev) => ({
      ...prev,
      ingredients: (prev.ingredients || []).filter((i) => i !== ing),
    }));
  };

  const reset = () => {
    setLocalFilters(EMPTY_FILTERS);
    setIngredientQuery('');
    setShowSuggestions(false);
  };

  const apply = () => {
    onApply(localFilters);
    onClose();
  };

  const totalActive =
    (localFilters.mealType?.length || 0) +
    (localFilters.diet?.length || 0) +
    (localFilters.cookTime?.length || 0) +
    (localFilters.cuisine?.length || 0) +
    (localFilters.nutrition?.length || 0) +
    (localFilters.ingredients?.length || 0) +
    (localFilters.applyPreferences ? 1 : 0) +
    (localFilters.savedOnly ? 1 : 0);

  const filteredSuggestions = INGREDIENT_SUGGESTIONS.filter(
    (s) =>
      ingredientQuery.length === 0 ||
      s.toLowerCase().includes(ingredientQuery.toLowerCase())
  ).filter((s) => !ingredients.map((i) => i.toLowerCase()).includes(s.toLowerCase()));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Filters</Text>
          {totalActive > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{totalActive}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
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
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Search by ingredients</Text>
              <TouchableOpacity onPress={() => addIngredient()} activeOpacity={0.7}>
                <View style={styles.addBtn}>
                  <Plus size={14} color={Colors.primary} />
                  <Text style={styles.addBtnText}>Add</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.ingredientSearch}>
              <Search size={16} color={Colors.textTertiary} />
              <TextInput
                ref={inputRef}
                style={styles.ingredientInput}
                placeholder="e.g. chicken, banana, oats..."
                placeholderTextColor={Colors.textTertiary}
                value={ingredientQuery}
                onChangeText={(t) => {
                  setIngredientQuery(t);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onSubmitEditing={() => addIngredient()}
                returnKeyType="done"
              />
              {ingredientQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setIngredientQuery(''); setShowSuggestions(false); }} activeOpacity={0.7}>
                  <X size={15} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {showSuggestions && filteredSuggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {filteredSuggestions.slice(0, 6).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.suggestionRow}
                    onPress={() => addIngredient(s)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.ingAvatar}>
                      <Text style={styles.ingAvatarText}>{s.charAt(0)}</Text>
                    </View>
                    <Text style={styles.suggestionText}>{s}</Text>
                    <Plus size={14} color={Colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {ingredients.length > 0 && (
              <View style={styles.ingChipRow}>
                {ingredients.map((ing) => (
                  <IngredientChip key={ing} label={ing} onRemove={() => removeIngredient(ing)} />
                ))}
              </View>
            )}
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <ToggleRow
              label="Apply Preferences"
              value={localFilters.applyPreferences}
              onToggle={(v) => syncFilters((p) => ({ ...p, applyPreferences: v }))}
              onEdit={() => {}}
              editLabel="Edit"
            />
            <View style={{ height: 12 }} />
            <ToggleRow
              label="Recipes I've Saved"
              value={localFilters.savedOnly}
              onToggle={(v) => syncFilters((p) => ({ ...p, savedOnly: v }))}
            />
            <View style={styles.divider} />
          </View>

          <FilterSection
            title="Meal Type"
            options={RECIPE_FILTER_OPTIONS.mealType}
            selected={localFilters.mealType}
            onToggle={(v) => toggleChip('mealType', v)}
          />
          <FilterSection
            title="Diet"
            options={RECIPE_FILTER_OPTIONS.diet}
            selected={localFilters.diet}
            onToggle={(v) => toggleChip('diet', v)}
          />
          <FilterSection
            title="Cook Time"
            options={RECIPE_FILTER_OPTIONS.cookTime}
            selected={localFilters.cookTime}
            onToggle={(v) => toggleChip('cookTime', v)}
            initialCount={3}
          />
          <FilterSection
            title="Cuisine"
            options={RECIPE_FILTER_OPTIONS.cuisine}
            selected={localFilters.cuisine}
            onToggle={(v) => toggleChip('cuisine', v)}
          />
          <FilterSection
            title="Nutrition"
            options={RECIPE_FILTER_OPTIONS.nutrition}
            selected={localFilters.nutrition}
            onToggle={(v) => toggleChip('nutrition', v)}
            initialCount={7}
          />

          <View style={{ height: 24 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetBtn} onPress={reset} activeOpacity={0.7}>
            <Text style={styles.resetText}>
              {totalActive > 0 ? `Reset (${totalActive})` : 'Reset'}
            </Text>
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
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  headerBadge: {
    backgroundColor: Colors.primary,
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
  section: { paddingTop: 20 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  sectionBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.primary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.primary,
  },
  ingredientSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  ingredientInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textPrimary,
  },
  suggestionsBox: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
  },
  ingChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  ingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: '#C8EDE9',
  },
  ingAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingAvatarText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.onPrimary,
  },
  ingChipLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.primary,
    maxWidth: 100,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    flex: 1,
  },
  toggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
  },
  editLinkText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.primary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBackground,
    gap: 5,
  },
  chipActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
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
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    alignSelf: 'flex-start',
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
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
  },
  resetText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 16,
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
