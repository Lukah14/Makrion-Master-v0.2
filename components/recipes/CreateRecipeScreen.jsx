import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, Alert, KeyboardAvoidingView,
  ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Plus, Trash2, ChefHat, Clock, Users, Pencil,
  Search, X,
} from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRecipes } from '@/hooks/useRecipes';
import { useMyFoods } from '@/hooks/useMyFoods';
import { useDebounce } from '@/hooks/useDebounce';
import {
  fetchFatSecretFoodSearchJson,
  mapFatSecretProxyFoodsToModels,
  isFatSecretFoodSearchConfigured,
} from '@/lib/foodSearchApi';
import { myFoodToSearchModel } from '@/services/foodService';
import { getCategoryIcon } from './foodCategoryIcons';

function round1(n) { return Math.round(n * 10) / 10; }

function nutrientsForGrams(per100g, g) {
  const ratio = g / 100;
  return {
    kcal: Math.round((per100g.kcal || per100g.calories || 0) * ratio),
    protein: round1((per100g.protein || 0) * ratio),
    carbs: round1((per100g.carbs || per100g.carbohydrate || 0) * ratio),
    fat: round1((per100g.fat || 0) * ratio),
  };
}

function extractPer100g(food) {
  const raw = food._raw;
  if (raw?.nutritionPer100g) {
    const n = raw.nutritionPer100g;
    return { kcal: n.calories || n.kcal || 0, protein: n.protein || 0, carbs: n.carbs || n.carbohydrate || 0, fat: n.fat || 0 };
  }
  if (raw?.per100g) {
    const p = raw.per100g;
    return { kcal: p.kcal || p.calories || 0, protein: p.protein || 0, carbs: p.carbs || p.carbohydrate || 0, fat: p.fat || 0 };
  }
  if (food.nutritionPer100g) {
    const n = food.nutritionPer100g;
    return { kcal: n.calories || n.kcal || 0, protein: n.protein || 0, carbs: n.carbs || n.carbohydrate || 0, fat: n.fat || 0 };
  }
  if (food.per100g) {
    const p = food.per100g;
    return { kcal: p.kcal || p.calories || 0, protein: p.protein || 0, carbs: p.carbs || p.carbohydrate || 0, fat: p.fat || 0 };
  }
  return { kcal: food.calories || 0, protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0 };
}

/* ─── Ingredient Search Screen ─────────────────────────────────────────── */

