import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Image, StyleSheet, ActivityIndicator,
} from 'react-native';
import {
  Search, X, ScanLine, Plus,
  Sparkles, FileText, SlidersHorizontal, UtensilsCrossed,
} from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import {
  FOOD_DATABASE, RECENT_FOODS, SAVED_FOODS,
  SUGGESTIONS, FILTER_OPTIONS,
} from '@/data/foodDatabase';
import { getCategoryIcon } from '@/components/recipes/foodCategoryIcons';
import { buildLocalFoodModel, buildFoodModelFromSearch } from '@/lib/servingUtils';
import { useAuth } from '@/context/AuthContext';
import { useMyFoods } from '@/hooks/useMyFoods';
import { useFoodLog } from '@/hooks/useFoodLog';
import { myFoodToSearchModel } from '@/services/foodService';
import FilterSheet from './FilterSheet';
import AddToLogSheet from './AddToLogSheet';
import FoodDetailScreen from './FoodDetailScreen';
import CreateFoodForm from './CreateFoodForm';
import ManualAddSheet from './ManualAddSheet';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function searchFatSecret(query, page = 0) {
  const url = `${SUPABASE_URL}/functions/v1/fatsecret-proxy?action=search&q=${encodeURIComponent(query)}&page=${page}&max_results=20`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

const TOP_TABS = ['All', 'My foods', 'Saved foods'];
const FILTER_KEYS = ['category', 'calories', 'protein', 'carbs', 'fat', 'diet', 'brand', 'source', 'sort'];
const EMPTY_FILTERS = Object.fromEntries(FILTER_KEYS.map((k) => [k, []]));

function todayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef(null);
  const update = useCallback((v) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(v), delay);
  }, [delay]);
  return [debounced, update];
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

