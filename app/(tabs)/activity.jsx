import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame, Clock, Footprints, Plus, Dumbbell } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useNutritionDate } from '@/context/NutritionDateContext';
import { Layout } from '@/constants/layout';
import CalendarModal from '@/components/calendar/CalendarModal';
import SelectedDateBar from '@/components/calendar/SelectedDateBar';
import { todayDateKey } from '@/lib/dateKey';
import ProgressRing from '@/components/common/ProgressRing';
import StrikeBadge from '@/components/common/StrikeBadge';
import EmptyState from '@/components/common/EmptyState';
import TodayPage from '@/components/activity/TodayPage';
import ExercisePage from '@/components/activity/ExercisePage';
import PlanPage from '@/components/activity/PlanPage';
import { isActivityStrikeComplete, countStreak } from '@/lib/strikeHelpers';
import { useActivityLog } from '@/hooks/useActivityLog';

const TABS = ['Today', 'Exercise', 'Plan'];
function ActivitySummaryBar({ data }) {
  const { colors: Colors } = useTheme();
  const s = createS(Colors);
  return (
    <View style={s.summaryBar}>
      <View style={s.summaryBarItem}>
        <ProgressRing
          radius={30}
          strokeWidth={5}
          progress={data.caloriesBurned / 500}
          color={Colors.calories}
          bgColor={Colors.border}
        >
          <Flame size={13} color={Colors.calories} />
        </ProgressRing>
        <Text style={s.summaryBarValue}>{data.caloriesBurned}</Text>
        <Text style={s.summaryBarLabel}>kcal</Text>
      </View>
      <View style={s.summaryBarDivider} />
      <View style={s.summaryBarItem}>
        <ProgressRing
          radius={30}
          strokeWidth={5}
          progress={data.activeMinutes / 60}
          color={Colors.primary}
          bgColor={Colors.border}
        >
          <Clock size={13} color={Colors.primary} />
        </ProgressRing>
        <Text style={s.summaryBarValue}>{data.activeMinutes}</Text>
        <Text style={s.summaryBarLabel}>min</Text>
      </View>
      <View style={s.summaryBarDivider} />
      <View style={s.summaryBarItem}>
        <ProgressRing
          radius={30}
          strokeWidth={5}
          progress={data.stepsGoal > 0 ? data.steps / data.stepsGoal : 0}
          color={Colors.fat}
          bgColor={Colors.border}
        >
          <Footprints size={13} color={Colors.fat} />
        </ProgressRing>
        <Text style={s.summaryBarValue}>{data.steps.toLocaleString()}</Text>
        <Text style={s.summaryBarLabel}>steps</Text>
      </View>
    </View>
  );
}

function SubNav({ active, onChange }) {
  const { colors: Colors } = useTheme();
  const s = createS(Colors);
  return (
    <View style={s.subNav}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[s.subNavTab, active === tab && s.subNavTabActive]}
          onPress={() => onChange(tab)}
          activeOpacity={0.7}
        >
          <Text style={[s.subNavText, active === tab && s.subNavTextActive]}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ActivityScreen() {
  const { colors: Colors } = useTheme();
  const s = createS(Colors);
  const [activeTab, setActiveTab] = useState('Today');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { dateKey } = useNutritionDate();
  const activityLog = useActivityLog(dateKey);
  const today = todayDateKey();

  const activityData = {
    caloriesBurned: activityLog.totalCaloriesBurned || 0,
    activeMinutes: activityLog.entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0),
    steps: 0,
    stepsGoal: 10000,
    stepProgress: 0,
  };

  const ACTIVITY_BURN_TARGET = 500;
  const todayComplete = isActivityStrikeComplete({
    burned: activityData.caloriesBurned,
    target: ACTIVITY_BURN_TARGET,
  });
  const strikeCount = countStreak([todayComplete, true, true, true]);

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.pageHeader}>
          <Text style={s.screenTitle}>Activity</Text>
          <View style={s.headerActions}>
            <StrikeBadge count={strikeCount} color="#FFD60A" />
          </View>
        </View>

        <SelectedDateBar
          dateKey={dateKey}
          onOpenCalendar={() => setCalendarOpen(true)}
          subtitle={dateKey === today ? 'Activity for today' : 'Activity for selected day'}
        />

        <ActivitySummaryBar data={activityData} />
        <SubNav active={activeTab} onChange={setActiveTab} />

        {activeTab === 'Today' && (
          activityLog.entries.length === 0 && !activityLog.loading ? (
            <EmptyState
              icon={Dumbbell}
              title="No activity logged today"
              message="Start tracking your workouts and daily movement"
            />
          ) : (
            <TodayPage />
          )
        )}
        {activeTab === 'Exercise' && <ExercisePage />}
        {activeTab === 'Plan' && <PlanPage />}

        <View style={{ height: 40 }} />
      </ScrollView>

      {activeTab === 'Today' && (
        <TouchableOpacity style={s.fab} activeOpacity={0.8}>
          <Plus size={24} color={Colors.onPrimary} />
        </TouchableOpacity>
      )}

      <CalendarModal visible={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </SafeAreaView>
  );
}

const createS = (Colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Layout.screenPadding, paddingBottom: 100 },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    ...Layout.cardShadow,
  },
  summaryBarItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryBarDivider: { width: 1, height: 48, backgroundColor: Colors.divider },
  summaryBarValue: { fontSize: 17, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  summaryBarLabel: { fontSize: 11, color: Colors.textTertiary },
  subNav: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.lg,
    padding: 4,
    marginBottom: 16,
    ...Layout.cardShadow,
  },
  subNavTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Layout.borderRadius.md,
  },
  subNavTabActive: { backgroundColor: Colors.textPrimary },
  subNavText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textTertiary },
  subNavTextActive: { color: Colors.onPrimary, fontFamily: 'PlusJakartaSans-SemiBold' },
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
});
