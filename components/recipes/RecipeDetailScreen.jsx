import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  StyleSheet, Dimensions, ActivityIndicator, Alert,
} from 'react-native';
import {
  ArrowLeft, Bookmark, Plus, Clock, Users,
  Flame, Trash2,
} from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNutritionDate } from '@/context/NutritionDateContext';
import { useFoodLog } from '@/hooks/useFoodLog';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';
import AddRecipeToLogSheet from './AddRecipeToLogSheet';
import NutritionFacts from './NutritionFacts';
import CalorieBreakdown from './CalorieBreakdown';
import { getCategoryIcon } from './foodCategoryIcons';
import {
  getRecipeBaseServings,
  scaledIngredientAmountLine,
  scaledIngredientMacros,
  stripSavesSnippetFromDescription,
} from '@/lib/recipeServingsScale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 280;

const DETAIL_TABS = ['Ingredients', 'Instructions', 'Nutrition'];

function StatPill({ icon, label }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.statPill}>
      {icon}
      <Text style={styles.statPillText}>{label}</Text>
    </View>
  );
}

function IngredientFoodCard({ ing, index, scaleFactor }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const macroColors = [Colors.proteinRing, Colors.carbsRing, Colors.fatRing];
  const accentColor = macroColors[index % macroColors.length];
  const categoryIcon = getCategoryIcon(ing.name);
  const amountLine = scaledIngredientAmountLine(ing, scaleFactor);
  const macros = scaledIngredientMacros(ing, scaleFactor);

  return (
    <View style={styles.ingFoodCard}>
      <View style={[styles.ingFoodIconWrap, { backgroundColor: accentColor + '18' }]}>
        <Image source={categoryIcon} style={styles.ingFoodCategoryIcon} />
      </View>
      <View style={styles.ingFoodInfo}>
        {amountLine ? (
          <Text style={styles.ingFoodName} numberOfLines={2}>{amountLine}</Text>
        ) : (
          <Text style={styles.ingFoodName} numberOfLines={2}>{ing.name}</Text>
        )}
        {amountLine ? (
          <Text style={styles.ingFoodServing} numberOfLines={2}>{ing.name}</Text>
        ) : null}
        {macros.calories > 0 && (
          <View style={styles.ingFoodMacros}>
            <View style={styles.ingFoodMacroItem}>
              <Flame size={10} color={Colors.calories} />
              <Text style={styles.ingFoodMacroText}>{macros.calories} kcal</Text>
            </View>
            {macros.protein > 0 && (
              <View style={styles.ingFoodMacroDot} />
            )}
            {macros.protein > 0 && (
              <Text style={[styles.ingFoodMacroText, { color: Colors.proteinRing }]}>{macros.protein}g P</Text>
            )}
            {macros.carbs > 0 && (
              <View style={styles.ingFoodMacroDot} />
            )}
            {macros.carbs > 0 && (
              <Text style={[styles.ingFoodMacroText, { color: Colors.carbsRing }]}>{macros.carbs}g C</Text>
            )}
            {macros.fat > 0 && (
              <View style={styles.ingFoodMacroDot} />
            )}
            {macros.fat > 0 && (
              <Text style={[styles.ingFoodMacroText, { color: Colors.fatRing }]}>{macros.fat}g F</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function formatServingsDisplay(n) {
  if (!Number.isFinite(n)) return '1';
  const r = Math.round(n * 10) / 10;
  if (Math.abs(r - Math.round(r)) < 1e-6) return String(Math.round(r));
  return String(r);
}

function IngredientsTab({ recipe, servings, onServingsChange, loadingDetail }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const baseServings = getRecipeBaseServings(recipe);
  const scaleFactor = baseServings > 0 ? servings / baseServings : 1;
  const minServings = 0.5;
  const dec = () => onServingsChange(Math.max(minServings, Math.round((servings - 0.5) * 2) / 2));
  const inc = () => onServingsChange(Math.round((servings + 0.5) * 2) / 2);

  return (
    <View style={styles.tabContent}>
      <View style={styles.timingRow}>
        <View style={styles.timingItem}>
          <Text style={styles.timingValue}>{recipe.prepTime || 0}m</Text>
          <Text style={styles.timingLabel}>Prep</Text>
        </View>
        <View style={styles.timingDivider} />
        <View style={styles.timingItem}>
          <Text style={styles.timingValue}>{recipe.cookTime || 0}m</Text>
          <Text style={styles.timingLabel}>Cook</Text>
        </View>
        <View style={styles.timingDivider} />
        <View style={styles.timingItem}>
          <Text style={styles.timingValue}>{(recipe.prepTime || 0) + (recipe.cookTime || 0)}m</Text>
          <Text style={styles.timingLabel}>Total</Text>
        </View>
      </View>

      <View style={styles.servingRow}>
        <Text style={styles.servingLabel}>Servings</Text>
        <View style={styles.servingControl}>
          <TouchableOpacity
            style={[styles.servingSmBtn, servings <= minServings && styles.servingSmBtnDisabled]}
            onPress={dec}
            activeOpacity={0.7}
            disabled={servings <= minServings}
          >
            <Text style={styles.servingSmBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.servingSmValue}>{formatServingsDisplay(servings)}</Text>
          <TouchableOpacity
            style={styles.servingSmBtn}
            onPress={inc}
            activeOpacity={0.7}
          >
            <Text style={styles.servingSmBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loadingDetail ? (
        <View style={styles.detailLoadingWrap}>
          <ActivityIndicator size="small" color={Colors.textTertiary} />
          <Text style={styles.detailLoadingText}>Loading ingredients...</Text>
        </View>
      ) : (recipe.ingredients || []).length === 0 ? (
        <View style={styles.emptyTabMsg}>
          <Text style={styles.emptyTabText}>No ingredient details available for this recipe.</Text>
        </View>
      ) : (
        <>
          {recipe.ingredients.map((ing, i) => (
            <IngredientFoodCard key={i} ing={ing} index={i} scaleFactor={scaleFactor} />
          ))}
        </>
      )}
    </View>
  );
}

function InstructionsTab({ recipe, loadingDetail }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.tabContent}>
      <View style={styles.timingRow}>
        <StatPill icon={<Clock size={14} color={Colors.textTertiary} />} label={`Prep ${recipe.prepTime || 0}m`} />
        <StatPill icon={<Clock size={14} color={Colors.textTertiary} />} label={`Cook ${recipe.cookTime || 0}m`} />
      </View>

      {loadingDetail ? (
        <View style={styles.detailLoadingWrap}>
          <ActivityIndicator size="small" color={Colors.textTertiary} />
          <Text style={styles.detailLoadingText}>Loading instructions...</Text>
        </View>
      ) : (recipe.instructions || []).length === 0 ? (
        <View style={styles.emptyTabMsg}>
          <Text style={styles.emptyTabText}>No step-by-step instructions available for this recipe.</Text>
        </View>
      ) : (recipe.instructions || []).map((step, i) => (
        <View key={step.step ?? i} style={styles.stepCard}>
          <View style={styles.stepNumberBadge}>
            <Text style={styles.stepNumber}>{step.step ?? i + 1}</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepText}>{step.text}</Text>
            {(step.ingredients || []).length > 0 && (
              <View style={styles.stepChips}>
                {step.ingredients.map((ing) => (
                  <View key={ing} style={styles.stepChip}>
                    <Text style={styles.stepChipText}>{ing}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function NutritionTab({ recipe }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const score = recipe.healthScore ?? 7;
  const scoreColor = score >= 8 ? Colors.success : score >= 6 ? Colors.warning : Colors.error;

  return (
    <View style={styles.tabContent}>
      <View style={styles.healthScoreCard}>
        <View style={styles.healthScoreLeft}>
          <Text style={styles.healthScoreTitle}>Health Score</Text>
          <Text style={styles.healthScoreSubtitle}>Based on nutritional balance</Text>
        </View>
        <View style={[styles.healthScoreBadge, { backgroundColor: scoreColor + '18' }]}>
          <Text style={[styles.healthScoreValue, { color: scoreColor }]}>{score}</Text>
          <Text style={[styles.healthScoreMax, { color: scoreColor }]}>/10</Text>
        </View>
      </View>

      <NutritionFacts recipe={recipe} />

      <CalorieBreakdown recipe={recipe} />
    </View>
  );
}

export default function RecipeDetailScreen({ recipe, onBack, loadingDetail, onDeleteRecipe }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const { user } = useAuth();
  const { dateKey } = useNutritionDate();
  const foodLog = useFoodLog(dateKey);
  const { isRecipeSaved, toggleSaveRecipe } = useSavedRecipes();

  const [detailTab, setDetailTab] = useState('Ingredients');
  const [servings, setServings] = useState(() =>
    Math.max(0.5, Number(recipe?.servings) || 1),
  );
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (!recipe?.id) return;
    setServings(Math.max(0.5, Number(recipe.servings) || 1));
  }, [recipe?.id, recipe?.servings]);

  if (!recipe) return null;

  const descriptionDisplay = stripSavesSnippetFromDescription(recipe.description);
  const saved = isRecipeSaved(recipe.id);

  const handleSave = async () => {
    try {
      await toggleSaveRecipe(recipe);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not update saved recipes');
    }
  };

  const handleConfirmAdd = async (entry) => {
    setAddSheetOpen(false);
    if (!user) return;
    try {
      const nps = recipe.nutritionPerServing || {};
      const perServingKcal = nps.kcal || nps.calories || recipe.calories || 0;
      const perServingProtein = nps.protein || recipe.protein || 0;
      const perServingCarbs = nps.carbs || recipe.carbs || 0;
      const perServingFat = nps.fat || recipe.fat || 0;
      const srvCount = entry.servings || 1;

      const totalGrams = (recipe.totalGrams || 100) * srvCount / getRecipeBaseServings(recipe);
      const per100gKcal = totalGrams > 0 ? (perServingKcal * srvCount * 100) / totalGrams : 0;
      const per100gProtein = totalGrams > 0 ? (perServingProtein * srvCount * 100) / totalGrams : 0;
      const per100gCarbs = totalGrams > 0 ? (perServingCarbs * srvCount * 100) / totalGrams : 0;
      const per100gFat = totalGrams > 0 ? (perServingFat * srvCount * 100) / totalGrams : 0;

      const recipeFood = {
        id: recipe.id,
        name: recipe.name,
        brand: 'Recipe',
        per100g: {
          kcal: Math.round(per100gKcal),
          protein: Math.round(per100gProtein * 10) / 10,
          carbs: Math.round(per100gCarbs * 10) / 10,
          fat: Math.round(per100gFat * 10) / 10,
        },
        servingGrams: Math.round(totalGrams),
      };

      await foodLog.addEntry(recipeFood, entry.mealType, Math.round(totalGrams), {
        type: 'recipe',
        servings: srvCount,
      });

      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not add recipe to food log');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: recipe.image }} style={styles.heroImage} />
          <View style={styles.imageOverlay} />

          <View style={styles.topActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={onBack} activeOpacity={0.8}>
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={styles.topActionsRight}>
              {onDeleteRecipe ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    Alert.alert(
                      'Delete recipe',
                      `Remove "${recipe.name}"? This cannot be undone.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => { void onDeleteRecipe(); },
                        },
                      ]
                    );
                  }}
                >
                  <Trash2 size={20} color="#FFFFFF" strokeWidth={2.2} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.actionBtn} onPress={handleSave} activeOpacity={0.8}>
                <Bookmark
                  size={20}
                  color="#FFFFFF"
                  fill={saved ? '#FFFFFF' : 'transparent'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.bodyPad}>
          <Text style={styles.recipeTitle}>{recipe.name}</Text>
          {descriptionDisplay ? (
            <Text style={styles.recipeDescription}>{descriptionDisplay}</Text>
          ) : null}

          <View style={styles.engagementRow}>
            <View style={styles.engagementItem}>
              <Users size={15} color={Colors.textTertiary} />
              <Text style={styles.engagementText}>{getRecipeBaseServings(recipe)} servings</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addToLogBtn}
            onPress={() => setAddSheetOpen(true)}
            activeOpacity={0.85}
          >
            <Plus size={18} color={Colors.onPrimary} strokeWidth={2.5} />
            <Text style={styles.addToLogText}>Add to Food Log</Text>
          </TouchableOpacity>

          <View style={styles.detailTabs}>
            {DETAIL_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.detailTab, detailTab === tab && styles.detailTabActive]}
                onPress={() => setDetailTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.detailTabText, detailTab === tab && styles.detailTabTextActive]}>
                  {tab}
                </Text>
                {detailTab === tab && <View style={styles.detailTabUnderline} />}
              </TouchableOpacity>
            ))}
          </View>

          {detailTab === 'Ingredients' && (
            <IngredientsTab recipe={recipe} servings={servings} onServingsChange={setServings} loadingDetail={loadingDetail} />
          )}
          {detailTab === 'Instructions' && <InstructionsTab recipe={recipe} loadingDetail={loadingDetail} />}
          {detailTab === 'Nutrition' && <NutritionTab recipe={recipe} />}

          <View style={styles.planRow}>
            <TouchableOpacity style={styles.planBtn} activeOpacity={0.8}>
              <Bookmark size={16} color={Colors.textSecondary} />
              <Text style={styles.planBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.planBtn} activeOpacity={0.8}>
              <Clock size={16} color={Colors.textSecondary} />
              <Text style={styles.planBtnText}>Plan</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {toastVisible && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Recipe added to Food Log</Text>
          <View style={styles.toastActions}>
            <TouchableOpacity onPress={() => setToastVisible(false)} activeOpacity={0.7}>
              <Text style={styles.toastAction}>View</Text>
            </TouchableOpacity>
            <Text style={styles.toastDot}>·</Text>
            <TouchableOpacity onPress={() => setToastVisible(false)} activeOpacity={0.7}>
              <Text style={styles.toastAction}>Undo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <AddRecipeToLogSheet
        visible={addSheetOpen}
        recipe={recipe}
        onAdd={handleConfirmAdd}
        onClose={() => setAddSheetOpen(false)}
      />
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  imageContainer: {
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.border,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topActions: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topActionsRight: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  bodyPad: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20 },
  recipeTitle: {
    fontSize: 26,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 8,
    lineHeight: 34,
  },
  recipeDescription: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  engagementRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  engagementItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  engagementText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  addToLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.textPrimary,
    borderRadius: 18,
    paddingVertical: 16,
    marginBottom: 24,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  addToLogText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.onPrimary,
  },
  detailTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 20,
  },
  detailTab: {
    flex: 1,
    paddingBottom: 14,
    alignItems: 'center',
    position: 'relative',
  },
  detailTabActive: {},
  detailTabText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
  },
  detailTabTextActive: {
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  detailTabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: '15%',
    right: '15%',
    height: 2.5,
    backgroundColor: Colors.textPrimary,
    borderRadius: 2,
  },
  tabContent: { marginBottom: 20 },
  timingRow: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    gap: 8,
  },
  timingItem: { alignItems: 'center', flex: 1 },
  timingValue: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  timingLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  timingDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statPillText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  servingLabel: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  servingControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  servingSmBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingSmBtnDisabled: { opacity: 0.35 },
  servingSmBtnText: {
    fontSize: 20,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  servingSmValue: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  ingredientIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  ingredientEmoji: { fontSize: 20 },
  ingredientName: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  ingredientAmount: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  stepCard: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 14,
  },
  stepNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  stepNumber: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.onPrimary,
  },
  stepContent: { flex: 1 },
  stepText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 8,
  },
  stepChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stepChip: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepChipText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  healthScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  healthScoreLeft: {},
  healthScoreTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  healthScoreSubtitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
  },
  healthScoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  healthScoreValue: {
    fontSize: 36,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  healthScoreMax: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-SemiBold',
    marginLeft: 2,
  },
  planRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  planBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  planBtnText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
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
  toastDot: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyTabMsg: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyTabText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  detailLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
  },
  detailLoadingText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  ingFoodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  ingFoodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ingFoodEmoji: {
    fontSize: 20,
  },
  ingFoodCategoryIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  ingFoodInfo: {
    flex: 1,
    gap: 3,
  },
  ingFoodName: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  ingFoodServing: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
  },
  ingFoodMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  ingFoodMacroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ingFoodMacroText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
  },
  ingFoodMacroDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.border,
  },
});
