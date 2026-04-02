import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import Card from '@/components/common/Card';
import ProgressRing from '@/components/common/ProgressRing';
import StrikeBadge from '@/components/common/StrikeBadge';
import MealLog from '@/components/dashboard/MealLog';
import FoodSearchView from '@/components/nutrition/FoodSearchView';
import RecipesView from '@/components/recipes/RecipesView';
import { useFoodLog } from '@/hooks/useFoodLog';
import { isNutritionStrikeComplete, countStreak } from '@/lib/strikeHelpers';
import { dailyGoals, meals } from '@/data/mockData';

function todayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function NutritionHeader({ logSummary }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const calTarget = dailyGoals.calories.target;
  const protTarget = dailyGoals.protein.target;
  const carbTarget = dailyGoals.carbs.target;
  const fatTarget = dailyGoals.fat.target;

  const consumed = logSummary?.totalsLogged?.kcal ?? dailyGoals.calories.consumed;
  const protConsumed = Math.round(logSummary?.totalsLogged?.protein ?? dailyGoals.protein.consumed);
  const carbConsumed = Math.round(logSummary?.totalsLogged?.carbs ?? dailyGoals.carbs.consumed);
  const fatConsumed = Math.round(logSummary?.totalsLogged?.fat ?? dailyGoals.fat.consumed);

  const progress = consumed / calTarget;

  return (
    <Card style={styles.headerCard}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerCalories}>{consumed}</Text>
          <Text style={styles.headerLabel}>of {calTarget} kcal</Text>
        </View>
        <ProgressRing
          radius={36}
          strokeWidth={7}
          progress={Math.min(progress, 1)}
          color={Colors.primary}
          bgColor={Colors.border}
        >
          <Text style={styles.ringPercent}>{Math.round(progress * 100)}%</Text>
        </ProgressRing>
      </View>
      <View style={styles.macroRow}>
        <MacroMini label="Protein" value={protConsumed} target={protTarget} color={Colors.proteinRing} />
        <MacroMini label="Carbs" value={carbConsumed} target={carbTarget} color={Colors.carbsRing} />
        <MacroMini label="Fat" value={fatConsumed} target={fatTarget} color={Colors.fatRing} />
      </View>
    </Card>
  );
}

