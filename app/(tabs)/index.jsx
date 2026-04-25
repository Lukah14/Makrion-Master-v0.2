import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  ScrollView, View, Text, Image, TouchableOpacity, StyleSheet,
  Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeContext';
import { useNutritionDate } from '@/context/NutritionDateContext';
import { Layout } from '@/constants/layout';
import { useTabBarLayout } from '@/hooks/useTabBarLayout';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/hooks/useUser';
import { useFoodLog } from '@/hooks/useFoodLog';
import { isManualFoodLogEntry } from '@/services/foodLogService';
import { useHabits } from '@/hooks/useHabits';
import { useWater } from '@/hooks/useWater';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useSteps } from '@/hooks/useSteps';
import { useProgress } from '@/hooks/useProgress';
import { useDomainStreaksContext } from '@/context/DomainStreaksContext';
import StrikesRow from '@/components/dashboard/StrikesRow';
import CalendarModal from '@/components/calendar/CalendarModal';
import CalorieRing from '@/components/dashboard/CalorieRing';
import MacroCards from '@/components/dashboard/MacroCards';
import MealLog from '@/components/dashboard/MealLog';
import ActivitySummary from '@/components/dashboard/ActivitySummary';
import HabitsSummary from '@/components/dashboard/HabitsSummary';
import WaterTracker from '@/components/dashboard/WaterTracker';
import ProgressSnapshot from '@/components/dashboard/ProgressSnapshot';
import RecentlyLogged from '@/components/dashboard/RecentlyLogged';
import FoodSearchView from '@/components/nutrition/FoodSearchView';
import EditEntrySheet from '@/components/nutrition/EditEntrySheet';
import EditManualEntrySheet from '@/components/nutrition/EditManualEntrySheet';
import { isHabitActiveOnDate } from '@/lib/habitSchedule';
import { parseDateKey, todayDateKey } from '@/lib/dateKey';
import { updateNutritionStreak } from '@/services/statsService';

const ICON_SETTINGS = require('@/src/Icons/Settings.png');
const ICON_CALENDAR = require('@/src/Icons/Calendar.png');

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_EMOJI = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿' };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDateLabel(dateKey) {
  try {
    const d = parseDateKey(dateKey);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateKey;
  }
}

