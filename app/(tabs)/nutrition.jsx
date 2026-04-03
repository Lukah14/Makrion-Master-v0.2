import { useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useNutritionDate } from '@/context/NutritionDateContext';
import { Layout } from '@/constants/layout';
import Card from '@/components/common/Card';
import ProgressRing from '@/components/common/ProgressRing';
import StrikeBadge from '@/components/common/StrikeBadge';
import FoodSearchView from '@/components/nutrition/FoodSearchView';
import FoodLogSections from '@/components/nutrition/FoodLogSections';
import CalendarModal from '@/components/calendar/CalendarModal';
import SelectedDateBar from '@/components/calendar/SelectedDateBar';
import RecipesView from '@/components/recipes/RecipesView';
import { useFoodLog } from '@/hooks/useFoodLog';
import { useUser } from '@/hooks/useUser';
import { isNutritionStrikeComplete, countStreak } from '@/lib/strikeHelpers';
import { todayDateKey } from '@/lib/dateKey';

function NutritionHeader({ logSummary, goals }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const calTarget = goals?.calories || 0;
  const protTarget = goals?.protein || 0;
  const carbTarget = goals?.carbs || 0;
  const fatTarget = goals?.fat || 0;

  const consumed = logSummary?.totalsLogged?.kcal ?? 0;
  const protConsumed = Math.round(logSummary?.totalsLogged?.protein ?? 0);
  const carbConsumed = Math.round(logSummary?.totalsLogged?.carbs ?? 0);
  const fatConsumed = Math.round(logSummary?.totalsLogged?.fat ?? 0);

  const progress = calTarget > 0 ? consumed / calTarget : 0;

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
  const progress = target > 0 ? value / target : 0;
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
export default function NutritionScreen() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [activeTab, setActiveTab] = useState('Food Log');
  const [searchMealType, setSearchMealType] = useState(null);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const { dateKey, bumpCalendarRefresh } = useNutritionDate();
  const foodLog = useFoodLog(dateKey);
  const { userData: userDoc } = useUser();
  const today = todayDateKey();
  const isSearch = activeTab === 'Search';
  const isRecipes = activeTab === 'Recipes';
  const isFullScreen = isSearch || isRecipes;

  const goals = userDoc?.goals || {};
  const consumed = foodLog.summary?.totalsLogged?.kcal ?? 0;
  const calTarget = goals.calories || 0;
  const todayComplete = calTarget > 0 && isNutritionStrikeComplete({ consumed, target: calTarget });
  const strikeCount = calTarget > 0 ? countStreak([todayComplete]) : 0;

  const handleAddMeal = useCallback((mealType) => {
    setSearchMealType(mealType);
    setActiveTab('Search');
  }, []);

  const handleFoodLogged = useCallback(() => {
    setActiveTab('Food Log');
    setSearchMealType(null);
    bumpCalendarRefresh();
  }, [bumpCalendarRefresh]);

  const handleEditEntry = useCallback(async (entryId, changes) => {
    try {
      await foodLog.editEntry(entryId, changes);
      bumpCalendarRefresh();
    } catch {
      // silently handled
    }
  }, [foodLog, bumpCalendarRefresh]);

  const handleDeleteEntry = useCallback(async (entryId) => {
    try {
      await foodLog.removeEntry(entryId);
      bumpCalendarRefresh();
    } catch {
      // silently handled
    }
  }, [foodLog, bumpCalendarRefresh]);

  const handleMoveEntry = useCallback(async (entryId, newMealType) => {
    try {
      await foodLog.editEntry(entryId, { mealType: newMealType });
      bumpCalendarRefresh();
    } catch {
      // silently handled
    }
  }, [foodLog, bumpCalendarRefresh]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {isFullScreen ? (
        <View style={styles.searchScreenWrap}>
          <View style={styles.searchHeader}>
            <Text style={[styles.screenTitle, { marginBottom: 16 }]}>
              {isRecipes ? 'Recipes' : 'Nutrition'}
            </Text>
            <TabSelector activeTab={activeTab} onTabChange={(tab) => {
              if (tab !== 'Search') setSearchMealType(null);
              setActiveTab(tab);
            }} />
          </View>
          <View style={styles.searchBody}>
            {isSearch && (
              <FoodSearchView
                initialMealType={searchMealType}
                onFoodLogged={handleFoodLogged}
                addEntry={foodLog.addEntry}
                logDateKey={dateKey}
              />
            )}
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
              <StrikeBadge count={strikeCount} color="#34C759" />
            </View>
          </View>
          <SelectedDateBar
            dateKey={dateKey}
            onOpenCalendar={() => setDateSheetOpen(true)}
            subtitle={dateKey === today ? 'Food log for today' : 'Food log for selected day'}
          />
          <NutritionHeader logSummary={foodLog.summary} goals={goals} />
          <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
          {activeTab === 'Food Log' && (
            <FoodLogSections
              entries={foodLog.entries}
              summary={foodLog.summary}
              loading={foodLog.loading}
              error={foodLog.error}
              onAddMeal={handleAddMeal}
              onEditEntry={handleEditEntry}
              onDeleteEntry={handleDeleteEntry}
              onMoveEntry={handleMoveEntry}
            />
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
      {!isFullScreen && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => handleAddMeal('breakfast')}
        >
          <Plus size={24} color={Colors.onPrimary} />
        </TouchableOpacity>
      )}
      <CalendarModal visible={dateSheetOpen} onClose={() => setDateSheetOpen(false)} />
    </SafeAreaView>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Layout.screenPadding, paddingBottom: 100 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  fab: { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 80, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.textPrimary, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8, zIndex: 100 },
});
