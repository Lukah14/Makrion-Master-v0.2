import { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useNutritionDate } from '@/context/NutritionDateContext';
import { useAuth } from '@/context/AuthContext';
import CalendarModal from '@/components/calendar/CalendarModal';
import SelectedDateBar from '@/components/calendar/SelectedDateBar';
import { useUser } from '@/hooks/useUser';
import { Layout } from '@/constants/layout';
import WeightSummaryCard from '@/components/progress/WeightSummaryCard';
import GoalPhaseCard from '@/components/progress/GoalPhaseCard';
import UpdateProgressSheet from '@/components/progress/UpdateProgressSheet';
import GoalProgressCard from '@/components/progress/GoalProgressCard';
import TotalCaloriesCard from '@/components/progress/TotalCaloriesCard';
import BMICard from '@/components/progress/BMICard';
import ProgressRing from '@/components/common/ProgressRing';
import EmptyState from '@/components/common/EmptyState';
import Card from '@/components/common/Card';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { Dimensions } from 'react-native';
import { listProgressEntries, saveWeightEntry } from '@/services/progressService';

const screenWidth = Dimensions.get('window').width - 64;

const TABS = ['Weight', 'Nutrition', 'Activity', 'Habits'];

function TabSelector({ activeTab, onTabChange }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <View style={styles.tabRow}>
      {TABS.map((tab) => (
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

function WeightView({ dateKey, bumpCalendarRefresh }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const { user } = useAuth();
  const { userData } = useUser();
  const userGoals = userData?.goals || null;

  const [goal, setGoal] = useState({
    type: userGoals?.type || 'Fat Loss',
    startWeight: userGoals?.startWeight || null,
    currentWeight: userGoals?.currentWeight || null,
    targetWeight: userGoals?.targetWeight || null,
    calorieTarget: userGoals?.calorieTarget || null,
    autoAdjustments: userGoals?.autoAdjustments ?? true,
    weeklyRate: userGoals?.weeklyRate || 0.5,
    weeksToGoal: userGoals?.weeksToGoal || null,
    notes: userGoals?.notes || '',
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [lastDate, setLastDate] = useState(null);

  useEffect(() => {
    if (userGoals) {
      setGoal((prev) => ({
        ...prev,
        type: userGoals.type || prev.type,
        startWeight: userGoals.startWeight ?? prev.startWeight,
        targetWeight: userGoals.targetWeight ?? prev.targetWeight,
        calorieTarget: userGoals.calorieTarget ?? prev.calorieTarget,
      }));
    }
  }, [userGoals]);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    try {
      const data = await listProgressEntries(user.uid, 90);
      const weightEntries = data
        .filter((e) => e.weight != null)
        .sort((a, b) => a.date.localeCompare(b.date));
      setEntries(weightEntries);
      if (weightEntries.length > 0) {
        const latest = weightEntries[weightEntries.length - 1];
        setGoal((prev) => ({ ...prev, currentWeight: latest.weight }));
        setLastDate(latest.date);
      }
    } catch {
      setEntries([]);
    }
  }, [user]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleSaveWeight = async (weight, dateStr) => {
    if (user) {
      await saveWeightEntry(user.uid, weight, dateStr);
    }
    setGoal((prev) => ({ ...prev, currentWeight: weight }));
    setLastDate(dateStr);
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.date !== dateStr);
      return [...filtered, { date: dateStr, weight }].sort((a, b) => a.date.localeCompare(b.date));
    });
    bumpCalendarRefresh?.();
  };

  if (entries.length === 0) {
    return (
      <View>
        <EmptyState
          icon={TrendingUp}
          title="No progress data yet"
          message="Log your first weight to start tracking progress"
          actionLabel="Update Progress"
          onAction={() => setSheetOpen(true)}
        />
        <UpdateProgressSheet
          visible={sheetOpen}
          lastWeight={goal.currentWeight}
          onSave={handleSaveWeight}
          onClose={() => setSheetOpen(false)}
          dateKey={dateKey}
        />
      </View>
    );
  }

  const chartData = entries.slice(-12).map((e) => ({
    label: new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: e.weight,
  }));

  return (
    <View>
      <View style={styles.topRow}>
        <WeightSummaryCard
          currentWeight={goal.currentWeight}
          goalWeight={goal.targetWeight}
          startWeight={goal.startWeight}
          lastDate={lastDate}
        />
        <View style={styles.topRowSpacer} />
        <GoalPhaseCard goal={goal} onEdit={() => setSheetOpen(true)} />
      </View>

      <GoalProgressCard
        currentWeight={goal.currentWeight}
        goalWeight={goal.targetWeight}
        startWeight={goal.startWeight}
        hasData={entries.length > 0}
        weightHistory={chartData}
      />

      <TotalCaloriesCard />

      <BMICard weight={goal.currentWeight} height={userData?.profile?.height || 175} />

      <UpdateProgressSheet
        visible={sheetOpen}
        lastWeight={goal.currentWeight}
        onSave={handleSaveWeight}
        onClose={() => setSheetOpen(false)}
        dateKey={dateKey}
      />
    </View>
  );
}

function CalorieBarChart({ data }) {
  const { colors: Colors } = useTheme();
  const chartWidth = screenWidth;
  const chartHeight = 140;
  const barWidth = (chartWidth - 60) / data.length - 6;
  const maxVal = Math.max(...data.map((d) => d.value));

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {data.map((d, i) => {
        const barHeight = (d.value / maxVal) * (chartHeight - 30);
        const x = 10 + i * (barWidth + 6);
        const isLast = i === data.length - 1;
        return (
          <View key={i}>
            <Rect
              x={x}
              y={chartHeight - 20 - barHeight}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={isLast ? Colors.primary : Colors.border}
            />
            <SvgText
              x={x + barWidth / 2}
              y={chartHeight - 4}
              fontSize={10}
              fill={Colors.textTertiary}
              textAnchor="middle"
            >
              {d.day}
            </SvgText>
          </View>
        );
      })}
    </Svg>
  );
}

function NutritionView() {
  return (
    <EmptyState
      icon={TrendingUp}
      title="No nutrition analysis yet"
      message="Log meals to see weekly calorie and macro breakdowns"
    />
  );
}

function ActivityView() {
  return (
    <EmptyState
      icon={TrendingUp}
      title="No activity data yet"
      message="Start logging workouts to see weekly activity trends"
    />
  );
}

function HabitsView() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const weekProgress = [
    { day: 'Mon', completed: 5, total: 7 },
    { day: 'Tue', completed: 6, total: 7 },
    { day: 'Wed', completed: 4, total: 7 },
    { day: 'Thu', completed: 7, total: 7 },
    { day: 'Fri', completed: 3, total: 7 },
    { day: 'Sat', completed: 5, total: 7 },
    { day: 'Sun', completed: 2, total: 7 },
  ];

  return (
    <View>
      <Card>
        <Text style={styles.chartTitle}>Weekly Habit Completion</Text>
        <View style={styles.habitWeekRow}>
          {weekProgress.map((day) => {
            const pct = day.completed / day.total;
            return (
              <View key={day.day} style={styles.habitDayCol}>
                <ProgressRing
                  radius={20}
                  strokeWidth={4}
                  progress={pct}
                  color={pct === 1 ? Colors.success : Colors.primary}
                  bgColor={Colors.border}
                >
                  <Text style={styles.habitDayValue}>{day.completed}</Text>
                </ProgressRing>
                <Text style={styles.habitDayLabel}>{day.day}</Text>
              </View>
            );
          })}
        </View>
      </Card>
      <Card>
        <View style={styles.consistencyRow}>
          <View style={styles.consistencyItem}>
            <Text style={styles.consistencyValue}>86%</Text>
            <Text style={styles.consistencyLabel}>Completion Rate</Text>
          </View>
          <View style={styles.consistencyDivider} />
          <View style={styles.consistencyItem}>
            <Text style={styles.consistencyValue}>12</Text>
            <Text style={styles.consistencyLabel}>Best Streak</Text>
          </View>
          <View style={styles.consistencyDivider} />
          <View style={styles.consistencyItem}>
            <Text style={styles.consistencyValue}>5.2</Text>
            <Text style={styles.consistencyLabel}>Daily Avg</Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

export default function ProgressScreen() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [activeTab, setActiveTab] = useState('Weight');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { dateKey, bumpCalendarRefresh } = useNutritionDate();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Progress</Text>
        <SelectedDateBar
          dateKey={dateKey}
          onOpenCalendar={() => setCalendarOpen(true)}
          subtitle="Weight & daily context"
        />
        <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'Weight' && (
          <WeightView dateKey={dateKey} bumpCalendarRefresh={bumpCalendarRefresh} />
        )}
        {activeTab === 'Nutrition' && <NutritionView />}
        {activeTab === 'Activity' && <ActivityView />}
        {activeTab === 'Habits' && <HabitsView />}
        <View style={{ height: 40 }} />
      </ScrollView>
      <CalendarModal visible={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </SafeAreaView>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Layout.screenPadding, paddingBottom: 100 },
  screenTitle: {
    fontSize: 32,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.textPrimary },
  tabText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textTertiary },
  tabTextActive: { color: Colors.onPrimary, fontFamily: 'PlusJakartaSans-SemiBold' },
  topRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  topRowSpacer: { width: 10 },
  chartTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, marginBottom: 12 },
  macroAvgRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  macroAvg: { alignItems: 'center' },
  macroAvgValue: { fontSize: 10, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  macroAvgLabel: { fontSize: 12, color: Colors.textTertiary, marginTop: 6 },
  statCards: { flexDirection: 'row', gap: 10 },
  miniCard: { flex: 1, padding: 14 },
  miniValue: { fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  miniLabel: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
  habitWeekRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  habitDayCol: { alignItems: 'center' },
  habitDayValue: { fontSize: 10, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  habitDayLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 6 },
  consistencyRow: { flexDirection: 'row', justifyContent: 'space-around' },
  consistencyItem: { alignItems: 'center' },
  consistencyValue: { fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  consistencyLabel: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
  consistencyDivider: { width: 1, backgroundColor: Colors.divider, height: '100%' },
});
