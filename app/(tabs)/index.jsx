import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const ICON_SETTINGS = require('@/src/Icons/Settings.png');
const ICON_CALENDAR = require('@/src/Icons/Calendar.png');
import { Layout } from '@/constants/layout';
import {
  userData,
  streakBadges,
  getWeekDates,
  dailyGoals,
  meals,
  activityData,
  habitsData,
  progressData,
  recentlyLoggedData,
} from '@/data/mockData';
import DailyStreak from '@/components/dashboard/DailyStreak';
import WeeklyDateSelector from '@/components/dashboard/WeeklyDateSelector';
import CalorieRing from '@/components/dashboard/CalorieRing';
import MacroCards from '@/components/dashboard/MacroCards';
import MealLog from '@/components/dashboard/MealLog';
import ActivitySummary from '@/components/dashboard/ActivitySummary';
import HabitsSummary from '@/components/dashboard/HabitsSummary';
import WaterTracker from '@/components/dashboard/WaterTracker';
import ProgressSnapshot from '@/components/dashboard/ProgressSnapshot';
import RecentlyLogged from '@/components/dashboard/RecentlyLogged';

export default function HomeScreen() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [weekDates] = useState(getWeekDates());
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={{ uri: userData.avatar }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.greeting}>{userData.greeting} {'\uD83D\uDC4B'}</Text>
              <Text style={styles.userName}>{userData.name}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)/settings')}>
              <Image source={ICON_SETTINGS} style={styles.headerIcon} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Image source={ICON_CALENDAR} style={styles.headerIcon} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>

        <DailyStreak badges={streakBadges} />
        <WeeklyDateSelector dates={weekDates} />

        <CalorieRing
          consumed={dailyGoals.calories.consumed}
          target={dailyGoals.calories.target}
          burned={dailyGoals.calories.burned}
        />

        <MacroCards
          protein={dailyGoals.protein}
          carbs={dailyGoals.carbs}
          fat={dailyGoals.fat}
        />

        <MealLog meals={meals} />
        <ActivitySummary data={activityData} />
        <HabitsSummary habits={habitsData} />
        <WaterTracker consumed={dailyGoals.water.consumed} target={dailyGoals.water.target} />
        <ProgressSnapshot data={progressData} />
        <RecentlyLogged items={recentlyLoggedData} />

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <Plus size={24} color={Colors.onPrimary} />
      </TouchableOpacity>
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
