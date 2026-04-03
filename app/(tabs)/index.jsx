import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useNutritionDate } from '@/context/NutritionDateContext';
import { Layout } from '@/constants/layout';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/hooks/useUser';
import { useFoodLog } from '@/hooks/useFoodLog';
import { useHabits } from '@/hooks/useHabits';
import { useWater } from '@/hooks/useWater';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useProgress } from '@/hooks/useProgress';
import DailyStreak from '@/components/dashboard/DailyStreak';
import { streakBadges } from '@/data/mockData';
import CalendarModal from '@/components/calendar/CalendarModal';
import CalorieRing from '@/components/dashboard/CalorieRing';
import MacroCards from '@/components/dashboard/MacroCards';
import MealLog from '@/components/dashboard/MealLog';
import ActivitySummary from '@/components/dashboard/ActivitySummary';
import HabitsSummary from '@/components/dashboard/HabitsSummary';
import WaterTracker from '@/components/dashboard/WaterTracker';
import ProgressSnapshot from '@/components/dashboard/ProgressSnapshot';
import RecentlyLogged from '@/components/dashboard/RecentlyLogged';

const ICON_SETTINGS = require('@/src/Icons/Settings.png');
const ICON_CALENDAR = require('@/src/Icons/Calendar.png');

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_EMOJI = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿' };

export default function HomeScreen() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const router = useRouter();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { dateKey, bumpCalendarRefresh } = useNutritionDate();

  const { user } = useAuth();
  const { userData: userDoc } = useUser();
  const foodLog = useFoodLog(dateKey);
  const { habits, completions } = useHabits(dateKey);
  const { waterData, loading: waterLoading, addGlass, removeGlass } = useWater(dateKey);

  const syncWaterGlasses = useCallback(
    async (targetCount) => {
      let g = waterData.glasses;
      while (targetCount < g) {
        await removeGlass(250);
        g--;
      }
      while (targetCount > g) {
        await addGlass(250);
        g++;
      }
      bumpCalendarRefresh();
    },
    [waterData.glasses, addGlass, removeGlass, bumpCalendarRefresh]
  );

  const onWaterDeltaMl = useCallback(
    async (deltaMl) => {
      const steps = Math.round(Math.abs(deltaMl) / 250);
      if (steps === 0) return;
      if (deltaMl < 0) {
        for (let i = 0; i < steps; i++) await removeGlass(250);
      } else {
        for (let i = 0; i < steps; i++) await addGlass(250);
      }
      bumpCalendarRefresh();
    },
    [addGlass, removeGlass, bumpCalendarRefresh]
  );
  const activityLog = useActivityLog(dateKey);
  const progress = useProgress();

  // --- Goals from user document ---
  const goals = userDoc?.goals || {};
  const calTarget = goals.calories || 0;
  const protTarget = goals.protein || 0;
  const carbTarget = goals.carbs || 0;
  const fatTarget = goals.fat || 0;
  const waterTarget = goals.water || 2.5;

  // --- Consumed totals from food log ---
  const consumed = foodLog.summary?.totalsLogged?.kcal ?? 0;
  const protConsumed = Math.round(foodLog.summary?.totalsLogged?.protein ?? 0);
  const carbConsumed = Math.round(foodLog.summary?.totalsLogged?.carbs ?? 0);
  const fatConsumed = Math.round(foodLog.summary?.totalsLogged?.fat ?? 0);

  // --- Meals grouped by type ---
  const mealGroups = {};
  for (const entry of foodLog.entries) {
    const key = entry.mealType || 'snack';
    if (!mealGroups[key]) mealGroups[key] = [];
    mealGroups[key].push(entry);
  }
  const meals = MEAL_ORDER.map((m) => ({
    id: m,
    type: m.charAt(0).toUpperCase() + m.slice(1),
    emoji: MEAL_EMOJI[m],
    items: (mealGroups[m] || []).map((e) => ({
      id: e.id,
      name: e.nameSnapshot || 'Food',
      amount: `${e.grams || 0}g`,
      calories: e.nutrientsSnapshot?.kcal || 0,
      protein: Math.round(e.nutrientsSnapshot?.protein || 0),
      carbs: Math.round(e.nutrientsSnapshot?.carbs || 0),
      fat: Math.round(e.nutrientsSnapshot?.fat || 0),
    })),
  }));

  // --- Activity ---
  const activityData = {
    caloriesBurned: activityLog.totalCaloriesBurned || 0,
    activeMinutes: activityLog.entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0),
    steps: 0,
    stepsGoal: 10000,
    stepProgress: 0,
  };

  // --- Habits ---
  const habitsForSummary = habits.map(h => ({
    id: h.id,
    name: h.name,
    iconName: h.iconName || 'plus',
    completed: !!completions[h.id]?.completed,
    color: h.iconColor || '#FFFFFF',
    bg: h.iconBg || '#8B5CF6',
    category: h.category || 'General',
  }));

  // --- Weight progress (same source as Progress tab: progressEntries) ---
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
  ]);

  // --- Empty states ---
  const recentlyLogged = [];

  const displayName = user?.displayName || 'there';
  const avatarSource = user?.photoURL
    ? { uri: user.photoURL }
    : undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
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

        <DailyStreak badges={streakBadges} />

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

        <MealLog meals={meals} />
        <ActivitySummary data={activityData} />
        <HabitsSummary habits={habitsForSummary} />
        <WaterTracker
          glasses={waterData.glasses}
          totalMl={waterData.totalMl}
          targetLiters={waterTarget}
          loading={waterLoading}
          onGlassSlotPress={async (slotIndex) => {
            const g = waterData.glasses;
            const next = slotIndex < g ? slotIndex : slotIndex + 1;
            await syncWaterGlasses(next);
          }}
          onDeltaMl={onWaterDeltaMl}
        />
        <ProgressSnapshot
          data={progressData}
          onViewAll={() => router.push('/(tabs)/progress')}
        />
        {recentlyLogged.length > 0 && <RecentlyLogged items={recentlyLogged} />}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <Plus size={24} color={Colors.onPrimary} />
      </TouchableOpacity>

      <CalendarModal visible={calendarOpen} onClose={() => setCalendarOpen(false)} />
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
    paddingBottom: 100,
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
    bottom: Platform.OS === 'ios' ? 100 : 80,
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
});