function IngredientSearchScreen({ onSelect, onBack }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const { user, loading: authLoading } = useAuth();
  const myFoodsHook = useMyFoods();
  /** Always read latest list inside the search timer (do not put `foods` in effect deps — snapshot churn resets debounce and can starve requests). */
  const myFoodsRef = useRef(myFoodsHook.foods);
  myFoodsRef.current = myFoodsHook.foods;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery, setDebouncedImmediate] = useDebounce('', 300);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const authStatus = authLoading ? 'loading' : user?.uid ? 'authenticated' : 'unauthenticated';

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      setQuery('');
      setDebouncedImmediate('');
      setResults([]);
      setSearchError(null);
      setLoading(false);
    }
  }, [user?.uid, authLoading, setDebouncedImmediate]);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (authLoading || !user?.uid) {
      return undefined;
    }
    if (!q) {
      setResults([]);
      setLoading(false);
      setSearchError(null);
      return undefined;
    }
    if (!isFatSecretFoodSearchConfigured()) {
      setResults([]);
      setLoading(false);
      setSearchError('Food search is not configured.');
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setSearchError(null);

    (async () => {
      try {
        const data = await fetchFatSecretFoodSearchJson(q, 0, 20, { logIngredient: true });
        if (cancelled) return;
        const api = mapFatSecretProxyFoodsToModels(data.foods);
        const qLower = q.toLowerCase();
        const my = (myFoodsRef.current || [])
          .filter((f) => {
            const name = (f.name || '').toLowerCase();
            const brand = (f.brand || '').toLowerCase();
            return name.includes(qLower) || brand.includes(qLower);
          })
          .map(myFoodToSearchModel);
        setResults([...my, ...api]);
      } catch (e) {
        if (!cancelled) {
          setResults([]);
          let msg = e?.message || "Couldn't load search results. Please try again.";
          if (user?.uid && /sign in to search foods/i.test(msg)) {
            msg = "Couldn't load search results. Please try again.";
          }
          setSearchError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, user?.uid, authLoading]);

  const handlePick = (food) => {
    const per100g = extractPer100g(food);
    const defaultGrams = 100;
    onSelect({
      foodId: food.id || null,
      source: food.source || 'fatsecret',
      name: food.name,
      servingLabel: food.servingText || null,
      per100g,
      grams: defaultGrams,
      nutrients: nutrientsForGrams(per100g, defaultGrams),
    });
  };

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Add Ingredient</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.searchBar}>
        <Search size={18} color={Colors.textTertiary} />
        <TextInput
          style={s.searchInput}
          placeholder="Search foods..."
          placeholderTextColor={Colors.textTertiary}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setDebouncedQuery(t);
          }}
          autoFocus
          returnKeyType="search"
          selectionColor={Colors.textPrimary}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setDebouncedQuery('');
              setResults([]);
              setSearchError(null);
            }}
            activeOpacity={0.7}
          >
            <X size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {authLoading && debouncedQuery.trim().length > 0 ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 16, alignItems: 'center' }}>
          <ActivityIndicator color={Colors.textTertiary} />
          <Text style={{ marginTop: 8, color: Colors.textTertiary, fontSize: 14 }}>Loading your session…</Text>
        </View>
      ) : null}

      {!authLoading && authStatus === 'unauthenticated' && debouncedQuery.trim().length > 0 ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
            Sign in to search foods and recipes.
          </Text>
        </View>
      ) : null}

      {authStatus === 'authenticated' && loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={Colors.textTertiary} />
      ) : null}

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="always"
      >
        {results.map((food, idx) => {
          const iconSrc = getCategoryIcon(food.name);
          return (
            <TouchableOpacity
              key={food.id || `r_${idx}`}
              style={s.searchResultRow}
              activeOpacity={0.7}
              onPress={() => handlePick(food)}
            >
              <View style={s.searchResultIconWrap}>
                <Image source={iconSrc} style={s.searchResultIconImg} />
              </View>
              <View style={s.searchResultInfo}>
                <Text style={s.searchResultName} numberOfLines={1}>{food.name}</Text>
                <Text style={s.searchResultMeta}>
                  {food.calories} cal · {food.servingText || '100g'}
                </Text>
              </View>
              <Plus size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          );
        })}
        {authStatus === 'authenticated' && !loading && debouncedQuery.trim().length > 0 && searchError ? (
          <View style={s.emptySearch}>
            <Text style={[s.emptySearchText, { fontFamily: 'PlusJakartaSans-SemiBold', marginBottom: 4 }]}>
              {"Couldn't load search results"}
            </Text>
            <Text style={s.emptySearchText}>{searchError}</Text>
          </View>
        ) : null}
        {authStatus === 'authenticated' && !loading && !searchError && debouncedQuery.trim().length > 0 && results.length === 0 ? (
          <View style={s.emptySearch}>
            <Text style={s.emptySearchText}>No results found</Text>
          </View>
        ) : null}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

/* ─── Edit Ingredient Sheet ────────────────────────────────────────────── */

