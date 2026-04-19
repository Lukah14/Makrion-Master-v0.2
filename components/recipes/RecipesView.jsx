import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  StyleSheet, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Search, SlidersHorizontal, Bookmark, Plus, Zap, Pencil, Copy, Trash2, X, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { RECIPES } from '@/data/recipeData';
import RecipeFilterSheet, { EMPTY_FILTERS } from './RecipeFilterSheet';
import RecipeDetailScreen from './RecipeDetailScreen';
import CreateRecipeScreen from './CreateRecipeScreen';
import { getCategoryIcon } from './foodCategoryIcons';
import { useRecipes } from '@/hooks/useRecipes';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';
import {
  filterRecipes,
  sortRecipes,
  countActiveFilters,
  buildFilterChips,
  removeFilterByChipId,
} from '@/lib/recipeFilters';
import { fatSecretProxyGet } from '@/lib/foodSearchApi';

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
  const data = await fatSecretProxyGet({ action: 'recipe_get', recipe_id: rawId });
  if (data.error) throw new Error(data.error);
  return data.recipe;
}

async function fetchFatSecretRecipes(query, recipeType) {
  const queryParams = { action: 'recipes', max_results: '20' };
  if (query.trim()) queryParams.q = query.trim();
  if (recipeType) queryParams.recipe_type = recipeType;
  const data = await fatSecretProxyGet(queryParams);
  if (data.error) throw new Error(data.error);
  return (data.recipes || []).map(normalizeFatSecretRecipe);
}

const RECIPE_TABS = ['Explore', 'Saved Recipes', 'My Recipes'];

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