export default function HomeScreen() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const { scrollPaddingBottom, floatingBottom } = useTabBarLayout();
  const router = useRouter();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { dateKey, bumpCalendarRefresh, calendarRefreshKey } = useNutritionDate();

  const { user } = useAuth();
  const { userData: userDoc, resolvedGoals } = useUser();
  const foodLog = useFoodLog(dateKey);
  const {
    habits: allHabitsUi,
    loading: habitsLoading,
    error: habitsError,
    toggleCompletion,
    reload: reloadHabits,
  } = useHabits(dateKey);

  const {
    waterData,
    loading: waterLoading,
    setGlasses,
    updateGoalMl,
    adjustMl,
  } = useWater(dateKey);

  const domainStreaks = useDomainStreaksContext();

  useFocusEffect(
    useCallback(() => {
      domainStreaks.reload();
      reloadHabits();
    }, [domainStreaks.reload, reloadHabits]),
  );

  const syncWaterGlasses = useCallback(
    async (targetCount) => {
      const next = Math.max(0, Math.round(Number(targetCount) || 0));
      await setGlasses(next, 250);
      bumpCalendarRefresh();
    },
    [setGlasses, bumpCalendarRefresh],
  );

  const onWaterDeltaMl = useCallback(
    async (deltaMl) => {
      const d = Math.round(Number(deltaMl) || 0);
      if (d === 0) return;
      await adjustMl(d);
      bumpCalendarRefresh();
    },
    [adjustMl, bumpCalendarRefresh],
  );

  const onWaterCustomMl = useCallback(
    async (ml, mode) => {
      const n = Math.round(Number(ml) || 0);
      if (!Number.isFinite(n) || n <= 0) return;
      await adjustMl(mode === 'add' ? n : -n);
      bumpCalendarRefresh();
    },
    [adjustMl, bumpCalendarRefresh],
  );

  const onWaterGoalChange = useCallback(
    async (ml) => {
      await updateGoalMl(ml);
      bumpCalendarRefresh();
    },
    [updateGoalMl, bumpCalendarRefresh],
  );

  const activityLog = useActivityLog(dateKey);
  const stepsState = useSteps(dateKey, calendarRefreshKey);
  const progress = useProgress();

  useFocusEffect(
    useCallback(() => {
      progress.reload();
    }, [progress.reload]),
  );

  const goals = resolvedGoals ?? userDoc?.goals ?? {};
  const calTarget = Number(goals.calories ?? goals.calorieTarget) || 0;
  const protTarget = Number(goals.protein ?? goals.proteinGoal) || 0;
  const carbTarget = Number(goals.carbs ?? goals.carbsGoal) || 0;
  const fatTarget = Number(goals.fat ?? goals.fatGoal) || 0;
  const defaultWaterGoalMl = Math.round((Number(goals.water) || 2.5) * 1000);
  const effectiveWaterGoalMl =
    waterData.goalMl != null && waterData.goalMl > 0 ? waterData.goalMl : defaultWaterGoalMl;

  const consumed = foodLog.summary?.totalsLogged?.kcal ?? 0;
  const protConsumed = Math.round(foodLog.summary?.totalsLogged?.protein ?? 0);
  const carbConsumed = Math.round(foodLog.summary?.totalsLogged?.carbs ?? 0);
  const fatConsumed = Math.round(foodLog.summary?.totalsLogged?.fat ?? 0);

  const mealGroups = useMemo(() => {
    const g = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const entry of foodLog.entries) {
      const key = MEAL_ORDER.includes(entry.mealType) ? entry.mealType : 'snack';
      g[key].push(entry);
    }
    return g;
  }, [foodLog.entries]);

  const meals = MEAL_ORDER.map((m) => ({
    id: m,
    type: m.charAt(0).toUpperCase() + m.slice(1),
    emoji: MEAL_EMOJI[m],
    items: (mealGroups[m] || []).map((e) => ({
      id: e.id,
      entry: e,
      name: e.nameSnapshot || 'Food',
      amount: isManualFoodLogEntry(e) ? 'Manual' : `${e.grams || 0}g`,
      calories: e.nutrientsSnapshot?.kcal || 0,
      protein: Math.round(e.nutrientsSnapshot?.protein || 0),
      carbs: Math.round(e.nutrientsSnapshot?.carbs || 0),
      fat: Math.round(e.nutrientsSnapshot?.fat || 0),
    })),
  }));

  const activityData = {
    caloriesBurned: Math.round(activityLog.totalCaloriesBurned || 0),
    activeMinutes: activityLog.entries.reduce(
      (sum, e) => sum + (Number(e.durationMinutes) || 0),
      0,
    ),
    steps: stepsState.steps,
    stepsGoal: stepsState.goal,
    stepProgress: stepsState.stepProgressPercent,
    activityCount: activityLog.entries.length,
  };

  const dashboardHabits = useMemo(
    () =>
      allHabitsUi.filter(
        (h) => !h.archived && !h.isArchived && isHabitActiveOnDate(h, dateKey),
      ),
    [allHabitsUi, dateKey],
  );

  const progressData = useMemo(() => {
    const goalWeight = goals.targetWeight ?? null;
    const startWeight = goals.startWeight ?? null;

    const sortedWeight = [...(progress.entries || [])]
      .filter((e) => e.weight != null && e.date)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const rawLatest =
      progress.latest?.weight ??
      (sortedWeight.length ? sortedWeight[sortedWeight.length - 1].weight : null) ??
      userDoc?.profile?.currentWeight ??
      userDoc?.currentWeight ??
      null;

    const toNum = (v) => {
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const latestWeight = toNum(rawLatest);
    const startNum = toNum(startWeight);
    const goalNum = toNum(goalWeight);

    const weeklyWeights = sortedWeight
      .slice(-7)
      .map((e) => toNum(e.weight))
      .filter((w) => w != null);

    let weightLost = null;
    if (startNum != null && latestWeight != null) {
      weightLost = Math.round((startNum - latestWeight) * 10) / 10;
    }

    let percentDone = null;
    if (
      startNum != null &&
      goalNum != null &&
      latestWeight != null &&
      startNum !== goalNum
    ) {
      const totalChange = Math.abs(startNum - goalNum);
      const doneChange = Math.abs(startNum - latestWeight);
      percentDone = Math.min(100, Math.max(0, Math.round((doneChange / totalChange) * 100)));
    }

    const hasWeightData = latestWeight != null || weeklyWeights.length > 0;

    return {
      hasWeightData,
      currentWeight: latestWeight,
      goalWeight: goalNum,
      startWeight: startNum,
      weightLost,
      percentDone,
      weeklyWeights,
    };
  }, [
    progress.entries,
    progress.latest,
    userDoc?.profile?.currentWeight,
    userDoc?.currentWeight,
    goals.targetWeight,
    goals.startWeight,
    goals.calories,
    goals.calorieTarget,
    goals.protein,
    goals.carbs,
    goals.fat,
  ]);

  const recentlyLogged = [];

  const displayName = user?.displayName || 'there';
  const avatarSource = user?.photoURL ? { uri: user.photoURL } : undefined;

  const [foodSearchOpen, setFoodSearchOpen] = useState(false);
  const [searchMealType, setSearchMealType] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [editManualEntry, setEditManualEntry] = useState(null);

  const openFoodSearch = useCallback((meal) => {
    setSearchMealType(meal?.id || 'snack');
    setFoodSearchOpen(true);
  }, []);

  const handleFoodLogged = useCallback(() => {
    setFoodSearchOpen(false);
    setSearchMealType(null);
    bumpCalendarRefresh();
    if (dateKey === todayDateKey() && user?.uid) {
      void updateNutritionStreak(user.uid, dateKey).catch(() => {});
    }
  }, [bumpCalendarRefresh, dateKey, user?.uid]);

  const handleEditSave = useCallback(
    async (entryId, changes) => {
      try {
        await foodLog.editEntry(entryId, changes);
        bumpCalendarRefresh();
      } finally {
        setEditEntry(null);
        setEditManualEntry(null);
      }
    },
    [foodLog, bumpCalendarRefresh],
  );

  const handleDeleteEntry = useCallback(
    (entryId) => {
      Alert.alert(
        'Remove food',
        'Remove this item from your food log?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await foodLog.removeEntry(entryId);
              bumpCalendarRefresh();
            },
          },
        ],
      );
    },
    [foodLog, bumpCalendarRefresh],
  );

  const handleClearMeal = useCallback(
    async (mealTypeKey) => {
      const ids = (mealGroups[mealTypeKey] || []).map((e) => e.id);
      for (const id of ids) {
        await foodLog.removeEntry(id);
      }
      bumpCalendarRefresh();
    },
    [mealGroups, foodLog, bumpCalendarRefresh],
  );

  const openEditEntry = useCallback((item) => {
    const e = item?.entry;
    if (!e) return;
    if (isManualFoodLogEntry(e)) setEditManualEntry(e);
    else setEditEntry(e);
  }, []);

  const onHabitPress = useCallback(
    async (h) => {
      if (h.type === 'yesno') {
        try {
          await toggleCompletion(h.id);
          bumpCalendarRefresh();
        } catch {
          // ignore
        }
        return;
      }
      router.push('/(tabs)/habits');
    },
    [toggleCompletion, bumpCalendarRefresh, router],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {avatarSource ? (
              <Image source={avatarSource} style={styles.avatar} />
            ) : (
              <View style={styles.avatar} />
            )}
            <View>
              <Text style={styles.greeting}>{getGreeting()} {'\uD83D\uDC4B'}</Text>
              <Text style={styles.userName}>{displayName}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)/settings')}>
              <Image source={ICON_SETTINGS} style={styles.headerIcon} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => setCalendarOpen(true)}>
              <Image source={ICON_CALENDAR} style={styles.headerIcon} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>

        <StrikesRow
          currentNutritionStreak={domainStreaks.currentNutritionStreak}
          currentActivityStreak={domainStreaks.currentActivityStreak}
          currentHabitTrackerStreak={domainStreaks.currentHabitTrackerStreak}
          loading={domainStreaks.loading}
          error={domainStreaks.error}
          onPressNutrition={() => router.push('/(tabs)/nutrition')}
          onPressActivity={() => router.push('/(tabs)/activity')}
          onPressHabitTracker={() => router.push('/(tabs)/habits')}
        />

        <CalorieRing
          consumed={consumed}
          target={calTarget}
          burned={activityData.caloriesBurned}
        />

        <MacroCards
          protein={{ consumed: protConsumed, target: protTarget }}
          carbs={{ consumed: carbConsumed, target: carbTarget }}
          fat={{ consumed: fatConsumed, target: fatTarget }}
        />

        <MealLog
          meals={meals}
          loading={foodLog.loading}
          error={foodLog.error}
          onAddFood={openFoodSearch}
          onDeleteEntry={handleDeleteEntry}
          onEditEntry={openEditEntry}
          onClearMeal={handleClearMeal}
        />

        <ActivitySummary data={activityData} dateLabel={formatDateLabel(dateKey)} />

        <HabitsSummary
          habits={dashboardHabits}
          loading={habitsLoading}
          error={habitsError}
          dateLabel={formatDateLabel(dateKey)}
          onHabitPress={onHabitPress}
        />

        <WaterTracker
          glasses={waterData.glasses}
          totalMl={waterData.totalMl}
          goalMl={effectiveWaterGoalMl}
          loading={waterLoading}
          onGlassSlotPress={async (slotIndex) => {
            const g = waterData.glasses;
            const next = slotIndex < g ? slotIndex : slotIndex + 1;
            await syncWaterGlasses(next);
          }}
          onDeltaMl={onWaterDeltaMl}
          onCustomMl={onWaterCustomMl}
          onChangeGoalMl={onWaterGoalChange}
        />

        <ProgressSnapshot
          data={progressData}
          onViewAll={() => router.push('/(tabs)/progress')}
        />
        {recentlyLogged.length > 0 && <RecentlyLogged items={recentlyLogged} />}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: floatingBottom }]}
        activeOpacity={0.8}
        onPress={() => {
          setSearchMealType('snack');
          setFoodSearchOpen(true);
        }}
      >
        <Plus size={24} color={Colors.onPrimary} />
      </TouchableOpacity>

      <CalendarModal visible={calendarOpen} onClose={() => setCalendarOpen(false)} />

      <Modal visible={foodSearchOpen} animationType="slide" onRequestClose={() => setFoodSearchOpen(false)}>
        <SafeAreaView style={styles.searchModal} edges={['top']}>
          <View style={styles.searchModalHeader}>
            <Text style={styles.searchModalTitle}>Add food</Text>
            <TouchableOpacity
              onPress={() => {
                setFoodSearchOpen(false);
                setSearchMealType(null);
              }}
              style={styles.searchModalClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchModalBody}>
            <FoodSearchView
              initialMealType={searchMealType}
              onFoodLogged={handleFoodLogged}
              addEntry={foodLog.addEntry}
              addManualEntry={foodLog.addManualEntry}
              logDateKey={dateKey}
            />
          </View>
        </SafeAreaView>
      </Modal>

      <EditEntrySheet
        visible={!!editEntry}
        entry={editEntry}
        onSave={handleEditSave}
        onClose={() => setEditEntry(null)}
      />
      <EditManualEntrySheet
        visible={!!editManualEntry}
        entry={editManualEntry}
        onSave={handleEditSave}
        onClose={() => setEditManualEntry(null)}
      />
    </SafeAreaView>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Layout.screenPadding,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.border,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.cardShadow,
  },
  headerIcon: {
    width: 20,
    height: 20,
    tintColor: Colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
  bottomSpacer: {
    height: 20,
  },
  searchModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  searchModalTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  searchModalClose: {
    padding: 8,
  },
  searchModalBody: {
    flex: 1,
  },
});
