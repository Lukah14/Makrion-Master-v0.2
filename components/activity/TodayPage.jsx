import { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Modal,
} from 'react-native';
import { CircleCheck as CheckCircle2, Clock, Flame, Dumbbell, ChevronRight, Plus, Play, Trash2, CalendarDays, Zap, Activity } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const ICON_MORE = require('@/src/Icons/More.png');
import { Layout } from '@/constants/layout';
import { todayDone, todayPlanned, DIFFICULTY_COLORS, estimateCalories, userProfile } from '@/data/activityData';

function SummaryCard({ icon, label, value, sub, color, bg }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  return (
    <View style={[s.summaryCard, { backgroundColor: bg }]}>
      <View style={[s.summaryIcon, { backgroundColor: color + '22' }]}>
        {icon}
      </View>
      <Text style={[s.summaryValue, { color }]}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
      {sub ? <Text style={s.summarySub}>{sub}</Text> : null}
    </View>
  );
}

function DiffBadge({ difficulty }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const d = DIFFICULTY_COLORS[difficulty] || { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <View style={[s.badge, { backgroundColor: d.bg }]}>
      <Text style={[s.badgeText, { color: d.text }]}>{difficulty}</Text>
    </View>
  );
}

function DoneCard({ item }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  return (
    <View style={s.doneCard}>
      <View style={s.doneLeft}>
        <View style={s.doneCheck}>
          <CheckCircle2 size={18} color={Colors.success} />
        </View>
        <View style={s.doneInfo}>
          <Text style={s.doneName}>{item.name}</Text>
          <View style={s.doneMeta}>
            <Clock size={11} color={Colors.textTertiary} />
            <Text style={s.doneMetaText}>{item.completedAt}</Text>
            <Text style={s.doneMetaDot}>·</Text>
            <Clock size={11} color={Colors.textTertiary} />
            <Text style={s.doneMetaText}>{item.duration} min</Text>
            <Text style={s.doneMetaDot}>·</Text>
            <Flame size={11} color={Colors.calories} />
            <Text style={s.doneMetaText}>{estimateCalories(item.caloriesBurned / item.duration, item.duration, userProfile)} kcal</Text>
          </View>
          <View style={s.doneTagRow}>
            <DiffBadge difficulty={item.difficulty} />
            <View style={s.muscleTag}>
              <Text style={s.muscleTagText}>{item.muscleGroup}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function PlannedCard({ item, onMarkDone, onRemove }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const [menuOpen, setMenuOpen] = useState(false);
  const cal = estimateCalories(item.estimatedCalories / item.duration, item.duration, userProfile);

  return (
    <View style={s.plannedCard}>
      <View style={s.plannedTop}>
        <View style={s.plannedLeft}>
          <View style={s.plannedIconBox}>
            <Dumbbell size={16} color={Colors.primary} />
          </View>
          <View style={s.plannedInfo}>
            <Text style={s.plannedName}>{item.name}</Text>
            <View style={s.plannedMeta}>
              <CalendarDays size={11} color={Colors.textTertiary} />
              <Text style={s.plannedMetaText}>{item.scheduledTime}</Text>
              <Text style={s.doneMetaDot}>·</Text>
              <Clock size={11} color={Colors.textTertiary} />
              <Text style={s.plannedMetaText}>{item.duration} min</Text>
              <Text style={s.doneMetaDot}>·</Text>
              <Flame size={11} color={Colors.calories} />
              <Text style={s.plannedMetaText}>~{cal} kcal</Text>
            </View>
            <View style={s.doneTagRow}>
              <DiffBadge difficulty={item.difficulty} />
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={s.menuBtn}
          onPress={() => setMenuOpen(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Image source={ICON_MORE} style={s.moreIcon} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      <View style={s.plannedActions}>
        <TouchableOpacity style={s.startBtn} onPress={() => onMarkDone(item.id)} activeOpacity={0.8}>
          <Play size={14} color={Colors.onPrimary} />
          <Text style={s.startBtnText}>Start</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.doneBtn} onPress={() => onMarkDone(item.id)} activeOpacity={0.8}>
          <CheckCircle2 size={14} color={Colors.success} />
          <Text style={s.doneBtnText}>Mark done</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={s.menuBox}>
            <Text style={s.menuTitle}>{item.name}</Text>
            <View style={s.menuDivider} />
            <TouchableOpacity style={s.menuItem} onPress={() => { onMarkDone(item.id); setMenuOpen(false); }} activeOpacity={0.7}>
              <CheckCircle2 size={16} color={Colors.success} />
              <Text style={s.menuItemText}>Mark as done</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem} onPress={() => setMenuOpen(false)} activeOpacity={0.7}>
              <CalendarDays size={16} color={Colors.primary} />
              <Text style={s.menuItemText}>Reschedule</Text>
            </TouchableOpacity>
            <View style={s.menuDivider} />
            <TouchableOpacity style={s.menuItem} onPress={() => { onRemove(item.id); setMenuOpen(false); }} activeOpacity={0.7}>
              <Trash2 size={16} color={Colors.error} />
              <Text style={[s.menuItemText, { color: Colors.error }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function WeeklyMini() {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const active = [true, true, false, true, true, false, false];
  return (
    <View style={s.weeklyCard}>
      <Text style={s.weeklyTitle}>This Week</Text>
      <View style={s.weeklyRow}>
        {days.map((d, i) => (
          <View key={i} style={s.weeklyDayCol}>
            <View style={[s.weeklyDot, active[i] && s.weeklyDotActive]} />
            <Text style={[s.weeklyDayLabel, active[i] && s.weeklyDayLabelActive]}>{d}</Text>
          </View>
        ))}
      </View>
      <View style={s.weeklyStats}>
        <View style={s.weeklyStat}>
          <Text style={s.weeklyStatVal}>4</Text>
          <Text style={s.weeklyStatLabel}>Workouts</Text>
        </View>
        <View style={s.weeklyStatDiv} />
        <View style={s.weeklyStat}>
          <Text style={s.weeklyStatVal}>1,340</Text>
          <Text style={s.weeklyStatLabel}>kcal burned</Text>
        </View>
        <View style={s.weeklyStatDiv} />
        <View style={s.weeklyStat}>
          <Text style={s.weeklyStatVal}>110</Text>
          <Text style={s.weeklyStatLabel}>min active</Text>
        </View>
      </View>
    </View>
  );
}

export default function TodayPage({ onAddExercise }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const [done, setDone] = useState(todayDone);
  const [planned, setPlanned] = useState(todayPlanned);

  const totalCal = done.reduce((a, i) => a + estimateCalories(i.caloriesBurned / i.duration, i.duration, userProfile), 0);
  const totalMin = done.reduce((a, i) => a + i.duration, 0);

  const markDone = (id) => {
    const item = planned.find((p) => p.id === id);
    if (!item) return;
    setPlanned((prev) => prev.filter((p) => p.id !== id));
    setDone((prev) => [
      ...prev,
      {
        id: item.id,
        name: item.name,
        duration: item.duration,
        caloriesBurned: item.estimatedCalories,
        difficulty: item.difficulty,
        completedAt: 'Just now',
        muscleGroup: item.muscleGroup,
        category: item.category,
      },
    ]);
  };

  const removePlanned = (id) => setPlanned((prev) => prev.filter((p) => p.id !== id));

  return (
    <View>
      <View style={s.summaryRow}>
        <SummaryCard
          icon={<Flame size={18} color={Colors.calories} />}
          label="Burned"
          value={totalCal}
          sub="kcal"
          color={Colors.calories}
          bg={Colors.caloriesLight}
        />
        <SummaryCard
          icon={<Clock size={18} color={Colors.primary} />}
          label="Active"
          value={totalMin}
          sub="min"
          color={Colors.primary}
          bg={Colors.primaryLight}
        />
        <SummaryCard
          icon={<CheckCircle2 size={18} color={Colors.success} />}
          label="Done"
          value={done.length}
          sub="sessions"
          color={Colors.success}
          bg={Colors.successLight}
        />
        <SummaryCard
          icon={<Activity size={18} color={Colors.fat} />}
          label="Planned"
          value={planned.length}
          sub="sessions"
          color={Colors.fat}
          bg={Colors.fatLight}
        />
      </View>

      <WeeklyMini />

      <View style={s.sectionHeader}>
        <View style={s.sectionLeft}>
          <View style={[s.sectionDot, { backgroundColor: Colors.success }]} />
          <Text style={s.sectionTitle}>Done</Text>
          <View style={s.countBadge}><Text style={s.countBadgeText}>{done.length}</Text></View>
        </View>
      </View>

      {done.length === 0 ? (
        <View style={s.emptyState}>
          <Dumbbell size={32} color={Colors.textTertiary} />
          <Text style={s.emptyTitle}>No workouts logged yet</Text>
          <Text style={s.emptySub}>Complete a workout to see it here</Text>
        </View>
      ) : (
        done.map((item) => <DoneCard key={item.id} item={item} />)
      )}

      <View style={s.sectionHeader}>
        <View style={s.sectionLeft}>
          <View style={[s.sectionDot, { backgroundColor: Colors.primary }]} />
          <Text style={s.sectionTitle}>Planned</Text>
          <View style={[s.countBadge, { backgroundColor: Colors.primaryLight }]}>
            <Text style={[s.countBadgeText, { color: Colors.primary }]}>{planned.length}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={onAddExercise} activeOpacity={0.7}>
          <Plus size={14} color={Colors.primary} />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {planned.length === 0 ? (
        <View style={s.emptyState}>
          <CalendarDays size={32} color={Colors.textTertiary} />
          <Text style={s.emptyTitle}>Nothing planned yet</Text>
          <Text style={s.emptySub}>Tap Add to schedule a workout</Text>
        </View>
      ) : (
        planned.map((item) => (
          <PlannedCard key={item.id} item={item} onMarkDone={markDone} onRemove={removePlanned} />
        ))
      )}
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: Layout.borderRadius.lg,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    ...Layout.cardShadow,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  summaryLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  summarySub: {
    fontSize: 9,
    color: Colors.textTertiary,
  },
  weeklyCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    padding: 16,
    marginBottom: 16,
    ...Layout.cardShadow,
  },
  weeklyTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  weeklyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  weeklyDayCol: {
    alignItems: 'center',
    gap: 4,
  },
  weeklyDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
  },
  weeklyDotActive: {
    backgroundColor: Colors.primary,
  },
  weeklyDayLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  weeklyDayLabelActive: {
    color: Colors.primary,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  weeklyStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 12,
  },
  weeklyStat: { flex: 1, alignItems: 'center' },
  weeklyStatVal: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  weeklyStatLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  weeklyStatDiv: { width: 1, backgroundColor: Colors.divider },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  countBadge: {
    backgroundColor: Colors.successLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', color: Colors.success },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  addBtnText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.primary },
  doneCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    padding: 14,
    marginBottom: 10,
    ...Layout.cardShadow,
  },
  doneLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  doneCheck: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneInfo: { flex: 1 },
  doneName: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary, marginBottom: 4 },
  doneMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  doneMetaText: { fontSize: 12, color: Colors.textTertiary },
  doneMetaDot: { fontSize: 12, color: Colors.textTertiary },
  doneTagRow: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontFamily: 'PlusJakartaSans-SemiBold' },
  muscleTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  muscleTagText: { fontSize: 10, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.primary },
  plannedCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    padding: 14,
    marginBottom: 10,
    ...Layout.cardShadow,
  },
  plannedTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  plannedLeft: { flex: 1, flexDirection: 'row', gap: 12 },
  plannedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plannedInfo: { flex: 1 },
  plannedName: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary, marginBottom: 4 },
  plannedMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  plannedMetaText: { fontSize: 12, color: Colors.textTertiary },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreIcon: {
    width: 18,
    height: 18,
    tintColor: Colors.textTertiary,
  },
  plannedActions: { flexDirection: 'row', gap: 8 },
  startBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.textPrimary,
    borderRadius: 12,
    paddingVertical: 10,
  },
  startBtnText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.onPrimary },
  doneBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    borderRadius: 12,
    paddingVertical: 10,
  },
  doneBtnText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.success },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    marginBottom: 10,
    ...Layout.cardShadow,
  },
  emptyTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary, marginTop: 10 },
  emptySub: { fontSize: 13, color: Colors.textTertiary, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuBox: {
    width: '100%',
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    overflow: 'hidden',
    ...Layout.cardShadow,
  },
  menuTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    padding: 16,
  },
  menuDivider: { height: 1, backgroundColor: Colors.divider },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  menuItemText: { fontSize: 15, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textPrimary },
});
