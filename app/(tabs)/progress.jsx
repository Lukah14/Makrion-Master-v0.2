import { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useNutritionDate } from '@/context/NutritionDateContext';
import { useAuth } from '@/context/AuthContext';
import CalendarModal from '@/components/calendar/CalendarModal';
import SelectedDateBar from '@/components/calendar/SelectedDateBar';
import { useUser } from '@/hooks/useUser';
import { Layout } from '@/constants/layout';
import WeightSummaryCard from '@/components/progress/WeightSummaryCard';
import GoalPhaseCard from '@/components/progress/GoalPhaseCard';
import WeightLogSheet from '@/components/progress/WeightLogSheet';
import WeightHistoryList from '@/components/progress/WeightHistoryList';
import GoalProgressCard from '@/components/progress/GoalProgressCard';
import BMICard from '@/components/progress/BMICard';
import EmptyState from '@/components/common/EmptyState';
import NutritionProgressView from '@/components/progress/NutritionProgressView';
import ActivityProgressView from '@/components/progress/ActivityProgressView';
import HabitsTrackerProgressView from '@/components/progress/HabitsTrackerProgressView';
import {
  getWeightEntriesChronological,
  upsertWeightEntry,
  deleteWeightEntryForDate,
  moveWeightEntry,
} from '@/services/weightEntryService';

const TABS = ['Weight', 'Nutrition', 'Activity', 'H. Tracker'];

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

function WeightView({ dateKey, bumpCalendarRefresh, weightSheet, setWeightSheet }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const { user } = useAuth();
  const { userData, resolvedGoals } = useUser();
  const userGoals = resolvedGoals ?? userData?.goals ?? null;

  const [goal, setGoal] = useState({
    type: userGoals?.type || 'Fat Loss',
    startWeight: userGoals?.startWeight ?? null,
    currentWeight: userGoals?.currentWeight ?? null,
    targetWeight: userGoals?.targetWeight ?? null,
    calorieTarget: userGoals?.calorieTarget ?? null,
    autoAdjustments: userGoals?.autoAdjustments ?? true,
    weeklyRate: userGoals?.weeklyRate || 0.5,
    weeksToGoal: userGoals?.weeksToGoal ?? userGoals?.goalTimelineWeeks ?? null,
    goalTimelineWeeks: userGoals?.goalTimelineWeeks ?? userGoals?.weeksToGoal ?? null,
    expectedWeeklyChangeKg: userGoals?.expectedWeeklyChangeKg ?? null,
    estimatedGoalDate: userGoals?.estimatedGoalDate ?? null,
    notes: userGoals?.notes || '',
  });

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
        weeksToGoal: userGoals.weeksToGoal ?? userGoals.goalTimelineWeeks ?? prev.weeksToGoal,
        goalTimelineWeeks: userGoals.goalTimelineWeeks ?? userGoals.weeksToGoal ?? prev.goalTimelineWeeks,
        expectedWeeklyChangeKg: userGoals.expectedWeeklyChangeKg ?? prev.expectedWeeklyChangeKg,
        estimatedGoalDate: userGoals.estimatedGoalDate ?? prev.estimatedGoalDate,
      }));
    }
  }, [userGoals]);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    try {
      const list = await getWeightEntriesChronological(user.uid);
      const normalized = list
        .filter((e) => e.weightKg != null && Number.isFinite(Number(e.weightKg)))
        .map((e) => ({
          dateKey: e.dateKey || e.date,
          weightKg: Number(e.weightKg),
        }))
        .filter((e) => e.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(e.dateKey))
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
      setEntries(normalized);
      if (normalized.length > 0) {
        const latest = normalized[normalized.length - 1];
        setGoal((prev) => ({ ...prev, currentWeight: latest.weightKg }));
        setLastDate(latest.dateKey);
      } else {
        setGoal((prev) => ({ ...prev, currentWeight: null }));
        setLastDate(null);
      }
    } catch {
      setEntries([]);
      setLastDate(null);
    }
  }, [user]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const openAddSheet = () => setWeightSheet({ open: true, editing: null });
  const openEditSheet = (entry) => setWeightSheet({ open: true, editing: entry });
  const closeSheet = () => setWeightSheet({ open: false, editing: null });

  const handleSaveWeight = async ({ weightKg, dateKey: logKey }) => {
    if (!user?.uid) return;
    const edit = weightSheet?.editing;
    if (edit && edit.dateKey !== logKey) {
      await moveWeightEntry(user.uid, edit.dateKey, logKey, weightKg);
    } else {
      await upsertWeightEntry(user.uid, { dateKey: logKey, weightKg });
    }
    await loadEntries();
    bumpCalendarRefresh?.();
  };

  const handleDeleteWeight = async (key) => {
    if (!user?.uid) return;
    await deleteWeightEntryForDate(user.uid, key);
    await loadEntries();
    bumpCalendarRefresh?.();
  };

  const chartEntries = entries;

  const sheetMode = weightSheet?.editing ? 'edit' : 'add';
  const defaultLogDate = dateKey || undefined;

  if (entries.length === 0) {
    return (
      <View>
        <EmptyState
          icon={TrendingUp}
          title="No progress data yet"
          message="Log your first weight to start tracking progress"
          actionLabel="Log weight"
          onAction={openAddSheet}
        />
        <WeightLogSheet
          visible={!!weightSheet?.open}
          onClose={closeSheet}
          defaultDateKey={sheetMode === 'edit' ? weightSheet?.editing?.dateKey : defaultLogDate}
          mode={sheetMode}
          editingEntry={weightSheet?.editing}
          onSave={handleSaveWeight}
          onDelete={sheetMode === 'edit' ? handleDeleteWeight : undefined}
        />
      </View>
    );
  }

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
        <GoalPhaseCard goal={goal} onEdit={openAddSheet} />
      </View>

      <GoalProgressCard
        currentWeight={goal.currentWeight}
        goalWeight={goal.targetWeight}
        startWeight={goal.startWeight}
        hasData={entries.length > 0}
        entries={chartEntries}
      />

      <WeightHistoryList entries={entries} onEditEntry={openEditSheet} />

      <BMICard weight={goal.currentWeight} height={userData?.profile?.height || 175} />

      <WeightLogSheet
        visible={!!weightSheet?.open}
        onClose={closeSheet}
        defaultDateKey={sheetMode === 'edit' ? weightSheet?.editing?.dateKey : defaultLogDate}
        mode={sheetMode}
        editingEntry={weightSheet?.editing}
        onSave={handleSaveWeight}
        onDelete={sheetMode === 'edit' ? handleDeleteWeight : undefined}
      />
    </View>
  );
}

