import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  StyleSheet, TextInput, ActivityIndicator,
} from 'react-native';
import { Search, SlidersHorizontal, Bookmark, Plus, Zap, Pencil, Copy, Trash2, X, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { RECIPES } from '@/data/recipeData';
import RecipeFilterSheet, { EMPTY_FILTERS } from './RecipeFilterSheet';
import RecipeDetailScreen from './RecipeDetailScreen';
import { getCategoryIcon } from './foodCategoryIcons';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const FALLBACK_IMAGES = [
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/704569/pexels-photo-704569.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/1410235/pexels-photo-1410235.jpeg?auto=compress&cs=tinysrgb&w=400',
];

function normalizeFatSecretRecipe(r, index) {
  return {
    id: `fs_${r.id}`,
    name: r.name,
    description: r.description || '',
    image: r.image || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
    calories: r.calories || 0,
    protein: r.protein || 0,
    carbs: r.carbs || 0,
    fat: r.fat || 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    saturatedFat: 0,
    transFat: 0,
    cholesterol: 0,
    salt: 0,
    cookTime: r.cookTime || r.totalTime || 30,
    prepTime: r.prepTime || 10,
    rating: r.rating || 4.0,
    cuisine: r.categories?.[0] || r.types?.[0] || 'International',
    category: r.types?.[0] || r.categories?.[0] || 'Main Course',
    diet: r.categories || [],
    saved: false,
    saves: 0,
    servings: 1,
    author: 'FatSecret',
    healthScore: 7,
    ingredients: [],
    instructions: [],
    source: 'fatsecret',
  };
}

async function fetchFatSecretRecipeDetail(recipeId) {
  const rawId = recipeId.startsWith('fs_') ? recipeId.slice(3) : recipeId;
  const params = new URLSearchParams({ action: 'recipe_get', recipe_id: rawId });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/fatsecret-proxy?${params}`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch recipe detail');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.recipe;
}

async function fetchFatSecretRecipes(query, recipeType) {
  const params = new URLSearchParams({ action: 'recipes', max_results: '20' });
  if (query.trim()) params.set('q', query.trim());
  if (recipeType) params.set('recipe_type', recipeType);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/fatsecret-proxy?${params}`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch recipes');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return (data.recipes || []).map(normalizeFatSecretRecipe);
}

const RECIPE_TABS = ['Explore', 'Saved Foods', 'My Recipes'];

function SectionHeader({ title, onSeeAll }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7} style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>See all</Text>
          <ChevronRight size={14} color={Colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function ExploreSectionCard({ icon, title, subtitle, onPress }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <TouchableOpacity style={styles.exploreSectionCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.exploreSectionIcon}>
        <Text style={styles.exploreSectionEmoji}>{icon}</Text>
      </View>
      <View style={styles.exploreSectionInfo}>
        <Text style={styles.exploreSectionTitle}>{title}</Text>
        <Text style={styles.exploreSectionSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

function ExploreTab({ recipes, recentRecipes, onPress, onSave, onSwitchTab, loading }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const saved = recipes.filter((r) => r.saved);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.textPrimary} />
        <Text style={styles.loadingText}>Loading recipes...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.section}>
        <SectionHeader title="Recently viewed" onSeeAll={recentRecipes.length > 0 ? () => {} : undefined} />
        {recentRecipes.length > 0 ? (
          recentRecipes.slice(0, 3).map((r) => {
            const catIcon = getCategoryIcon(r.ingredients?.[0]?.name || r.name);
            return (
              <TouchableOpacity key={r.id} style={styles.goalCard} onPress={() => onPress(r)} activeOpacity={0.85}>
                <View style={styles.goalImageWrap}>
                  <Image source={{ uri: r.image }} style={styles.goalImage} />
                  <View style={styles.goalIconBadge}>
                    <Image source={catIcon} style={styles.goalCatIcon} />
                  </View>
                </View>
                <View style={styles.goalInfo}>
                  <Text style={styles.goalName} numberOfLines={1}>{r.name}</Text>
                  <Text style={styles.goalMeta}>{r.cookTime}m · {r.calories} kcal</Text>
                </View>
                <ChevronRight size={16} color={Colors.textTertiary} />
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyStateSmall}>
            <Text style={styles.emptySmallIcon}>🕐</Text>
            <Text style={styles.emptySmallText}>Recipes you view will appear here</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Saved Foods" onSeeAll={saved.length > 0 ? () => onSwitchTab('Saved Foods') : undefined} />
        {saved.length > 0 ? (
          saved.slice(0, 3).map((r) => {
            const catIcon = getCategoryIcon(r.ingredients?.[0]?.name || r.name);
            return (
              <TouchableOpacity key={r.id} style={styles.goalCard} onPress={() => onPress(r)} activeOpacity={0.85}>
                <View style={styles.goalImageWrap}>
                  <Image source={{ uri: r.image }} style={styles.goalImage} />
                  <View style={styles.goalIconBadge}>
                    <Image source={catIcon} style={styles.goalCatIcon} />
                  </View>
                </View>
                <View style={styles.goalInfo}>
                  <Text style={styles.goalName} numberOfLines={1}>{r.name}</Text>
                  <Text style={styles.goalMeta}>{r.cookTime}m · {r.calories} kcal</Text>
                </View>
                <TouchableOpacity onPress={() => onSave(r.id)} activeOpacity={0.8} style={{ padding: 8 }}>
                  <Bookmark size={16} color={Colors.textPrimary} fill={Colors.textPrimary} strokeWidth={2} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyStateSmall}>
            <Text style={styles.emptySmallIcon}>🔖</Text>
            <Text style={styles.emptySmallText}>Save recipes to find them quickly later</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="My Recipes" onSeeAll={() => onSwitchTab('My Recipes')} />
        <ExploreSectionCard
          icon="👨‍🍳"
          title="Your recipes"
          subtitle="Create and manage your own custom recipes"
          onPress={() => onSwitchTab('My Recipes')}
        />
      </View>
    </>
  );
}

function SearchResultCard({ recipe, onPress, onSave }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const catIcon = getCategoryIcon(recipe.ingredients?.[0]?.name || recipe.name);
  return (
    <TouchableOpacity style={styles.searchResultCard} onPress={() => onPress(recipe)} activeOpacity={0.85}>
      <View style={styles.searchResultImageWrap}>
        <Image source={{ uri: recipe.image }} style={styles.searchResultImage} />
        <View style={styles.searchResultIconBadge}>
          <Image source={catIcon} style={styles.searchResultCatIcon} />
        </View>
      </View>
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName} numberOfLines={2}>{recipe.name}</Text>
        <View style={styles.searchResultMeta}>
          <Zap size={12} color={Colors.calories} />
          <Text style={styles.searchResultCal}>{recipe.calories} kcal</Text>
          {recipe.servings > 1 && (
            <Text style={styles.searchResultServing}>· {recipe.servings} servings</Text>
          )}
        </View>
        <View style={styles.searchResultMacros}>
          <Text style={styles.searchResultMacro}>P <Text style={styles.searchResultMacroVal}>{recipe.protein}g</Text></Text>
          <Text style={styles.searchResultMacroDot}>·</Text>
          <Text style={styles.searchResultMacro}>C <Text style={styles.searchResultMacroVal}>{recipe.carbs}g</Text></Text>
          <Text style={styles.searchResultMacroDot}>·</Text>
          <Text style={styles.searchResultMacro}>F <Text style={styles.searchResultMacroVal}>{recipe.fat}g</Text></Text>
        </View>
        {recipe.source === 'fatsecret' && (
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>FatSecret</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.searchResultSaveBtn}
        onPress={() => onSave(recipe.id)}
        activeOpacity={0.8}
      >
        <Bookmark
          size={16}
          color={recipe.saved ? Colors.textPrimary : Colors.textTertiary}
          fill={recipe.saved ? Colors.textPrimary : 'transparent'}
          strokeWidth={2}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function SearchResultsView({ results, loading, error, query, onPress, onSave }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.textPrimary} />
        <Text style={styles.loadingText}>Searching recipes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>⚠️</Text>
        <Text style={styles.emptyTitle}>Something went wrong</Text>
        <Text style={styles.emptySubtitle}>{error}</Text>
      </View>
    );
  }

  if (results.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>No recipes found</Text>
        <Text style={styles.emptySubtitle}>
          No results for "{query}". Try different keywords.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.searchResultsHeader}>
        <Text style={styles.sectionTitle}>Results</Text>
        <Text style={styles.searchResultsCount}>{results.length} recipes</Text>
      </View>
      {results.map((r) => (
        <SearchResultCard key={r.id} recipe={r} onPress={onPress} onSave={onSave} />
      ))}
    </View>
  );
}

function SavedFoodsTab({ recipes, onPress, onRemove }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const saved = recipes.filter((r) => r.saved);

  if (saved.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🔖</Text>
        <Text style={styles.emptyTitle}>No saved foods yet</Text>
        <Text style={styles.emptySubtitle}>Save recipes and foods to find them quickly later</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Recently saved" />
      {saved.map((r) => {
        const primaryIngredient = r.ingredients?.[0]?.name;
        const catIcon = getCategoryIcon(primaryIngredient || r.name);
        return (
        <TouchableOpacity key={r.id} style={styles.savedCard} onPress={() => onPress(r)} activeOpacity={0.85}>
          <View style={styles.savedImageWrap}>
            <Image source={{ uri: r.image }} style={styles.savedImage} />
            <View style={styles.savedIconBadge}>
              <Image source={catIcon} style={styles.savedCatIcon} />
            </View>
          </View>
          <View style={styles.savedInfo}>
            <Text style={styles.savedName} numberOfLines={1}>{r.name}</Text>
            <Text style={styles.savedMeta}>{r.cookTime}m · {r.calories} kcal</Text>
            <View style={styles.savedActions}>
              <TouchableOpacity style={styles.savedActionBtn} activeOpacity={0.7}>
                <Plus size={13} color={Colors.primary} strokeWidth={2.5} />
                <Text style={styles.savedActionText}>Add to Log</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.savedRemoveBtn}
            onPress={() => onRemove(r.id)}
            activeOpacity={0.7}
          >
            <X size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MyRecipesTab({ onPress }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const myRecipes = [
    { id: 'my1', name: 'My Protein Shake', prepTime: 3, cookTime: 0, calories: 320, image: 'https://images.pexels.com/photos/1346382/pexels-photo-1346382.jpeg?auto=compress&cs=tinysrgb&w=400' },
  ];

  return (
    <>
      <TouchableOpacity style={styles.createRecipeBtn} activeOpacity={0.85}>
        <Plus size={20} color={Colors.textPrimary} strokeWidth={2.5} />
        <Text style={styles.createRecipeText}>Create a new recipe</Text>
      </TouchableOpacity>

      {myRecipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👨‍🍳</Text>
          <Text style={styles.emptyTitle}>No recipes yet</Text>
          <Text style={styles.emptySubtitle}>Create your own custom recipes to track nutrition perfectly</Text>
        </View>
      ) : (
        <View style={styles.section}>
          <SectionHeader title="My recipes" />
          {myRecipes.map((r) => (
            <View key={r.id} style={styles.myRecipeCard}>
              <Image source={{ uri: r.image }} style={styles.myRecipeImage} />
              <View style={styles.myRecipeInfo}>
                <Text style={styles.myRecipeName}>{r.name}</Text>
                <Text style={styles.myRecipeMeta}>{r.prepTime + r.cookTime}m · {r.calories} kcal</Text>
              </View>
              <View style={styles.myRecipeActions}>
                <TouchableOpacity style={styles.myActionBtn} activeOpacity={0.7}>
                  <Pencil size={14} color={Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.myActionBtn} activeOpacity={0.7}>
                  <Copy size={14} color={Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.myActionBtn} activeOpacity={0.7}>
                  <Trash2 size={14} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export default function RecipesView() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const [tab, setTab] = useState('Explore');
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [localRecipes, setLocalRecipes] = useState(RECIPES);

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [recentRecipes, setRecentRecipes] = useState([]);

  const debounceRef = useRef(null);

  const isSearching = debouncedQuery.trim().length > 0;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setDebouncedQuery('');
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) return;
    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);
    (async () => {
      try {
        const results = await fetchFatSecretRecipes(debouncedQuery, '');
        if (!cancelled) setSearchResults(results);
      } catch {
        if (!cancelled) {
          setSearchError('Could not load recipes. Please try again.');
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleClearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
    setSearchResults([]);
    setSearchError(null);
    setSearchLoading(false);
  };

  const activeCount =
    (filters.mealType?.length || 0) +
    (filters.diet?.length || 0) +
    (filters.cookTime?.length || 0) +
    (filters.cuisine?.length || 0) +
    (filters.nutrition?.length || 0) +
    (filters.ingredients?.length || 0) +
    (filters.applyPreferences ? 1 : 0) +
    (filters.savedOnly ? 1 : 0);

  const handleSave = (id) => {
    setLocalRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, saved: !r.saved } : r)));
    setSearchResults((prev) => prev.map((r) => (r.id === id ? { ...r, saved: !r.saved } : r)));
  };

  const handleRemoveSaved = (id) => {
    setLocalRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, saved: false } : r)));
    setSearchResults((prev) => prev.map((r) => (r.id === id ? { ...r, saved: false } : r)));
  };

  const handleRecipePress = useCallback(async (recipe) => {
    setRecentRecipes((prev) => {
      const without = prev.filter((r) => r.id !== recipe.id);
      return [recipe, ...without].slice(0, 10);
    });
    setSelectedRecipe(recipe);
    if (recipe.source === 'fatsecret') {
      setLoadingDetail(true);
      try {
        const detail = await fetchFatSecretRecipeDetail(recipe.id);
        setSelectedRecipe((prev) => prev && prev.id === recipe.id ? {
          ...prev,
          ingredients: detail.ingredients || [],
          instructions: detail.instructions || [],
          servings: detail.servings || prev.servings,
          fiber: detail.fiber ?? prev.fiber,
          sugar: detail.sugar ?? prev.sugar,
          sodium: detail.sodium ?? prev.sodium,
          saturatedFat: detail.saturatedFat ?? prev.saturatedFat,
          cholesterol: detail.cholesterol ?? prev.cholesterol,
        } : prev);
      } catch (_) {
      } finally {
        setLoadingDetail(false);
      }
    }
  }, []);

  if (selectedRecipe) {
    return (
      <RecipeDetailScreen
        recipe={selectedRecipe}
        loadingDetail={loadingDetail}
        onBack={() => { setSelectedRecipe(null); setLoadingDetail(false); }}
        onSaveToggle={(id, saved) => {
          handleSave(id);
          setSelectedRecipe((prev) => ({ ...prev, saved }));
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Search size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search recipes, ingredients, cuisines..."
          placeholderTextColor={Colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
          selectionColor={Colors.textPrimary}
        />
        {searchLoading && query.trim().length > 0 ? (
          <ActivityIndicator size="small" color={Colors.textTertiary} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={handleClearSearch} activeOpacity={0.7}>
            <X size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setFilterOpen(true)} activeOpacity={0.7} style={[styles.filterBtn, activeCount > 0 && styles.filterBtnActive]}>
            <SlidersHorizontal size={18} color={activeCount > 0 ? Colors.onPrimary : Colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {!isSearching && (
        <View style={styles.tabRow}>
          {RECIPE_TABS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabItem, tab === t && styles.tabItemActive]}
              onPress={() => setTab(t)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
              {tab === t && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {isSearching ? (
          <SearchResultsView
            results={searchResults}
            loading={searchLoading}
            error={searchError}
            query={debouncedQuery}
            onPress={handleRecipePress}
            onSave={handleSave}
          />
        ) : (
          <>
            {tab === 'Explore' && (
              <ExploreTab
                recipes={localRecipes}
                recentRecipes={recentRecipes}
                onPress={handleRecipePress}
                onSave={handleSave}
                onSwitchTab={setTab}
                loading={false}
              />
            )}
            {tab === 'Saved Foods' && (
              <SavedFoodsTab
                recipes={localRecipes}
                onPress={handleRecipePress}
                onRemove={handleRemoveSaved}
              />
            )}
            {tab === 'My Recipes' && (
              <MyRecipesTab onPress={handleRecipePress} />
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <RecipeFilterSheet
        visible={filterOpen}
        filters={filters}
        onApply={setFilters}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textPrimary,
  },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: Colors.textPrimary,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
  },
  tabItemActive: {},
  tabText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
  },
  tabTextActive: {
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 2.5,
    backgroundColor: Colors.textPrimary,
    borderRadius: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
  },
  exploreSectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exploreSectionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  exploreSectionEmoji: { fontSize: 26 },
  exploreSectionInfo: { flex: 1 },
  exploreSectionTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  exploreSectionSubtitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    lineHeight: 18,
  },
  emptyStateSmall: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptySmallIcon: { fontSize: 32, marginBottom: 8 },
  emptySmallText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  goalImageWrap: { position: 'relative', marginRight: 14 },
  goalImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: Colors.border,
  },
  goalIconBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  goalCatIcon: { width: 16, height: 16, resizeMode: 'contain' },
  goalInfo: { flex: 1 },
  goalName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  goalMeta: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginBottom: 6,
  },
  goalSaveBtn: { padding: 8 },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  savedImageWrap: { position: 'relative', marginRight: 14 },
  savedImage: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: Colors.border,
  },
  savedIconBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  savedCatIcon: { width: 16, height: 16, resizeMode: 'contain' },
  savedInfo: { flex: 1 },
  savedName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  savedMeta: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginBottom: 8,
  },
  savedActions: { flexDirection: 'row' },
  savedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  savedActionText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.primary,
  },
  savedRemoveBtn: { padding: 8 },
  createRecipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    paddingVertical: 18,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  createRecipeText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
  myRecipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  myRecipeImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: Colors.border,
    marginRight: 14,
  },
  myRecipeInfo: { flex: 1 },
  myRecipeName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  myRecipeMeta: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
  },
  myRecipeActions: { flexDirection: 'row', gap: 4 },
  myActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
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
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchResultsCount: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchResultImageWrap: { position: 'relative', marginRight: 14 },
  searchResultImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: Colors.border,
  },
  searchResultIconBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  searchResultCatIcon: { width: 15, height: 15, resizeMode: 'contain' },
  searchResultInfo: { flex: 1 },
  searchResultName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  searchResultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  searchResultCal: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  searchResultServing: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
  },
  searchResultMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  searchResultMacro: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
  },
  searchResultMacroVal: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
  searchResultMacroDot: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#16A34A',
  },
  searchResultSaveBtn: {
    padding: 8,
    marginLeft: 4,
  },
});