function ExploreTab({ recentRecipes, savedPreview, savedLoading, onPress, onToggleSaveRecipe, onSwitchTab, loading }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

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
        <SectionHeader title="Saved recipes" onSeeAll={savedPreview.length > 0 ? () => onSwitchTab('Saved Recipes') : undefined} />
        {savedLoading ? (
          <ActivityIndicator style={{ marginVertical: 16 }} color={Colors.textTertiary} />
        ) : savedPreview.length > 0 ? (
          savedPreview.map((r) => {
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
                <TouchableOpacity onPress={() => onToggleSaveRecipe(r)} activeOpacity={0.8} style={{ padding: 8 }}>
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
          <Text style={styles.searchResultCal}>{recipe.nutritionPerServing?.kcal ?? recipe.calories ?? 0} kcal</Text>
          {recipe.servings > 1 && (
            <Text style={styles.searchResultServing}>· {recipe.servings} servings</Text>
          )}
        </View>
        <View style={styles.searchResultMacros}>
          <Text style={styles.searchResultMacro}>P <Text style={styles.searchResultMacroVal}>{recipe.nutritionPerServing?.protein ?? recipe.protein ?? 0}g</Text></Text>
          <Text style={styles.searchResultMacroDot}>·</Text>
          <Text style={styles.searchResultMacro}>C <Text style={styles.searchResultMacroVal}>{recipe.nutritionPerServing?.carbs ?? recipe.carbs ?? 0}g</Text></Text>
          <Text style={styles.searchResultMacroDot}>·</Text>
          <Text style={styles.searchResultMacro}>F <Text style={styles.searchResultMacroVal}>{recipe.nutritionPerServing?.fat ?? recipe.fat ?? 0}g</Text></Text>
        </View>
        {recipe.source === 'fatsecret' && (
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>FatSecret</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.searchResultSaveBtn}
        onPress={() => onSave(recipe)}
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

function SearchResultsView({
  results,
  loading,
  error,
  query,
  onPress,
  onSave,
  savedIds = new Set(),
  filteredOutByFilters = false,
}) {
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
        <Text style={styles.emptyIcon}>{filteredOutByFilters ? '🎛️' : '🔍'}</Text>
        <Text style={styles.emptyTitle}>
          {filteredOutByFilters ? 'No matches for filters' : 'No recipes found'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {filteredOutByFilters
            ? 'Try clearing some filters or broadening your search.'
            : `No results for "${query}". Try different keywords.`}
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
        <SearchResultCard
          key={r.id}
          recipe={{ ...r, saved: savedIds?.has(String(r.id)) || !!r.saved }}
          onPress={onPress}
          onSave={onSave}
        />
      ))}
    </View>
  );
}

function SavedRecipesTab({ recipes, loading, error, onPress, onRemove, emptyAfterFilter }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.textPrimary} />
        <Text style={styles.loadingText}>Loading saved recipes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Could not load saved recipes</Text>
        <Text style={styles.emptySubtitle}>{error}</Text>
      </View>
    );
  }

  if (recipes.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>{emptyAfterFilter ? '🎛️' : '🔖'}</Text>
        <Text style={styles.emptyTitle}>{emptyAfterFilter ? 'No saved recipes match filters' : 'No saved recipes yet'}</Text>
        <Text style={styles.emptySubtitle}>
          {emptyAfterFilter
            ? 'Adjust or clear filters to see more saved recipes.'
            : 'Save recipes from search or explore to find them here'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Saved recipes" />
      {recipes.map((r) => {
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

function MyRecipesTab({ onPress, onCreate, recipes, loading, error, onDelete, emptyAfterFilter }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <>
      <TouchableOpacity style={styles.createRecipeBtn} activeOpacity={0.85} onPress={onCreate}>
        <Plus size={20} color={Colors.textPrimary} strokeWidth={2.5} />
        <Text style={styles.createRecipeText}>Create a new recipe</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={Colors.textTertiary} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Could not load recipes</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
        </View>
      ) : recipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>{emptyAfterFilter ? '🎛️' : '👨‍🍳'}</Text>
          <Text style={styles.emptyTitle}>{emptyAfterFilter ? 'No recipes match filters' : 'No recipes yet'}</Text>
          <Text style={styles.emptySubtitle}>
            {emptyAfterFilter
              ? 'Clear filters or create a recipe that fits your criteria.'
              : 'Create your own custom recipes to track nutrition perfectly'}
          </Text>
        </View>
      ) : (
        <View style={styles.section}>
          <SectionHeader title="My recipes" />
          {recipes.map((r) => {
            const kcal = r.nutritionPerServing?.kcal ?? r.calories ?? 0;
            const totalTime = (r.prepTimeMinutes || 0) + (r.cookTimeMinutes || 0);
            return (
              <View key={r.id} style={styles.myRecipeCard}>
                <TouchableOpacity
                  style={styles.myRecipeCardMain}
                  activeOpacity={0.7}
                  onPress={() => onPress?.(r)}
                >
                  <View style={styles.myRecipeIconWrap}>
                    <Text style={styles.myRecipeEmoji}>🍽️</Text>
                  </View>
                  <View style={styles.myRecipeInfo}>
                    <Text style={styles.myRecipeName} numberOfLines={1}>{r.name}</Text>
                    <Text style={styles.myRecipeMeta}>
                      {totalTime > 0 ? `${totalTime}m · ` : ''}{kcal} kcal · {r.servings || 1} serving{(r.servings || 1) > 1 ? 's' : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.myActionBtn}
                  activeOpacity={0.7}
                  onPress={() => {
                    Alert.alert(
                      'Delete recipe',
                      `Remove "${r.name}"?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => { void onDelete?.(r.id); },
                        },
                      ]
                    );
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={14} color={Colors.error || '#FF3B30'} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}

export default function RecipesView() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const { user, loading: authLoading } = useAuth();

  const {
    recipes: userRecipes,
    loading: userRecipesLoading,
    error: userRecipesError,
    addRecipe,
    removeRecipe,
    reload: reloadRecipes,
  } = useRecipes();
  const {
    recipes: savedRecipes,
    docs: savedDocs,
    loading: savedRecipesLoading,
    error: savedRecipesError,
    toggleSaveRecipe,
    unsaveRecipe,
    savedIds,
  } = useSavedRecipes();

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
  const [showCreateRecipe, setShowCreateRecipe] = useState(false);

  const debounceRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setQuery('');
      setDebouncedQuery('');
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
    }
  }, [user?.uid]);

  const isSearching = debouncedQuery.trim().length > 0;

  const savedEnriched = useMemo(
    () =>
      savedRecipes.map((r, i) => ({
        ...r,
        _addedAt: savedDocs[i]?.addedAt?.toMillis?.() ?? 0,
      })),
    [savedRecipes, savedDocs]
  );

  const userRecipesDisplay = useMemo(
    () =>
      userRecipes.map((r) => ({
        ...r,
        image: r.imageUrl || r.image || FALLBACK_IMAGES[0],
        cookTime: r.cookTimeMinutes ?? r.cookTime ?? 0,
        prepTime: r.prepTimeMinutes ?? r.prepTime ?? 0,
        calories: r.nutritionPerServing?.kcal ?? r.calories ?? 0,
        protein: r.nutritionPerServing?.protein ?? r.protein ?? 0,
        carbs: r.nutritionPerServing?.carbs ?? r.carbs ?? 0,
        fat: r.nutritionPerServing?.fat ?? r.fat ?? 0,
      })),
    [userRecipes]
  );

  const searchIndexed = useMemo(
    () => searchResults.map((r, i) => ({ ...r, _searchIndex: i })),
    [searchResults]
  );

  const filteredSearch = useMemo(() => {
    const f = filterRecipes(searchIndexed, filters);
    return sortRecipes(f, filters.sortBy, true);
  }, [searchIndexed, filters]);

  const filteredSaved = useMemo(() => {
    const f = filterRecipes(savedEnriched, filters);
    return sortRecipes(f, filters.sortBy, false);
  }, [savedEnriched, filters]);

  const filteredMy = useMemo(() => {
    const f = filterRecipes(userRecipesDisplay, filters);
    return sortRecipes(f, filters.sortBy, false);
  }, [userRecipesDisplay, filters]);

  const filteredRecent = useMemo(() => {
    const f = filterRecipes(recentRecipes, filters);
    return sortRecipes(f, filters.sortBy, false);
  }, [recentRecipes, filters]);

  const filteredSavedPreview = useMemo(() => {
    return sortRecipes(filterRecipes(savedEnriched, filters), filters.sortBy, false).slice(0, 3);
  }, [savedEnriched, filters]);

  const activeCount = countActiveFilters(filters);
  const filterChipDescriptors = useMemo(() => buildFilterChips(filters), [filters]);

  const clearAllFilters = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS });
  }, []);

  const removeChip = useCallback((chipId) => {
    setFilters((prev) => removeFilterByChipId(prev, chipId));
  }, []);

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
    if (authLoading || !user?.uid) return;
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
  }, [debouncedQuery, user?.uid, authLoading]);

  const handleClearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
    setSearchResults([]);
    setSearchError(null);
    setSearchLoading(false);
  };

  const handleToggleSaveRecipe = async (recipe) => {
    try {
      await toggleSaveRecipe(recipe);
    } catch {
      // Firestore / rules error — UI still syncs from savedRecipes listener
    }
  };

  const handleRemoveSaved = async (id) => {
    try {
      await unsaveRecipe(id);
    } catch {
      // ignore
    }
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

  if (showCreateRecipe) {
    return (
      <CreateRecipeScreen
        onBack={() => setShowCreateRecipe(false)}
        onCreated={() => reloadRecipes()}
      />
    );
  }

  if (selectedRecipe) {
    const canDeleteRecipe = userRecipes.some((r) => r.id === selectedRecipe.id);
    return (
      <RecipeDetailScreen
        recipe={selectedRecipe}
        loadingDetail={loadingDetail}
        onBack={() => { setSelectedRecipe(null); setLoadingDetail(false); }}
        onDeleteRecipe={canDeleteRecipe ? async () => {
          try {
            await removeRecipe(selectedRecipe.id);
            setSelectedRecipe(null);
            setLoadingDetail(false);
          } catch (e) {
            Alert.alert('Could not delete recipe', e?.message || 'Please try again.');
          }
        } : undefined}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Search size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search recipes, ingredients..."
          placeholderTextColor={Colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
          selectionColor={Colors.textPrimary}
        />
        {searchLoading && query.trim().length > 0 ? (
          <ActivityIndicator size="small" color={Colors.textTertiary} />
        ) : null}
        {query.length > 0 ? (
          <TouchableOpacity onPress={handleClearSearch} activeOpacity={0.7} style={styles.searchBarIconBtn}>
            <X size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          onPress={() => setFilterOpen(true)}
          activeOpacity={0.7}
          style={[styles.filterBtn, activeCount > 0 && styles.filterBtnActive]}
        >
          <SlidersHorizontal size={18} color={activeCount > 0 ? Colors.onPrimary : Colors.textSecondary} strokeWidth={2} />
          {activeCount > 0 ? (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountBadgeText}>{activeCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {filterChipDescriptors.length > 0 && (
        <View style={styles.chipStripWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipStripContent}
            keyboardShouldPersistTaps="handled"
          >
            {filterChipDescriptors.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.activeChip}
                onPress={() => removeChip(c.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.activeChipText} numberOfLines={1}>{c.label}</Text>
                <X size={14} color={Colors.textSecondary} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.clearAllChip} onPress={clearAllFilters} activeOpacity={0.75}>
              <Text style={styles.clearAllChipText}>Clear all</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

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
            results={filteredSearch}
            loading={searchLoading}
            error={searchError}
            query={debouncedQuery}
            onPress={handleRecipePress}
            onSave={handleToggleSaveRecipe}
            savedIds={savedIds}
            filteredOutByFilters={searchResults.length > 0 && filteredSearch.length === 0}
          />
        ) : (
          <>
            {tab === 'Explore' && (
              <ExploreTab
                recentRecipes={filteredRecent}
                savedPreview={filteredSavedPreview}
                savedLoading={savedRecipesLoading}
                onPress={handleRecipePress}
                onToggleSaveRecipe={handleToggleSaveRecipe}
                onSwitchTab={setTab}
                loading={false}
              />
            )}
            {tab === 'Saved Recipes' && (
              <SavedRecipesTab
                recipes={filteredSaved}
                loading={savedRecipesLoading}
                error={savedRecipesError}
                onPress={handleRecipePress}
                onRemove={handleRemoveSaved}
                emptyAfterFilter={savedRecipes.length > 0 && filteredSaved.length === 0}
              />
            )}
            {tab === 'My Recipes' && (
              <MyRecipesTab
                recipes={filteredMy}
                loading={userRecipesLoading}
                error={userRecipesError}
                onPress={handleRecipePress}
                onCreate={() => setShowCreateRecipe(true)}
                emptyAfterFilter={userRecipes.length > 0 && filteredMy.length === 0}
                onDelete={async (id) => {
                  try {
                    await removeRecipe(id);
                  } catch (e) {
                    Alert.alert('Could not delete recipe', e?.message || 'Please try again.');
                  }
                }}
              />
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
  searchBarIconBtn: {
    padding: 4,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: Colors.textPrimary,
  },
  filterCountBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.cardBackground,
  },
  filterCountBadgeText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.onPrimary,
  },
  chipStripWrap: {
    marginHorizontal: 16,
    marginBottom: 6,
    maxHeight: 44,
  },
  chipStripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 220,
  },
  activeChipText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  clearAllChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.textPrimary,
    borderStyle: 'dashed',
  },
  clearAllChipText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
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
  myRecipeCardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  myRecipeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  myRecipeEmoji: { fontSize: 24 },
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
