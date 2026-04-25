import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Image, StyleSheet, ActivityIndicator,
} from 'react-native';
import {
  Search, X, Plus,
  FileText, SlidersHorizontal, UtensilsCrossed,
} from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import {
  FILTER_OPTIONS,
  FOOD_DATABASE,
  emptyFoodSearchFilters,
  FOOD_SEARCH_FILTER_KEYS,
} from '@/data/foodDatabase';
import { getCategoryIcon } from '@/components/recipes/foodCategoryIcons';
import { buildLocalFoodModel } from '@/lib/servingUtils';
import { fetchFatSecretFoodSearchJson, mapFatSecretProxyFoodsToModels } from '@/lib/foodSearchApi';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/context/AuthContext';
import { useMyFoods } from '@/hooks/useMyFoods';
import { useSavedFoods } from '@/hooks/useSavedFoods';
import { todayDateKey } from '@/lib/dateKey';
import FilterSheet from './FilterSheet';
import AddToLogSheet from './AddToLogSheet';
import FoodDetailScreen from './FoodDetailScreen';
import CompareFoodsScreen from './CompareFoodsScreen';
import CreateFoodForm from './CreateFoodForm';
import ManualAddSheet from './ManualAddSheet';

const TOP_TABS = ['All', 'My foods', 'Saved foods'];
const FILTER_KEYS = FOOD_SEARCH_FILTER_KEYS;
const BROWSE_FILTER_KEYS = ['category', 'calories', 'protein', 'carbs', 'fat', 'diet', 'source', 'sort'];
const UI_CATEGORY_SET = new Set(FILTER_OPTIONS.category.map((c) => c.toLowerCase()));

function getPer100gFood(food) {
  if (food.nutritionPer100g) return food.nutritionPer100g;
  if (food.per100g) {
    return {
      calories: food.per100g.kcal ?? food.per100g.calories ?? 0,
      protein: food.per100g.protein ?? 0,
      carbs: food.per100g.carbs ?? food.per100g.carbohydrate ?? 0,
      fat: food.per100g.fat ?? 0,
    };
  }
  if (food.servings?.length > 0) {
    const donor = food.servings.find((s) => s.per100g) || food.defaultServing;
    if (donor?.per100g) {
      return {
        calories: donor.per100g.calories ?? 0,
        protein: donor.per100g.protein ?? 0,
        carbs: donor.per100g.carbohydrate ?? donor.per100g.carbs ?? 0,
        fat: donor.per100g.fat ?? 0,
      };
    }
  }
  return {
    calories: food.calories || 0,
    protein: food.protein || 0,
    carbs: food.carbs || 0,
    fat: food.fat || 0,
  };
}

function getSugarPer100gFood(food) {
  const donor = food.servings?.find((s) => s.per100g)?.per100g;
  if (donor && donor.sugar != null && Number.isFinite(Number(donor.sugar))) return Number(donor.sugar);
  return null;
}

/**
 * Category used only when food already carries a UI category (local DB, some saved rows).
 * FatSecret `food_type` is usually Generic/Brand — we do not infer from name for filtering,
 * so those rows are not dropped when a category chip is selected.
 */
function explicitUiCategory(food) {
  const raw = (food.category || '').trim();
  if (raw && UI_CATEGORY_SET.has(raw.toLowerCase())) return raw;
  return null;
}

/**
 * Diet: only apply reliable rules (per-100g protein, sugar when present).
 * Name-based Vegetarian/Vegan/Gluten-free is too aggressive for API results — do not exclude.
 */
function matchesDietLabel(food, label) {
  const n = getPer100gFood(food);
  if (label === 'High-protein') return n.protein >= 20;
  if (label === 'Low-sugar') {
    const s = getSugarPer100gFood(food);
    if (s == null) return true;
    return s < 5;
  }
  if (label === 'Vegetarian' || label === 'Vegan' || label === 'Gluten-free') return true;
  return true;
}