function MacroMini({ label, value, target, color }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const progress = value / target;
  return (
    <View style={styles.macroMini}>
      <View style={styles.macroMiniBar}>
        <View style={[styles.macroMiniFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroMiniText}>{label} {value}/{target}g</Text>
    </View>
  );
}

function TabSelector({ activeTab, onTabChange }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const tabs = ['Food Log', 'Search', 'Recipes'];
  return (
    <View style={styles.tabRow}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.tabActive]}
          onPress={() => onTabChange(tab)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function FoodLogView({ entries }) {
  if (entries && entries.length > 0) {
    const mealGroups = {};
    for (const entry of entries) {
      const mealKey = entry.mealType || 'snack';
      if (!mealGroups[mealKey]) mealGroups[mealKey] = [];
      mealGroups[mealKey].push(entry);
    }

    const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
    const MEAL_EMOJI = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿' };
    const loggedMeals = MEAL_ORDER
      .filter((m) => mealGroups[m]?.length > 0)
      .map((m) => ({
        type: m.charAt(0).toUpperCase() + m.slice(1),
        emoji: MEAL_EMOJI[m],
        items: mealGroups[m].map((e) => ({
          name: e.nameSnapshot || 'Food',
          amount: `${e.grams || 0}g`,
          calories: e.nutrientsSnapshot?.kcal || 0,
          protein: Math.round(e.nutrientsSnapshot?.protein || 0),
          carbs: Math.round(e.nutrientsSnapshot?.carbs || 0),
          fat: Math.round(e.nutrientsSnapshot?.fat || 0),
        })),
      }));

    return <MealLog meals={loggedMeals.length > 0 ? loggedMeals : meals} />;
  }
  return <MealLog meals={meals} />;
}

function SearchView() {
  return <FoodSearchView />;
}


export default function NutritionScreen() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [activeTab, setActiveTab] = useState('Food Log');
  const today = todayDateString();
  const foodLog = useFoodLog(today);
  const isSearch = activeTab === 'Search';
  const isRecipes = activeTab === 'Recipes';
  const isFullScreen = isSearch || isRecipes;

  const consumed = foodLog.summary?.totalsLogged?.kcal ?? dailyGoals.calories.consumed;
  const calTarget = dailyGoals.calories.target;
  const todayComplete = isNutritionStrikeComplete({ consumed, target: calTarget });
  const strikeCount = countStreak([todayComplete, true, true, true, true]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {isFullScreen ? (
        <View style={styles.searchScreenWrap}>
          <View style={styles.searchHeader}>
            <Text style={[styles.screenTitle, { marginBottom: 16 }]}>{isRecipes ? 'Recipes' : 'Nutrition'}</Text>
            <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
          </View>
          <View style={styles.searchBody}>
            {isSearch && <SearchView />}
            {isRecipes && <RecipesView />}
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeader}>
            <Text style={styles.screenTitle}>Nutrition</Text>
            <View style={styles.headerActions}>
              <StrikeBadge count={strikeCount} color={Colors.calories} />
              <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
                <Search size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          <NutritionHeader logSummary={foodLog.summary} />
          <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
          {activeTab === 'Food Log' && <FoodLogView entries={foodLog.entries} />}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
      {!isFullScreen && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => setActiveTab('Search')}
        >
          <Plus size={24} color={Colors.onPrimary} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Layout.screenPadding, paddingBottom: 100 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerIconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  screenTitle: { fontSize: 28, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  searchScreenWrap: { flex: 1, backgroundColor: Colors.background },
  searchHeader: { paddingHorizontal: Layout.screenPadding, paddingTop: 8, backgroundColor: Colors.background },
  searchBody: { flex: 1 },
  headerCard: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerLeft: {},
  headerCalories: { fontSize: 32, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  headerLabel: { fontSize: 13, color: Colors.textTertiary },
  ringPercent: { fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', color: Colors.primary },
  macroRow: { flexDirection: 'row', gap: 10 },
  macroMini: { flex: 1 },
  macroMiniBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  macroMiniFill: { height: '100%', borderRadius: 2 },
  macroMiniText: { fontSize: 11, color: Colors.textTertiary },
  tabRow: { flexDirection: 'row', marginBottom: 16, backgroundColor: Colors.cardBackground, borderRadius: 12, padding: 4, ...Layout.cardShadow },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.textPrimary },
  tabText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textTertiary },
  tabTextActive: { color: Colors.onPrimary, fontFamily: 'PlusJakartaSans-SemiBold' },
  mealCard: { padding: 16 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  mealLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealEmoji: { fontSize: 28 },
  mealType: { fontSize: 16, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary },
  mealTime: { fontSize: 12, color: Colors.textTertiary },
  mealRight: { alignItems: 'flex-end' },
  mealCalories: { fontSize: 15, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  mealMacros: { fontSize: 11, color: Colors.textTertiary },
  foodItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.divider },
  foodName: { fontSize: 15, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textPrimary },
  foodAmount: { fontSize: 12, color: Colors.textTertiary },
  foodRight: { alignItems: 'flex-end' },
  foodCalories: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary },
  foodMacros: { fontSize: 11, color: Colors.textTertiary },
  addFoodBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, borderStyle: 'dashed' },
  addFoodText: { fontSize: 13, color: Colors.textTertiary },
  searchContainer: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBackground, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10, ...Layout.cardShadow },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  filterBtn: { width: 48, height: 48, backgroundColor: Colors.cardBackground, borderRadius: 14, justifyContent: 'center', alignItems: 'center', ...Layout.cardShadow },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.cardBackground, paddingVertical: 12, borderRadius: 12, ...Layout.cardShadow },
  quickActionText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textSecondary },
  foodSearchItem: { padding: 12 },
  foodSearchRow: { flexDirection: 'row', alignItems: 'center' },
  foodSearchImage: { width: 48, height: 48, borderRadius: 10, backgroundColor: Colors.border, marginRight: 12 },
  foodSearchInfo: { flex: 1 },
  foodSearchName: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary },
  foodSearchBrand: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  foodSearchNutrition: { alignItems: 'flex-end' },
  foodSearchCal: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary },
  foodSearchMacros: { fontSize: 11, color: Colors.textTertiary },
  recipeGrid: { gap: 12 },
  recipeCard: { backgroundColor: Colors.cardBackground, borderRadius: Layout.borderRadius.xl, overflow: 'hidden', marginBottom: 2, ...Layout.cardShadow },
  recipeImage: { width: '100%', height: 160, backgroundColor: Colors.border },
  recipeInfo: { padding: 14 },
  recipeName: { fontSize: 16, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary },
  recipeMeta: { fontSize: 13, color: Colors.textTertiary, marginTop: 4 },
  recipeCalories: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.primary, marginTop: 4 },
  fab: { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 80, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.textPrimary, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8, zIndex: 100 },
});