function SearchEmptyState({ query: q, onAI, onCreate }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>No exact matches found</Text>
      <Text style={styles.emptySubtitle}>
        Try a different keyword, brand, or use AI search
      </Text>
      <TouchableOpacity style={styles.aiBtn} onPress={onAI} activeOpacity={0.85}>
        <Sparkles size={16} color={Colors.textPrimary} />
        <Text style={styles.aiBtnText}>Generate results using AI</Text>
      </TouchableOpacity>
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

export default function FoodSearchView() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const { user } = useAuth();
  const myFoods = useMyFoods();
  const today = todayDateString();
  const foodLog = useFoodLog(today);

  const [topTab, setTopTab] = useState('All');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useDebounce('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const toastTimer = useRef(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!debouncedQuery.trim()) {
      setApiResults([]);
      setSearchError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSearchError(null);
    searchTimer.current = setTimeout(async () => {
      try {
        const data = await searchFatSecret(debouncedQuery);
        setApiResults((data.foods || []).map(buildFoodModelFromSearch));
      } catch {
        setSearchError('Could not load results. Please try again.');
        setApiResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [debouncedQuery]);

  const handleQueryChange = (text) => {
    setQuery(text);
    setDebouncedQuery(text);
  };

  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
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

  const getFood = (id) => {
    const raw = FOOD_DATABASE.find((f) => f.id === id);
    return raw ? buildLocalFoodModel(raw) : null;
  };

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
    try {
      const food = payload.food;
      const per100g = food.servings?.[0]?.per100g || null;
      const servingGrams = payload.serving?.metricAmount ||
        (payload.serving?.isGramServing ? payload.quantity : 100);
      const grams = payload.serving?.isGramServing
        ? payload.quantity
        : (payload.serving?.metricAmount || 100) * payload.quantity;

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
      await foodLog.addEntry(foodForLog, mealType, grams);
      showToast('Food logged');
    } catch (err) {
      showToast('Failed to log food');
    }
  };

  const handleManualAdd = async ({
    name: entryName, calories: cal,
    protein: p, carbs: c, fiber: fb, sugars: su,
    fat: f, saturatedFat: sf, transFat: tf,
    sodium: sod, mealType: meal,
  }) => {
    if (!user) {
      showToast('Please sign in to log food');
      throw new Error('Not signed in');
    }
    const manualFood = {
      id: `manual_${Date.now()}`,
      name: entryName,
      brand: '',
      per100g: {
        kcal: cal, protein: p, carbs: c, fat: f,
        fiber: fb, sugars: su,
        saturatedFat: sf, transFat: tf,
        sodium: sod,
      },
      servingGrams: 100,
      source: 'manual',
    };
    await foodLog.addEntry(manualFood, meal, 100);
    showToast(`${cal} kcal added to ${meal}`);
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

  const getPer100g = (food) =>
    food.nutritionPer100g || {
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    };

  const applyClientFilters = (results) => {
    let res = [...results];

    const calFilters = filters.calories || [];
    if (calFilters.length > 0) {
      res = res.filter((f) => {
        const n = getPer100g(f);
        return calFilters.some((cf) => {
          if (cf.startsWith('Under 50')) return n.calories < 50;
          if (cf.startsWith('Under 100')) return n.calories < 100;
          if (cf.startsWith('100')) return n.calories >= 100 && n.calories <= 250;
          if (cf.startsWith('250')) return n.calories >= 250 && n.calories <= 500;
          if (cf.startsWith('500')) return n.calories >= 500;
          return true;
        });
      });
    }

    const protFilters = filters.protein || [];
    if (protFilters.length > 0) {
      res = res.filter((f) => {
        const n = getPer100g(f);
        return protFilters.some((pf) => {
          if (pf.includes('30')) return n.protein >= 30;
          if (pf.includes('20')) return n.protein >= 20;
          if (pf.includes('10')) return n.protein >= 10;
          return true;
        });
      });
    }

    const carbFilters = filters.carbs || [];
    if (carbFilters.length > 0) {
      res = res.filter((f) => {
        const n = getPer100g(f);
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
        const n = getPer100g(f);
        return fatFilters.some((ff) => {
          if (ff.startsWith('Low')) return n.fat < 5;
          if (ff.startsWith('Medium')) return n.fat >= 5 && n.fat <= 15;
          if (ff.startsWith('High')) return n.fat > 15;
          return true;
        });
      });
    }

    const sortOpts = filters.sort || [];
    if (sortOpts.length > 0) {
      const s = sortOpts[0];
      if (s.startsWith('Lowest calories')) res.sort((a, b) => getPer100g(a).calories - getPer100g(b).calories);
      else if (s.startsWith('Highest protein')) res.sort((a, b) => getPer100g(b).protein - getPer100g(a).protein);
      else if (s.startsWith('Best protein')) {
        res.sort((a, b) => {
          const aN = getPer100g(a);
          const bN = getPer100g(b);
          return (bN.protein / (bN.calories || 1)) - (aN.protein / (aN.calories || 1));
        });
      } else if (s.startsWith('Lowest fat')) res.sort((a, b) => getPer100g(a).fat - getPer100g(b).fat);
    }

    return res;
  };

  const isSearching = debouncedQuery.length > 0;
  const results = applyClientFilters(apiResults);
  const hasResults = results.length > 0;

  const suggestions = SUGGESTIONS.map(getFood).filter(Boolean);
  const recentFoods = RECENT_FOODS.map(getFood).filter(Boolean);
  const savedFoods = SAVED_FOODS.map(getFood).filter(Boolean);

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
                placeholder="Search foods, brands, or barcode"
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
              ) : (
                <TouchableOpacity activeOpacity={0.7}>
                  <ScanLine size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
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
            <TouchableOpacity style={styles.quickActionBtn} activeOpacity={0.8}>
              <ScanLine size={16} color={Colors.textSecondary} />
              <Text style={styles.quickActionText}>Scan</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.resultsScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.resultsContent}
          >
            {topTab === 'All' && !isSearching && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Suggestions</Text>
                  {suggestions.map((food) => (
                    <SuggestionCard key={food.id} food={food} onPress={handleFoodPress} onAdd={handleAddPress} />
                  ))}
                </View>

                {recentFoods.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Recent</Text>
                      <TouchableOpacity activeOpacity={0.7}>
                        <Text style={styles.seeAll}>See all</Text>
                      </TouchableOpacity>
                    </View>
                    {recentFoods.map((food) => (
                      <SuggestionCard key={food.id} food={food} onPress={handleFoodPress} onAdd={handleAddPress} />
                    ))}
                  </View>
                )}

                {savedFoods.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Saved foods</Text>
                      <TouchableOpacity activeOpacity={0.7}>
                        <Text style={styles.seeAll}>See all</Text>
                      </TouchableOpacity>
                    </View>
                    {savedFoods.map((food) => (
                      <SuggestionCard key={food.id} food={food} onPress={handleFoodPress} onAdd={handleAddPress} />
                    ))}
                  </View>
                )}
              </>
            )}

            {topTab === 'Saved foods' && !isSearching && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Saved foods</Text>
                {savedFoods.length > 0 ? (
                  savedFoods.map((food) => (
                    <SuggestionCard key={food.id} food={food} onPress={handleFoodPress} onAdd={handleAddPress} />
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>❤️</Text>
                    <Text style={styles.emptyTitle}>No saved foods yet</Text>
                    <Text style={styles.emptySubtitle}>
                      Foods you save will appear here for quick access.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {isSearching && loading && (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Searching foods...</Text>
              </View>
            )}

            {isSearching && !loading && searchError && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>⚠️</Text>
                <Text style={styles.emptyTitle}>Something went wrong</Text>
                <Text style={styles.emptySubtitle}>{searchError}</Text>
              </View>
            )}

            {isSearching && !loading && !searchError && hasResults && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Results from FatSecret</Text>
                {results.map((food) => (
                  <FoodResultCard key={food.id} food={food} onPress={handleFoodPress} onAdd={handleAddPress} />
                ))}
              </View>
            )}

            {isSearching && !loading && !searchError && !hasResults && (
              <SearchEmptyState
                query={debouncedQuery}
                onAI={() => {}}
                onCreate={() => setShowCreateForm(true)}
              />
            )}

            {isSearching && !loading && (
              <TouchableOpacity style={styles.aiFloatingBtn} activeOpacity={0.85}>
                <Sparkles size={16} color={Colors.textPrimary} />
                <Text style={styles.aiFloatingText}>Generate results using AI</Text>
              </TouchableOpacity>
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
      />

      <AddToLogSheet
        visible={addSheetOpen}
        food={selectedFood}
        onAdd={handleConfirmAdd}
        onClose={() => setAddSheetOpen(false)}
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
  aiFloatingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginTop: 4,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  aiFloatingText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
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
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 12,
    width: '100%',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  aiBtnText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
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
