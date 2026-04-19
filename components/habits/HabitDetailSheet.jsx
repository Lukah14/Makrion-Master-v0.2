import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Pressable } from 'react-native';
import { X, Pencil, SkipForward, Trash2, Copy, Flame, Calendar, Clock, Target } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { HabitCategoryIcon } from './habitIconMap';
import {
  normalizeNumericConditionType,
  getNumericTargetValue,
  numericHabitProgressPercent,
  conditionTypeToDisplayLabel,
  NUMERIC_CONDITION,
} from '@/lib/habitNumericCondition';
import { formatHabitFrequencyLabel } from '@/lib/habitEditForm';

const TYPE_LABELS = {
  yesno: 'Yes/No',
  numeric: 'Numeric',
  timer: 'Timer',
  checklist: 'Checklist',
};

export default function HabitDetailSheet({ habit, visible, onClose, onEdit, onSkip, onDelete, onDuplicate }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  if (!habit) return null;

  const numericCond = habit.type === 'numeric' ? normalizeNumericConditionType(habit) : null;
  const isAnyNumeric = numericCond === NUMERIC_CONDITION.ANY_VALUE;

  const isCompleted =
    habit.type === 'yesno'
      ? habit.completed
      : habit.type === 'checklist'
        ? habit.checklistItems?.every((item) => item.completed)
        : habit.type === 'timer'
          ? habit.completed
          : habit.type === 'numeric'
            ? isAnyNumeric
              ? false
              : habit.completed
            : !!habit.completed;

  const numericTgt = habit.type === 'numeric' ? getNumericTargetValue(habit) : null;
  const numericProgressPct =
    habit.type === 'numeric' && !isAnyNumeric
      ? numericHabitProgressPercent(
          habit.current,
          numericCond,
          numericTgt,
          !!habit.completed,
        )
      : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: habit.iconBg || '#E8F4FD' }]}>
              <HabitCategoryIcon iconName={habit.iconName} category={habit.category} size={20} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.habitName}>{habit.name}</Text>
              <Text style={styles.categoryText}>{habit.category}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {habit.description && (
            <Text style={styles.description}>{habit.description}</Text>
          )}

          <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {isAnyNumeric
                    ? habit.numericDayHasEntry
                      ? String(habit.current ?? 0)
                      : '—'
                    : isCompleted
                      ? 'Done'
                      : 'Pending'}
                </Text>
                <Text style={styles.statLabel}>{isAnyNumeric ? 'Logged' : 'Status'}</Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.streakValue}>
                  <Flame size={14} color={Colors.streakFire} />
                  <Text style={styles.statValue}>{habit.streak || 0}</Text>
                </View>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{TYPE_LABELS[habit.type]}</Text>
                <Text style={styles.statLabel}>Type</Text>
              </View>
            </View>

            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <Calendar size={16} color={Colors.textTertiary} />
                <Text style={styles.detailLabel}>Repeat</Text>
                <Text style={styles.detailValue}>{formatHabitFrequencyLabel(habit)}</Text>
              </View>
              {habit.type === 'numeric' && (
                <>
                  <View style={styles.detailRow}>
                    <Target size={16} color={Colors.textTertiary} />
                    <Text style={styles.detailLabel}>Condition</Text>
                    <Text style={styles.detailValue}>
                      {conditionTypeToDisplayLabel(numericCond)}
                      {numericTgt != null
                        ? ` · ${numericTgt}${habit.unit ? ` ${habit.unit}` : ''}`
                        : habit.unit
                          ? ` · ${habit.unit}`
                          : ''}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Target size={16} color={Colors.textTertiary} />
                    <Text style={styles.detailLabel}>Progress</Text>
                    <Text style={styles.detailValue}>
                      {isAnyNumeric && !habit.numericDayHasEntry
                        ? '—'
                        : habit.current ?? 0}
                      {numericTgt != null ? ` / ${numericTgt}` : ''}
                      {habit.unit ? ` ${habit.unit}` : ''}
                    </Text>
                  </View>
                </>
              )}
              {habit.type !== 'yesno' && habit.type !== 'numeric' && (
                <View style={styles.detailRow}>
                  <Target size={16} color={Colors.textTertiary} />
                  <Text style={styles.detailLabel}>Target</Text>
                  <Text style={styles.detailValue}>{habit.target} {habit.unit}</Text>
                </View>
              )}
              {habit.type !== 'yesno' && habit.type !== 'numeric' && (
                <View style={styles.detailRow}>
                  <Target size={16} color={Colors.textTertiary} />
                  <Text style={styles.detailLabel}>Progress</Text>
                  <Text style={styles.detailValue}>{habit.current} / {habit.target} {habit.unit}</Text>
                </View>
              )}
              {habit.reminderTime && (
                <View style={styles.detailRow}>
                  <Clock size={16} color={Colors.textTertiary} />
                  <Text style={styles.detailLabel}>Reminder</Text>
                  <Text style={styles.detailValue}>{habit.reminderTime}</Text>
                </View>
              )}
            </View>

            {habit.type === 'numeric' && !isAnyNumeric && (
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${numericProgressPct}%` }]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round(numericProgressPct)}% complete
                </Text>
              </View>
            )}
            {habit.type !== 'yesno' && habit.type !== 'numeric' && (
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min((habit.current / habit.target) * 100, 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round((habit.current / habit.target) * 100)}% complete
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit?.(habit)} activeOpacity={0.7}>
              <Pencil size={18} color={Colors.primary} />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onSkip?.(habit)} activeOpacity={0.7}>
              <SkipForward size={18} color={Colors.warning} />
              <Text style={styles.actionText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onDuplicate?.(habit)} activeOpacity={0.7}>
              <Copy size={18} color={Colors.textSecondary} />
              <Text style={styles.actionText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete?.(habit)} activeOpacity={0.7}>
              <Trash2 size={18} color={Colors.error} />
              <Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 22,
  },
  headerInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  categoryText: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsScroll: {
    maxHeight: 300,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.lg,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  streakValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  detailsList: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textSecondary,
  },
});
