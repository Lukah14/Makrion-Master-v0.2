import { useState, useCallback, useMemo } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame, Clock, Footprints, Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNutritionDate } from '@/context/NutritionDateContext';
import { Layout } from '@/constants/layout';
import { useTabBarLayout } from '@/hooks/useTabBarLayout';
import CalendarModal from '@/components/calendar/CalendarModal';
import SelectedDateBar from '@/components/calendar/SelectedDateBar';
import { todayDateKey } from '@/lib/dateKey';
import ProgressRing from '@/components/common/ProgressRing';
import StrikeBadge from '@/components/common/StrikeBadge';
import TodayPage from '@/components/activity/TodayPage';
import { useDomainStreaksContext } from '@/context/DomainStreaksContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useSteps } from '@/hooks/useSteps';
import AddEditActivityModal from '@/components/activity/AddEditActivityModal';
import { updateActivityStreak } from '@/services/statsService';

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

export default function ActivityScreen() {
  const { colors: Colors } = useTheme();
  const s = createS(Colors);
  const { scrollPaddingBottom, floatingBottom } = useTabBarLayout();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const { dateKey, bumpCalendarRefresh, calendarRefreshKey } = useNutritionDate();
  const { user } = useAuth();
  const activityLog = useActivityLog(dateKey);
  const stepsHook = useSteps(dateKey, calendarRefreshKey);
  const today = todayDateKey();

  const stepsToday = stepsHook.steps;
  const stepsGoal = stepsHook.goal;

  const editingEntry = useMemo(
    () => (editingEntryId ? activityLog.entries.find((e) => e.id === editingEntryId) : null),
    [editingEntryId, activityLog.entries],
  );

  const openAddActivity = useCallback(() => {
    setEditingEntryId(null);
    setActivityModalOpen(true);
  }, []);

  const closeActivityModal = useCallback(() => {
    setActivityModalOpen(false);
    setEditingEntryId(null);
  }, []);

  const handleSaveActivity = useCallback(
    async (values) => {
      try {
        if (editingEntryId) {
          await activityLog.editEntry(editingEntryId, values);
        } else {
          await activityLog.addEntry(values);
        }
        setActivityModalOpen(false);
        setEditingEntryId(null);
        bumpCalendarRefresh();
        if (dateKey === today && user?.uid) {
          void updateActivityStreak(user.uid, dateKey).catch(() => {});
        }
      } catch (e) {
        Alert.alert('Could not save', e?.message || 'Try again.');
      }
    },
    [activityLog, editingEntryId, bumpCalendarRefresh, dateKey, today, user?.uid],
  );

  const stepProgressPct = stepsHook.stepProgressPercent;

  const activityData = {
    caloriesBurned: activityLog.totalCaloriesBurned || 0,
    activeMinutes: activityLog.entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0),
    steps: stepsToday,
    stepsGoal,
    stepProgress: stepProgressPct,
  };

  const { currentActivityStreak } = useDomainStreaksContext();

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.pageHeader}>
          <Text style={s.screenTitle}>Activity</Text>
          <View style={s.headerActions}>
            <StrikeBadge count={currentActivityStreak} color="#FFD60A" />
          </View>
        </View>

        <SelectedDateBar
          dateKey={dateKey}
          onOpenCalendar={() => setCalendarOpen(true)}
          subtitle={dateKey === today ? 'Activity for today' : 'Activity for selected day'}
        />

        <ActivitySummaryBar data={activityData} />

        {activityLog.error ? (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerText}>{activityLog.error}</Text>
            <TouchableOpacity onPress={() => activityLog.reload()} style={s.errorRetry} activeOpacity={0.7}>
              <Text style={s.errorRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {stepsHook.error ? (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerText}>{stepsHook.error}</Text>
            <TouchableOpacity onPress={() => stepsHook.reload()} style={s.errorRetry} activeOpacity={0.7}>
              <Text style={s.errorRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TodayPage
          entries={activityLog.entries}
          loading={activityLog.loading}
          dateKey={dateKey}
          isToday={dateKey === today}
          stepsToday={stepsToday}
          stepsGoal={stepsGoal}
          stepsLoading={stepsHook.loading}
          onSaveSteps={async (v) => {
            await stepsHook.saveSteps(v);
            bumpCalendarRefresh();
          }}
          onSaveGoal={async (v) => {
            await stepsHook.saveGoal(v);
            bumpCalendarRefresh();
          }}
          onAdd={openAddActivity}
          onEdit={(e) => {
            setEditingEntryId(e.id);
            setActivityModalOpen(true);
          }}
          onDelete={async (id) => {
            try {
              await activityLog.removeEntry(id);
              bumpCalendarRefresh();
            } catch (e) {
              Alert.alert('Could not delete', e?.message || 'Try again.');
            }
          }}
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      <TouchableOpacity
        style={[s.fab, { bottom: floatingBottom }]}
        activeOpacity={0.8}
        onPress={openAddActivity}
      >
        <Plus size={24} color={Colors.onPrimary} />
      </TouchableOpacity>

      <AddEditActivityModal
        visible={activityModalOpen}
        onClose={closeActivityModal}
        dateKey={dateKey}
        initialEntry={editingEntry}
        onSave={handleSaveActivity}
      />

      <CalendarModal visible={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </SafeAreaView>
  );
}

const createS = (Colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Layout.screenPadding },
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.error + '18',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.error + '44',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
  },
  errorRetry: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.textPrimary,
  },
  errorRetryText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.onPrimary,
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
});