function EditIngredientSheet({ ingredient, onChange, onClose }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);

  const [grams, setGrams] = useState(String(ingredient.grams || 100));

  const preview = useMemo(() => {
    const g = parseFloat(grams) || 0;
    return nutrientsForGrams(ingredient.per100g || {}, g);
  }, [grams, ingredient.per100g]);

  const handleSave = () => {
    const g = parseFloat(grams) || 0;
    onChange({
      ...ingredient,
      quantity: g,
      grams: g,
      nutrients: preview,
    });
    onClose();
  };

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={onClose} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.topBarTitle} numberOfLines={1}>Edit Ingredient</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.editBody}>
        <Text style={s.editFoodName} numberOfLines={2}>{ingredient.name}</Text>

        <View style={s.editRow}>
          <Text style={s.editLabel}>Amount (grams)</Text>
          <TextInput
            style={s.editInput}
            value={grams}
            onChangeText={setGrams}
            keyboardType="decimal-pad"
            selectTextOnFocus
            selectionColor={Colors.textPrimary}
          />
        </View>

        <View style={s.editPreview}>
          <View style={s.editPreviewItem}>
            <Text style={s.editPreviewValue}>{preview.kcal}</Text>
            <Text style={s.editPreviewLabel}>kcal</Text>
          </View>
          <View style={s.editPreviewItem}>
            <Text style={s.editPreviewValue}>{preview.protein}g</Text>
            <Text style={s.editPreviewLabel}>Protein</Text>
          </View>
          <View style={s.editPreviewItem}>
            <Text style={s.editPreviewValue}>{preview.carbs}g</Text>
            <Text style={s.editPreviewLabel}>Carbs</Text>
          </View>
          <View style={s.editPreviewItem}>
            <Text style={s.editPreviewValue}>{preview.fat}g</Text>
            <Text style={s.editPreviewLabel}>Fat</Text>
          </View>
        </View>

        <TouchableOpacity style={s.editSaveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={s.editSaveBtnText}>Update Ingredient</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── Main Create Recipe Screen ────────────────────────────────────────── */

export default function CreateRecipeScreen({ onBack, onCreated, initialRecipe }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addRecipe, editRecipe } = useRecipes();

  const isEditing = !!initialRecipe;

  const [title, setTitle] = useState(() => initialRecipe?.name || '');
  const [ingredients, setIngredients] = useState(() =>
    (initialRecipe?.ingredients || []).map((ing, i) => ({
      ...ing,
      id: ing.id || `existing_${i}`,
    }))
  );
  const [instructions, setInstructions] = useState(() => initialRecipe?.description || '');
  const [servings, setServings] = useState(() => String(initialRecipe?.servings || 1));
  const [prepTime, setPrepTime] = useState(() =>
    initialRecipe?.prepTimeMinutes != null ? String(initialRecipe.prepTimeMinutes) : ''
  );
  const [cookTime, setCookTime] = useState(() =>
    initialRecipe?.cookTimeMinutes != null ? String(initialRecipe.cookTimeMinutes) : ''
  );
  const [saving, setSaving] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);

  const servingsNum = Math.max(1, parseInt(servings, 10) || 1);

  const totalNutrition = useMemo(() => {
    const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    for (const ing of ingredients) {
      t.kcal += ing.nutrients?.kcal || 0;
      t.protein += ing.nutrients?.protein || 0;
      t.carbs += ing.nutrients?.carbs || 0;
      t.fat += ing.nutrients?.fat || 0;
    }
    return t;
  }, [ingredients]);

  const perServing = useMemo(() => ({
    kcal: Math.round(totalNutrition.kcal / servingsNum),
    protein: round1(totalNutrition.protein / servingsNum),
    carbs: round1(totalNutrition.carbs / servingsNum),
    fat: round1(totalNutrition.fat / servingsNum),
  }), [totalNutrition, servingsNum]);

  const isValid = title.trim().length > 0 && ingredients.length > 0 && servingsNum > 0;

  const handleIngredientAdded = useCallback((ing) => {
    const newIng = {
      ...ing,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      amountType: 'grams',
      quantity: ing.grams || 100,
    };
    setIngredients((prev) => [...prev, newIng]);
    setShowSearch(false);
  }, []);

  const handleRemoveIngredient = (idx) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditSave = useCallback((updated) => {
    if (editingIdx === null) return;
    setIngredients((prev) => prev.map((ing, i) => (i === editingIdx ? updated : ing)));
    setEditingIdx(null);
  }, [editingIdx]);

  const handleCreate = async () => {
    if (!isValid || !user) return;
    setSaving(true);
    try {
      const ingForSave = ingredients.map((ing) => ({
        foodId: ing.foodId,
        source: ing.source,
        name: ing.name,
        amountType: ing.amountType,
        quantity: ing.quantity,
        servingLabel: ing.servingLabel,
        grams: ing.grams,
        per100g: ing.per100g,
        nutrients: ing.nutrients,
      }));
      const recipeData = {
        name: title.trim(),
        servings: servingsNum,
        prepTimeMinutes: parseInt(prepTime, 10) || 0,
        cookTimeMinutes: parseInt(cookTime, 10) || 0,
        description: instructions.trim(),
        ingredients: ingForSave,
      };
      if (isEditing) {
        await editRecipe(initialRecipe.id, recipeData);
      } else {
        await addRecipe(recipeData);
      }
      onCreated?.();
      onBack();
    } catch (err) {
      Alert.alert('Error', err.message || `Failed to ${isEditing ? 'update' : 'create'} recipe`);
    } finally {
      setSaving(false);
    }
  };

  /* ─── Sub-screens ──────────────────────────────────────────────── */

  if (showSearch) {
    return (
      <IngredientSearchScreen
        onSelect={handleIngredientAdded}
        onBack={() => setShowSearch(false)}
      />
    );
  }

  if (editingIdx !== null && ingredients[editingIdx]) {
    return (
      <EditIngredientSheet
        ingredient={ingredients[editingIdx]}
        onChange={handleEditSave}
        onClose={() => setEditingIdx(null)}
      />
    );
  }

  /* ─── Main form ────────────────────────────────────────────────── */

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.topBar}>
        <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{isEditing ? 'Edit Recipe' : 'Create Recipe'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: 28 + insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        {/* Title */}
        <View style={s.titleCard}>
          <TextInput
            style={s.titleInput}
            placeholder="Recipe name"
            placeholderTextColor={Colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
            selectionColor={Colors.textPrimary}
          />
          <Pencil size={18} color={Colors.textTertiary} />
        </View>

        {/* Nutrition per serving */}
        <View style={s.nutritionCard}>
          <View style={s.nutritionMain}>
            <Text style={s.nutritionLabel}>Calories</Text>
            <Text style={s.nutritionValue}>{perServing.kcal}</Text>
            <Text style={s.nutritionUnit}>per serving</Text>
          </View>
          <View style={s.macroRow}>
            <View style={s.macroItem}>
              <Text style={s.macroValue}>{perServing.protein}g</Text>
              <Text style={s.macroLabel}>Protein</Text>
            </View>
            <View style={s.macroDivider} />
            <View style={s.macroItem}>
              <Text style={s.macroValue}>{perServing.carbs}g</Text>
              <Text style={s.macroLabel}>Carbs</Text>
            </View>
            <View style={s.macroDivider} />
            <View style={s.macroItem}>
              <Text style={s.macroValue}>{perServing.fat}g</Text>
              <Text style={s.macroLabel}>Fats</Text>
            </View>
          </View>
        </View>

        {/* Servings */}
        <View style={s.metaCard}>
          <View style={s.metaCardHeader}>
            <Users size={18} color={Colors.textSecondary} />
            <Text style={s.metaCardLabel}>Servings</Text>
          </View>
          <TextInput
            style={s.metaCardInput}
            value={servings}
            onChangeText={setServings}
            keyboardType="number-pad"
            selectTextOnFocus
            selectionColor={Colors.textPrimary}
            placeholder="1"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>

        {/* Prep / Cook */}
        <View style={s.metaRow}>
          <View style={s.metaCardHalf}>
            <View style={s.metaCardHeader}>
              <Clock size={16} color={Colors.textSecondary} />
              <Text style={s.metaCardLabel}>Prep Time</Text>
            </View>
            <View style={s.metaCardInputRow}>
              <TextInput
                style={s.metaCardInput}
                value={prepTime}
                onChangeText={setPrepTime}
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                selectTextOnFocus
                selectionColor={Colors.textPrimary}
              />
              <Text style={s.metaCardUnit}>min</Text>
            </View>
          </View>
          <View style={s.metaCardHalf}>
            <View style={s.metaCardHeader}>
              <ChefHat size={16} color={Colors.textSecondary} />
              <Text style={s.metaCardLabel}>Cook Time</Text>
            </View>
            <View style={s.metaCardInputRow}>
              <TextInput
                style={s.metaCardInput}
                value={cookTime}
                onChangeText={setCookTime}
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                selectTextOnFocus
                selectionColor={Colors.textPrimary}
              />
              <Text style={s.metaCardUnit}>min</Text>
            </View>
          </View>
        </View>

        {/* Ingredients */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionTitle}>Ingredients</Text>

          {ingredients.map((ing, idx) => {
            const iconSrc = getCategoryIcon(ing.name);
            return (
              <TouchableOpacity
                key={ing.id}
                style={s.ingredientRow}
                activeOpacity={0.7}
                onPress={() => setEditingIdx(idx)}
              >
                <View style={s.ingredientIconWrap}>
                  <Image source={iconSrc} style={s.ingredientIconImg} />
                </View>
                <View style={s.ingredientInfo}>
                  <Text style={s.ingredientName} numberOfLines={1}>{ing.name}</Text>
                  <Text style={s.ingredientMeta}>
                    {ing.grams}g · {ing.nutrients?.kcal || 0} cal
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.ingredientDeleteBtn}
                  onPress={() => handleRemoveIngredient(idx)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={s.addIngredientBtn}
            activeOpacity={0.7}
            onPress={() => setShowSearch(true)}
          >
            <Plus size={18} color={Colors.textSecondary} strokeWidth={2.5} />
            <Text style={s.addIngredientText}>Add ingredients</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionTitle}>Instructions (optional)</Text>
          <TextInput
            style={s.instructionsInput}
            placeholder="Mix ingredients, cook for 5 minutes, serve warm."
            placeholderTextColor={Colors.textTertiary}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            textAlignVertical="top"
            selectionColor={Colors.textPrimary}
          />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Bottom CTA — box-none so taps on scroll content above the button are not swallowed by this layer */}
      <View style={s.bottomBar} pointerEvents="box-none">
        <TouchableOpacity
          style={[s.createBtn, !isValid && s.createBtnDisabled]}
          activeOpacity={isValid ? 0.85 : 1}
          onPress={handleCreate}
          disabled={!isValid || saving}
        >
          <Text style={[s.createBtnText, !isValid && s.createBtnTextDisabled]}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Recipe'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ─── Styles ───────────────────────────────────────────────────────────── */

const createStyles = (Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

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
    color: Colors.textPrimary, textAlign: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  /* Search */
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginTop: 12,
    backgroundColor: Colors.cardBackground, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: {
    flex: 1, fontSize: 15, fontFamily: 'PlusJakartaSans-Regular', color: Colors.textPrimary, paddingVertical: 0,
  },
  searchResultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.cardBackground, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  searchResultIconWrap: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  searchResultIconImg: { width: 26, height: 26, resizeMode: 'contain' },
  searchResultInfo: { flex: 1 },
  searchResultName: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary },
  searchResultMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', color: Colors.textTertiary, marginTop: 2 },
  emptySearch: { alignItems: 'center', paddingTop: 40 },
  emptySearchText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textTertiary },

  /* Title */
  titleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cardBackground, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  titleInput: {
    flex: 1, fontSize: 20, fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary, paddingVertical: 0,
  },

  /* Nutrition */
  nutritionCard: {
    backgroundColor: Colors.cardBackground, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  nutritionMain: { alignItems: 'center', marginBottom: 18 },
  nutritionLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textSecondary, letterSpacing: 0.5 },
  nutritionValue: { fontSize: 40, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, marginTop: 4 },
  nutritionUnit: { fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textTertiary, marginTop: 4 },
  macroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  macroItem: { flex: 1, alignItems: 'center' },
  macroValue: { fontSize: 20, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  macroLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textSecondary, marginTop: 3 },
  macroDivider: { width: 1, height: 32, backgroundColor: Colors.border },

  /* Meta row */
  metaCard: {
    backgroundColor: Colors.cardBackground, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
  },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  metaCardHalf: {
    flex: 1, backgroundColor: Colors.cardBackground, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  metaCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  metaCardLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textSecondary },
  metaCardInput: {
    fontSize: 22, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, paddingVertical: 0,
  },
  metaCardInputRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  metaCardUnit: { fontSize: 14, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textTertiary },

  /* Sections */
  sectionBlock: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, marginBottom: 12 },

  /* Ingredient rows */
  ingredientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.cardBackground, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  ingredientIconWrap: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  ingredientIconImg: { width: 26, height: 26, resizeMode: 'contain' },
  ingredientInfo: { flex: 1 },
  ingredientName: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary },
  ingredientMeta: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textTertiary, marginTop: 3 },
  ingredientDeleteBtn: { padding: 6 },

  addIngredientBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 14, borderWidth: 2, borderColor: Colors.border,
    borderStyle: 'dashed', backgroundColor: Colors.cardBackground,
  },
  addIngredientText: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textSecondary },

  /* Instructions */
  instructionsInput: {
    backgroundColor: Colors.cardBackground, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
    fontSize: 14, fontFamily: 'PlusJakartaSans-Regular', color: Colors.textPrimary,
    minHeight: 100,
  },

  /* Bottom bar */
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  createBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.textPrimary, borderRadius: 16, paddingVertical: 18,
  },
  createBtnDisabled: { opacity: 0.35 },
  createBtnText: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.onPrimary },
  createBtnTextDisabled: {},

  /* Edit ingredient */
  editBody: { padding: 20, paddingTop: 24 },
  editFoodName: {
    fontSize: 20, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, marginBottom: 24,
  },
  editRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
  },
  editLabel: { fontSize: 15, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textPrimary },
  editInput: {
    width: 110, fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary,
    textAlign: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingVertical: 10, backgroundColor: Colors.cardBackground,
  },
  editPreview: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 18,
    backgroundColor: Colors.cardBackground, borderRadius: 14, marginBottom: 28,
    borderWidth: 1, borderColor: Colors.border,
  },
  editPreviewItem: { alignItems: 'center' },
  editPreviewValue: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  editPreviewLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textSecondary, marginTop: 3 },
  editSaveBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.textPrimary, borderRadius: 16, paddingVertical: 18,
  },
  editSaveBtnText: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.onPrimary },
});