export default function ProgressScreen() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [activeTab, setActiveTab] = useState('Weight');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [weightSheet, setWeightSheet] = useState({ open: false, editing: null });
  const { dateKey, bumpCalendarRefresh } = useNutritionDate();
  const { user } = useAuth();

  useEffect(() => {
    if (activeTab !== 'Weight') {
      setWeightSheet({ open: false, editing: null });
    }
  }, [activeTab]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.progressRoot}>
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
            <WeightView
              dateKey={dateKey}
              bumpCalendarRefresh={bumpCalendarRefresh}
              weightSheet={weightSheet}
              setWeightSheet={setWeightSheet}
            />
          )}
          {activeTab === 'Nutrition' && <NutritionProgressView uid={user?.uid} />}
          {activeTab === 'Activity' && <ActivityProgressView uid={user?.uid} />}
          {activeTab === 'H. Tracker' && (
            <HabitsTrackerProgressView uid={user?.uid} weekAnchorDateKey={dateKey} />
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
        {activeTab === 'Weight' && (
          <Pressable
            style={styles.weightFab}
            onPress={() => setWeightSheet({ open: true, editing: null })}
            accessibilityRole="button"
            accessibilityLabel="Log weight"
          >
            <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        )}
      </View>
      <CalendarModal visible={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </SafeAreaView>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  progressRoot: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Layout.screenPadding, paddingBottom: 100 },
  weightFab: {
    position: 'absolute',
    right: Layout.screenPadding,
    bottom: 96,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
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