function matchesSourceOption(food, opt) {
  const s = food.source || 'fatsecret';
  if (opt === 'Database') return s === 'fatsecret' || s === 'local';
  if (opt === 'My foods') return s === 'user';
  if (opt === 'Saved foods') return s === 'saved';
  return true;
}

function calorieBucketMatches(cf, calories) {
  if (cf.startsWith('Under 50')) return calories < 50;
  if (cf.startsWith('Under 100')) return calories < 100;
  if (cf.includes('100–250') || cf.includes('100-250')) return calories >= 100 && calories <= 250;
  if (cf.includes('250–500') || cf.includes('250-500')) return calories >= 250 && calories <= 500;
  if (cf.startsWith('500')) return calories >= 500;
  return false;
}

function FoodResultCard({ food, onPress, onAdd }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const categoryIcon = getCategoryIcon(food.name);
  const servingLabel = food.servingText || food.serving || '1 serving';
  return (
    <TouchableOpacity style={styles.resultCard} activeOpacity={0.75} onPress={() => onPress(food)}>
      <View style={styles.resultLeft}>
        <View style={styles.resultIconWrap}>
          <Image source={categoryIcon} style={styles.resultCategoryIcon} />
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultName} numberOfLines={1}>{food.name}</Text>
          <View style={styles.resultMeta}>
            <View style={styles.calRow}>
              <Text style={styles.calIcon}>🔥</Text>
              <Text style={styles.calText}>{food.calories} cal</Text>
              <Text style={styles.dotSep}>·</Text>
              <Text style={styles.servingText} numberOfLines={1}>{servingLabel}</Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={styles.macroItem}>P <Text style={styles.macroVal}>{food.protein}g</Text></Text>
              <Text style={styles.macroSep}> · </Text>
              <Text style={styles.macroItem}>C <Text style={styles.macroVal}>{food.carbs}g</Text></Text>
              <Text style={styles.macroSep}> · </Text>
              <Text style={styles.macroItem}>F <Text style={styles.macroVal}>{food.fat}g</Text></Text>
            </View>
          </View>
          {food.brand && <Text style={styles.brandText}>{food.brand}</Text>}
        </View>
      </View>
      <TouchableOpacity style={styles.addCircle} onPress={() => onAdd(food)} activeOpacity={0.8}>
        <Plus size={18} color={Colors.onPrimary} strokeWidth={2.5} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function SuggestionCard({ food, onPress, onAdd }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const categoryIcon = getCategoryIcon(food.name);
  const servingLabel = food.servingText || food.serving || '1 serving';
  return (
    <TouchableOpacity style={styles.suggestionCard} activeOpacity={0.75} onPress={() => onPress(food)}>
      <View style={styles.suggestionIconWrap}>
        <Image source={categoryIcon} style={styles.suggestionCategoryIcon} />
      </View>
      <View style={styles.suggestionLeft}>
        <Text style={styles.suggestionName}>{food.name}</Text>
        <View style={styles.suggestionMeta}>
          <Text style={styles.calIcon}>🔥</Text>
          <Text style={styles.suggestionCal}>{food.calories} cal</Text>
          <Text style={styles.dotSep}>·</Text>
          <Text style={styles.suggestionServing} numberOfLines={1}>{servingLabel}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.addCircleOutline} onPress={() => onAdd(food)} activeOpacity={0.8}>
        <Plus size={18} color={Colors.textPrimary} strokeWidth={2.5} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function Toast({ visible, message, onUndo, onView }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  if (!visible) return null;
  return (
    <View style={styles.toast}>
      <Text style={styles.toastText}>{message || 'Food logged'}</Text>
      <View style={styles.toastActions}>
        {onView && (
          <TouchableOpacity onPress={onView} activeOpacity={0.7}>
            <Text style={styles.toastAction}>View</Text>
          </TouchableOpacity>
        )}
        {onView && onUndo && <Text style={styles.toastDivider}>·</Text>}
        {onUndo && (
          <TouchableOpacity onPress={onUndo} activeOpacity={0.7}>
            <Text style={styles.toastAction}>Undo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function SearchEmptyState({ onCreate }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>No results found</Text>
      <Text style={styles.emptySubtitle}>
        Try a different keyword or brand name.
      </Text>
      <TouchableOpacity style={styles.createBtn} onPress={onCreate} activeOpacity={0.85}>
        <Text style={styles.createBtnText}>Create custom food</Text>
      </TouchableOpacity>
    </View>
  );
}

function MyFoodsEmptyState({ onCreate }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.myFoodsEmpty}>
      <View style={styles.myFoodsEmptyIconWrap}>
        <UtensilsCrossed size={48} color={Colors.textTertiary} strokeWidth={1.5} />
      </View>
      <Text style={styles.myFoodsEmptyTitle}>My Foods</Text>
      <Text style={styles.myFoodsEmptySubtitle}>
        Add a custom food to your personal list.
      </Text>
      <TouchableOpacity style={styles.myFoodsAddBtn} onPress={onCreate} activeOpacity={0.85}>
        <Text style={styles.myFoodsAddBtnText}>Add food</Text>
      </TouchableOpacity>
    </View>
  );
}

function MyFoodsTab({ myFoods, onAddPress, onFoodPress, onCreate }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const [localQuery, setLocalQuery] = useState('');
  const [filteredFoods, setFilteredFoods] = useState([]);

  useEffect(() => {
    if (!localQuery.trim()) {
      setFilteredFoods(myFoods.searchModels);
    } else {
      const lower = localQuery.toLowerCase();
      setFilteredFoods(
        myFoods.searchModels.filter(
          (f) =>
            f.name?.toLowerCase().includes(lower) ||
            f.brand?.toLowerCase().includes(lower)
        )
      );
    }
  }, [localQuery, myFoods.searchModels]);

  if (myFoods.loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your foods...</Text>
      </View>
    );
  }

  if (myFoods.error && myFoods.foods.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Could not load My foods</Text>
        <Text style={styles.emptySubtitle}>{myFoods.error}</Text>
      </View>
    );
  }

  if (myFoods.foods.length === 0) {
    return <MyFoodsEmptyState onCreate={onCreate} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.myFoodsSearchWrap}>
        <View style={styles.myFoodsSearchBar}>
          <Search size={16} color={Colors.textTertiary} />
          <TextInput
            style={styles.myFoodsSearchInput}
            placeholder="Search"
            placeholderTextColor={Colors.textTertiary}
            value={localQuery}
            onChangeText={setLocalQuery}
            returnKeyType="search"
            autoCorrect={false}
            selectionColor={Colors.textPrimary}
          />
          {localQuery.length > 0 && (
            <TouchableOpacity onPress={() => setLocalQuery('')} activeOpacity={0.7}>
              <X size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {filteredFoods.length === 0 && localQuery.trim() ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No results</Text>
            <Text style={styles.emptySubtitle}>
              No custom foods match "{localQuery}"
            </Text>
          </View>
        ) : (
          filteredFoods.map((food) => (
            <FoodResultCard
              key={food.id}
              food={food}
              onPress={onFoodPress}
              onAdd={onAddPress}
            />
          ))
        )}
      </ScrollView>

      <View style={styles.myFoodsBottomBar}>
        <TouchableOpacity style={styles.myFoodsBottomBtn} onPress={onCreate} activeOpacity={0.85}>
          <Text style={styles.myFoodsBottomBtnText}>Add food</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FoodSearchView({
  initialMealType,
  onFoodLogged,
  addEntry: parentAddEntry,
  addManualEntry: parentAddManualEntry,
  logDateKey,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const { user, loading: authLoading } = useAuth();
  const myFoods = useMyFoods();
  const savedFoodsHook = useSavedFoods();
  const savedFoodsList = savedFoodsHook.searchModels;

  const [topTab, setTopTab] = useState('All');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery, setDebouncedImmediate] = useDebounce('');
  const [filters, setFilters] = useState(() => emptyFoodSearchFilters());
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [activeFilterChip, setActiveFilterChip] = useState('calories');
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [apiResults, setApiResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [detailFood, setDetailFood] = useState(null);
  const [compareSession, setCompareSession] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const toastTimer = useRef(null);
  const prevUidRef = useRef(user?.uid ?? null);

  /** 'loading' | 'authenticated' | 'unauthenticated' — only decide signed-out after Firebase auth finishes. */
  const authStatus = authLoading ? 'loading' : user?.uid ? 'authenticated' : 'unauthenticated';

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      setQuery('');
      setDebouncedImmediate('');
      setApiResults([]);
      setSearchError(null);
      setLoading(false);
    }
  }, [user?.uid, authLoading, setDebouncedImmediate]);

  useEffect(() => {
    const uid = user?.uid ?? null;
    if (uid && prevUidRef.current !== uid) {
      setSearchError(null);
    }
    prevUidRef.current = uid;
  }, [user?.uid]);

  useEffect(() => {
    if (authLoading || !user?.uid) {
      return undefined;
    }
    if (!debouncedQuery.trim()) {
      setApiResults([]);
      setSearchError(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setSearchError(null);
    (async () => {
      try {
        const data = await fetchFatSecretFoodSearchJson(debouncedQuery.trim(), 0, 20);
        if (cancelled) return;
        setApiResults(mapFatSecretProxyFoodsToModels(data.foods));
      } catch (e) {
        if (!cancelled) {
          let msg = e?.message || "Couldn't load search results. Please try again.";
          if (user?.uid && /sign in to search foods/i.test(msg)) {
            msg = "Couldn't load search results. Please try again.";
          }
          setSearchError(msg.length > 400 ? `${msg.slice(0, 397)}…` : msg);
          setApiResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, user?.uid, authLoading]);

  const handleQueryChange = (text) => {
    setQuery(text);
    setDebouncedQuery(text);
  };

  const handleClear = () => {
    setQuery('');
    setDebouncedImmediate('');
    setApiResults([]);
    setSearchError(null);
  };

  const handleOpenFilter = () => {
    setActiveFilterChip('calories');
    setFilterSheetOpen(true);
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const hasActiveFilters = FILTER_KEYS.some((k) => (filters[k] || []).length > 0);

  const handleAddPress = (food) => {
    setSelectedFood(food);
    setAddSheetOpen(true);
  };

  const handleFoodPress = (food) => {
    setDetailFood(food);
  };

  const showToast = (msg) => {
    clearTimeout(toastTimer.current);
    setToastMessage(msg);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 3000);
  };

  const handleConfirmAdd = async (payload) => {
    if (!user) {
      showToast('Please sign in to log food');
      return;
    }
    if (!parentAddEntry) {
      console.error('[FoodSearch] addEntry prop is missing');
      showToast('Unable to save — try again');
      return;
    }
    try {
      const food = payload.food;
      const donorServing =
        payload.serving ||
        food.defaultServing ||
        food.servings?.find((s) => s.per100g) ||
        food.servings?.[0];
      const per100g = donorServing?.per100g || null;
      const servingsList = food.servings || [];
      const hasServingObj = servingsList.length > 0 && payload.serving;
      const gramsFromPayload =
        payload.loggedGrams != null && Number.isFinite(Number(payload.loggedGrams))
          ? Number(payload.loggedGrams)
          : null;
      const gramsFallback =
        !hasServingObj || payload.serving?.isGramServing
          ? payload.quantity
          : (payload.serving?.metricAmount || 100) * payload.quantity;
      const grams = gramsFromPayload ?? gramsFallback;

      const servingGrams = payload.serving?.metricAmount ||
        (payload.serving?.isGramServing ? payload.quantity : 100);

      if (!grams || grams <= 0) {
        showToast('Please enter a valid amount');
        return;
      }

      const foodForLog = {
        id: food.id,
        name: food.name,
        brand: food.brand || '',
        per100g: per100g ? {
          kcal: per100g.calories || 0,
          protein: per100g.protein || 0,
          carbs: per100g.carbohydrate ?? per100g.carbs ?? 0,
          fat: per100g.fat || 0,
        } : {
          kcal: Math.round((food.calories / (servingGrams / 100)) || 0),
          protein: parseFloat(((food.protein / (servingGrams / 100)) || 0).toFixed(1)),
          carbs: parseFloat(((food.carbs / (servingGrams / 100)) || 0).toFixed(1)),
          fat: parseFloat(((food.fat / (servingGrams / 100)) || 0).toFixed(1)),
        },
        servingGrams,
        source: food.source || 'fatsecret',
      };

      const mealType = (payload.mealType || 'Breakfast').toLowerCase();

      await parentAddEntry(foodForLog, mealType, grams);
      const dayNote =
        logDateKey && logDateKey !== todayDateKey() ? ` for ${logDateKey}` : '';
      showToast(`Food logged${dayNote}`);
      onFoodLogged?.();
    } catch (err) {
      console.error('[FoodSearch] save failed:', err);
      showToast('Failed to log food: ' + (err.message || 'unknown error'));
    }
  };

  const handleManualAdd = async ({
    name: entryName,
    calories: cal,
    protein: p,
    carbs: c,
    fat: f,
    fiber: fb,
    sugars: su,
    sodium: sod,
    mealType: meal,
  }) => {
    if (!user) {
      showToast('Please sign in to log food');
      throw new Error('Not signed in');
    }
    if (!parentAddManualEntry) {
      showToast('Unable to save — try again');
      throw new Error('addManualEntry prop missing');
    }
    await parentAddManualEntry({
      name: entryName,
      mealType: meal,
      nutrientsSnapshot: {
        kcal: cal,
        protein: p,
        carbs: c,
        fat: f,
        fiber: fb,
        sugars: su,
        sodium: sod,
      },
    });
    const dayNote =
      logDateKey && logDateKey !== todayDateKey() ? ` (${logDateKey})` : '';
    showToast(`${cal} kcal added to ${meal}${dayNote}`);
    onFoodLogged?.();
  };

  const handleCreateFood = async (foodData) => {
    setSaving(true);
    try {
      await myFoods.create(foodData);
      setShowCreateForm(false);
      showToast('Custom food created');
    } catch (err) {
      showToast('Failed to save food');
    } finally {
      setSaving(false);
    }
  };

  const applyClientFilters = (results, { skipSourceFilter = false } = {}) => {
    let res = [...results];

    const catFilters = filters.category || [];
    if (catFilters.length > 0) {
      res = res.filter((f) => {
        const ex = explicitUiCategory(f);
        if (ex == null) return true;
        return catFilters.some((c) => c.toLowerCase() === ex.toLowerCase());
      });
    }

    const calFilters = filters.calories || [];
    if (calFilters.length > 0) {
      res = res.filter((f) => {
        const n = getPer100gFood(f);
        return calFilters.some((cf) => calorieBucketMatches(cf, n.calories));
      });
    }

    const protFilters = filters.protein || [];
    if (protFilters.length > 0) {
      res = res.filter((f) => {
        const n = getPer100gFood(f);
        return protFilters.some((pf) => {
          if (pf.includes('≥30') || pf.includes('30g')) return n.protein >= 30;
          if (pf.includes('≥20') || pf.includes('20g')) return n.protein >= 20;
          if (pf.includes('≥10') || pf.includes('10g')) return n.protein >= 10;
          return true;
        });
      });
    }

    const carbFilters = filters.carbs || [];
    if (carbFilters.length > 0) {
      res = res.filter((f) => {
        const n = getPer100gFood(f);
        return carbFilters.some((cf) => {
          if (cf.startsWith('Low')) return n.carbs < 10;
          if (cf.startsWith('Medium')) return n.carbs >= 10 && n.carbs <= 30;
          if (cf.startsWith('High')) return n.carbs > 30;
          return true;
        });
      });
    }

    const fatFilters = filters.fat || [];
    if (fatFilters.length > 0) {
      res = res.filter((f) => {
        const n = getPer100gFood(f);
        return fatFilters.some((ff) => {
          if (ff.startsWith('Low')) return n.fat < 5;
          if (ff.startsWith('Medium')) return n.fat >= 5 && n.fat <= 15;
          if (ff.startsWith('High')) return n.fat > 15;
          return true;
        });
      });
    }

    const dietFilters = filters.diet || [];
    if (dietFilters.length > 0) {
      res = res.filter((f) => dietFilters.some((d) => matchesDietLabel(f, d)));
    }

    const sourceFilters = filters.source || [];
    if (!skipSourceFilter && sourceFilters.length > 0) {
      res = res.filter((f) => sourceFilters.some((o) => matchesSourceOption(f, o)));
    }

    const sortOpts = filters.sort || [];
    if (sortOpts.length > 0) {
      const s = sortOpts[0];
      if (s.startsWith('Lowest calories')) {
        res.sort((a, b) => getPer100gFood(a).calories - getPer100gFood(b).calories);
      } else if (s.startsWith('Highest protein')) {
        res.sort((a, b) => getPer100gFood(b).protein - getPer100gFood(a).protein);
      } else if (s.startsWith('Best protein')) {
        res.sort((a, b) => {
          const aN = getPer100gFood(a);
          const bN = getPer100gFood(b);
          return (bN.protein / (bN.calories || 1)) - (aN.protein / (aN.calories || 1));
        });
      } else if (s.startsWith('Lowest fat')) {
        res.sort((a, b) => getPer100gFood(a).fat - getPer100gFood(b).fat);
      }
    }

    return res;
  };

  const filterBasePool = useMemo(() => {
    const map = new Map();
    if (topTab === 'Saved foods') {
      savedFoodsList.forEach((food) => map.set(String(food.id), food));
      return Array.from(map.values());
    }
    FOOD_DATABASE.forEach((row) => map.set(String(row.id), buildLocalFoodModel(row)));
    savedFoodsList.forEach((food) => map.set(String(food.id), food));
    myFoods.searchModels.forEach((food) => map.set(String(food.id), food));
    return Array.from(map.values());
  }, [topTab, savedFoodsList, myFoods.searchModels]);

  const hasBrowseFilters = BROWSE_FILTER_KEYS.some((k) => (filters[k] || []).length > 0);
  const isSearching = debouncedQuery.length > 0;
  const showResultsPanel = isSearching || hasBrowseFilters;
  const baseResults = isSearching ? apiResults : (hasBrowseFilters ? filterBasePool : []);
  const results = applyClientFilters(baseResults, { skipSourceFilter: isSearching });
  const hasResults = results.length > 0;
  const resultsSectionTitle = isSearching ? 'Results from FatSecret' : 'Results';

  const sessionBlocking = isSearching && authLoading;
  const needSignIn = isSearching && !authLoading && authStatus === 'unauthenticated';
  const canShowFatSecretBlock =
    showResultsPanel &&
    !sessionBlocking &&
    !needSignIn &&
    !(isSearching && authStatus === 'authenticated' && loading) &&
    !(isSearching && searchError && authStatus === 'authenticated');

  if (compareSession) {
    return (
      <CompareFoodsScreen
        initialFoods={Array.isArray(compareSession.seeds) ? compareSession.seeds : []}
        onBack={() => {
          const restore = compareSession.restoreDetail;
          setCompareSession(null);
          if (restore) setDetailFood(restore);
        }}
        myFoodsModels={myFoods.searchModels}
        savedFoodsList={savedFoodsList}
      />
    );
  }

  if (showCreateForm) {
    return (
      <CreateFoodForm
        onSave={handleCreateFood}
        onBack={() => setShowCreateForm(false)}
        saving={saving}
      />
    );
  }

  if (detailFood) {
    return (
      <FoodDetailScreen
        food={detailFood}
        onBack={() => setDetailFood(null)}
        onAddToLog={(food) => {
          setDetailFood(null);
          handleAddPress(food);
        }}
        onCompare={(food) => {
          setCompareSession({ seeds: [food], restoreDetail: food });
          setDetailFood(null);
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topTabsRow}>
        {TOP_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setTopTab(tab)}
            style={styles.topTabItem}
            activeOpacity={0.7}
          >
            <Text style={[styles.topTabText, topTab === tab && styles.topTabTextActive]}>{tab}</Text>
            {topTab === tab && <View style={styles.topTabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {topTab === 'My foods' ? (
        <MyFoodsTab
          myFoods={myFoods}
          onAddPress={handleAddPress}
          onFoodPress={handleFoodPress}
          onCreate={() => setShowCreateForm(true)}
        />
      ) : (
        <>
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Search size={18} color={Colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search foods or brands"
                placeholderTextColor={Colors.textTertiary}
                value={query}
                onChangeText={handleQueryChange}
                returnKeyType="search"
                autoCorrect={false}
                selectionColor={Colors.textPrimary}
              />
              {query.length > 0 ? (
                <TouchableOpacity onPress={handleClear} activeOpacity={0.7}>
                  <X size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.quickActionsRowFixed}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              activeOpacity={0.8}
              onPress={() => setManualAddOpen(true)}
            >
              <FileText size={16} color={Colors.textSecondary} />
              <Text style={styles.quickActionText}>Manual Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionBtn, hasActiveFilters && styles.quickActionBtnActive]}
              activeOpacity={0.8}
              onPress={handleOpenFilter}
            >
              <SlidersHorizontal size={16} color={hasActiveFilters ? Colors.onPrimary : Colors.textSecondary} />
              <Text style={[styles.quickActionText, hasActiveFilters && styles.quickActionTextActive]}>Filter</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.resultsScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.resultsContent}
          >
            {topTab === 'All' && !isSearching && !hasBrowseFilters && (
              <>
                {savedFoodsHook.loading && savedFoodsList.length === 0 ? (
                  <View style={styles.loadingState}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading saved foods…</Text>
                  </View>
                ) : null}
                {savedFoodsHook.error ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Saved foods</Text>
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyTitle}>Could not load saved foods</Text>
                      <Text style={styles.emptySubtitle}>{savedFoodsHook.error}</Text>
                    </View>
                  </View>
                ) : null}
                {savedFoodsList.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Saved foods</Text>
                      <TouchableOpacity activeOpacity={0.7} onPress={() => setTopTab('Saved foods')}>
                        <Text style={styles.seeAll}>See all</Text>
                      </TouchableOpacity>
                    </View>
                    {savedFoodsList.slice(0, 6).map((food) => (
                      <SuggestionCard key={food.id} food={food} onPress={handleFoodPress} onAdd={handleAddPress} />
                    ))}
                  </View>
                )}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Search foods</Text>
                  <Text style={[styles.emptySubtitle, { marginBottom: 4 }]}>
                    Use the search bar for FatSecret results, or open My foods for items you created.
                  </Text>
                </View>
              </>
            )}

            {topTab === 'Saved foods' && !isSearching && !hasBrowseFilters && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Saved foods</Text>
                {savedFoodsHook.loading && savedFoodsList.length === 0 ? (
                  <View style={styles.loadingState}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading…</Text>
                  </View>
                ) : savedFoodsHook.error ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>Could not load</Text>
                    <Text style={styles.emptySubtitle}>{savedFoodsHook.error}</Text>
                  </View>
                ) : savedFoodsList.length > 0 ? (
                  savedFoodsList.map((food) => (
                    <SuggestionCard key={food.id} food={food} onPress={handleFoodPress} onAdd={handleAddPress} />
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🔖</Text>
                    <Text style={styles.emptyTitle}>No saved foods yet</Text>
                    <Text style={styles.emptySubtitle}>
                      Tap the bookmark on food details to save foods for quick access.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {sessionBlocking && (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading your session…</Text>
              </View>
            )}

            {needSignIn && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔐</Text>
                <Text style={styles.emptyTitle}>Sign in required</Text>
                <Text style={styles.emptySubtitle}>Sign in to search foods and recipes.</Text>
              </View>
            )}

            {isSearching && authStatus === 'authenticated' && loading && (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Searching foods...</Text>
              </View>
            )}

            {isSearching && authStatus === 'authenticated' && !loading && searchError && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>⚠️</Text>
                <Text style={styles.emptyTitle}>{"Couldn't load search results"}</Text>
                <Text style={styles.emptySubtitle}>{searchError}</Text>
              </View>
            )}

            {canShowFatSecretBlock && hasResults && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{resultsSectionTitle}</Text>
                {results.map((food) => (
                  <FoodResultCard key={food.id} food={food} onPress={handleFoodPress} onAdd={handleAddPress} />
                ))}
              </View>
            )}

            {canShowFatSecretBlock && !hasResults && (
              <SearchEmptyState
                onCreate={() => setShowCreateForm(true)}
              />
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      )}

      <FilterSheet
        visible={filterSheetOpen}
        activeFilter={activeFilterChip}
        filters={filters}
        onApply={handleApplyFilters}
        onClose={() => setFilterSheetOpen(false)}
        onReset={() => setFilters(emptyFoodSearchFilters())}
      />

      <AddToLogSheet
        visible={addSheetOpen}
        food={selectedFood}
        onAdd={handleConfirmAdd}
        onClose={() => setAddSheetOpen(false)}
        initialMealType={initialMealType}
      />

      <ManualAddSheet
        visible={manualAddOpen}
        onAdd={handleManualAdd}
        onClose={() => setManualAddOpen(false)}
      />

      <Toast
        visible={toastVisible}
        message={toastMessage}
        onView={() => setToastVisible(false)}
        onUndo={() => setToastVisible(false)}
      />
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topTabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topTabItem: {
    marginRight: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  topTabText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  topTabTextActive: {
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  topTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.textPrimary,
    borderRadius: 1,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.cardBackground,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textPrimary,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  suggestionCategoryIcon: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },
  suggestionLeft: { flex: 1 },
  suggestionName: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  suggestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  suggestionCal: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  suggestionServing: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  addCircleOutline: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  resultLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultCategoryIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  resultInfo: { flex: 1 },
  resultName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  resultMeta: { gap: 3 },
  calRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calIcon: { fontSize: 11 },
  calText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
  dotSep: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  servingText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroItem: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  macroVal: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
  macroSep: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  brandText: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 2,
  },
  addCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  quickActionsRowFixed: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.cardBackground,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  quickActionText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
  quickActionBtnActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  quickActionTextActive: {
    color: Colors.onPrimary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  createBtn: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  createBtnText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  toast: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: Colors.textPrimary,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
  },
  toastText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.onPrimary,
  },
  toastActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toastAction: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#D1D5DB',
  },
  toastDivider: {
    fontSize: 14,
    color: '#6B7280',
  },
  myFoodsEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  myFoodsEmptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  myFoodsEmptyTitle: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  myFoodsEmptySubtitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  myFoodsAddBtn: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
  },
  myFoodsAddBtnText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.onPrimary,
  },
  myFoodsSearchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  myFoodsSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  myFoodsSearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textPrimary,
  },
  myFoodsBottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  myFoodsBottomBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  myFoodsBottomBtnText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
});
