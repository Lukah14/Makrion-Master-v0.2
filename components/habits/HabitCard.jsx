import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, TextInput, Keyboard } from 'react-native';
import { Check, Plus, Minus, Play, Pause, Square, RotateCcw } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { habitIconMap, getIconForCategory } from './habitIconMap';
import { timerTargetToSeconds } from '@/lib/habitDayState';
import {
  normalizeNumericConditionType,
  getNumericTargetValue,
  numericHabitProgressPercent,
  NUMERIC_CONDITION,
} from '@/lib/habitNumericCondition';

function ChecklistExpanded({ items, onToggleItem }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <View style={styles.expandedSection}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.checklistItem}
          onPress={() => onToggleItem(item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.checklistBox, item.completed && styles.checklistBoxDone]}>
            {item.completed && <Check size={10} color={Colors.onPrimary} />}
          </View>
          <Text style={[styles.checklistText, item.completed && styles.checklistTextDone]}>
            {item.text}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function NumericExpanded({
  habitForNumeric,
  current,
  target,
  completed,
  unit,
  numericDayHasEntry = true,
  onIncrement,
  onDecrement,
  onSetNumericCurrent,
  /** Increment (e.g. tap row value) to open the keyboard and edit by typing. */
  focusEditToken = 0,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const cond = normalizeNumericConditionType(habitForNumeric);
  const isAnyValue = cond === NUMERIC_CONDITION.ANY_VALUE;
  const tgt = getNumericTargetValue(habitForNumeric);
  const targetNum = tgt != null && Number.isFinite(Number(tgt)) ? Math.max(Number(tgt), 1) : null;
  const cur = isAnyValue && !numericDayHasEntry ? null : Number(current) || 0;
  const progressCompleted = isAnyValue ? false : !!completed;
  const progressCurrent = isAnyValue ? (numericDayHasEntry ? Number(current) || 0 : 0) : cur;
  const progressPct = isAnyValue ? 0 : numericHabitProgressPercent(progressCurrent, cond, tgt, progressCompleted);

  useEffect(() => {
    if (!editing) {
      if (isAnyValue && !numericDayHasEntry) setDraft('');
      else setDraft(cur === null ? '' : String(cur));
    }
  }, [cur, editing, isAnyValue, numericDayHasEntry]);

  useEffect(() => {
    if (focusEditToken < 1) return;
    if (isAnyValue && !numericDayHasEntry) setDraft('');
    else setDraft(cur === null ? '' : String(cur));
    setEditing(true);
  }, [focusEditToken, isAnyValue, numericDayHasEntry, cur]);

  const commit = useCallback(() => {
    if (!onSetNumericCurrent) {
      setEditing(false);
      return;
    }
    const trimmed = draft.replace(/\s/g, '');
    if (trimmed === '') {
      if (isAnyValue && !numericDayHasEntry) {
        setEditing(false);
        Keyboard.dismiss();
        return;
      }
      setDraft(cur === null ? '' : String(cur));
      setEditing(false);
      return;
    }
    if (!/^\d+$/.test(trimmed)) {
      setDraft(cur === null ? '' : String(cur));
      setEditing(false);
      return;
    }
    const n = parseInt(trimmed, 10);
    if (!Number.isFinite(n) || n < 0) {
      setDraft(cur === null ? '' : String(cur));
      setEditing(false);
      return;
    }
    const capped = Math.min(n, 9_999_999);
    onSetNumericCurrent(capped);
    setEditing(false);
    Keyboard.dismiss();
  }, [draft, cur, onSetNumericCurrent, isAnyValue, numericDayHasEntry]);

  const wrapDec = () => {
    setEditing(false);
    onDecrement();
  };
  const wrapInc = () => {
    setEditing(false);
    onIncrement();
  };

  const valueRest =
    targetNum != null ? ` / ${target} ${unit || ''}`.trimEnd() : unit ? ` ${unit}` : '';

  return (
    <View style={styles.expandedSection}>
      <View style={styles.numericRow}>
        <TouchableOpacity style={styles.numericBtn} onPress={wrapDec} activeOpacity={0.7}>
          <Minus size={16} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.numericValueBlock}>
          {editing ? (
            <TextInput
              style={styles.numericInput}
              value={draft}
              onChangeText={(t) => setDraft(t.replace(/[^\d]/g, ''))}
              keyboardType="number-pad"
              inputMode="numeric"
              returnKeyType="done"
              selectTextOnFocus
              showSoftInputOnFocus
              autoFocus
              onSubmitEditing={commit}
              onBlur={commit}
            />
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setDraft(isAnyValue && !numericDayHasEntry ? '' : String(cur));
                setEditing(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={styles.numericValue}>
                {cur === null ? '—' : cur}
                <Text style={styles.numericValueRest}>{valueRest}</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.numericBtn} onPress={wrapInc} activeOpacity={0.7}>
          <Plus size={16} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>
      {!isAnyValue ? (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

function formatDuration(totalSec) {
  const s = Math.max(0, Math.floor(Number(totalSec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function TimerExpanded({
  elapsedSec,
  targetSec,
  unit,
  isRunning,
  onStart,
  onPause,
  onStop,
  onReset,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const ts = Math.max(1, Number(targetSec) || 1);
  const es = Math.max(0, Number(elapsedSec) || 0);
  const pct = Math.min((es / ts) * 100, 100);

  return (
    <View style={styles.expandedSection}>
      <Text style={styles.timerValue}>
        {formatDuration(es)}
        <Text style={styles.timerValueRest}>
          {' '}
          / {formatDuration(ts)}
          {unit ? ` ${unit}` : ''}
        </Text>
      </Text>
      <View style={[styles.progressBar, { marginBottom: 10 }]}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.timerControls}>
        {!isRunning ? (
          <TouchableOpacity style={styles.timerBtn} onPress={onStart} activeOpacity={0.7}>
            <Play size={16} color={Colors.onPrimary} />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.timerBtn} onPress={onPause} activeOpacity={0.7}>
              <Pause size={16} color={Colors.onPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.timerBtn} onPress={onStop} activeOpacity={0.7}>
              <Square size={16} color={Colors.onPrimary} />
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={styles.timerBtnSecondary} onPress={onReset} activeOpacity={0.7}>
          <RotateCcw size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HabitCard({
  habit,
  onToggle,
  onIncrement,
  onDecrement,
  onNumericQuickComplete,
  onSetNumericCurrent,
  onToggleChecklistItem,
  onTimerStart,
  onTimerPause,
  onTimerStop,
  onTimerReset,
  onLongPress,
  timerRunning,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [expanded, setExpanded] = useState(false);
  const [numericFocusToken, setNumericFocusToken] = useState(0);

  const numericCond = habit.type === 'numeric' ? normalizeNumericConditionType(habit) : null;
  const isAnyValueNumeric = numericCond === NUMERIC_CONDITION.ANY_VALUE;
  const numericTarget = habit.type === 'numeric' ? getNumericTargetValue(habit) : null;
  const showCompletionCheckbox = habit.type !== 'numeric' || !isAnyValueNumeric;

  const isCompleted =
    habit.type === 'yesno'
      ? habit.completed
      : habit.type === 'checklist'
        ? habit.checklistItems?.every((item) => item.completed)
        : habit.type === 'timer' || habit.type === 'numeric'
          ? habit.completed
          : false;

  const handlePress = () => {
    if (habit.type === 'yesno') {
      onToggle(habit.id);
    } else {
      setExpanded(!expanded);
    }
  };

  const handleCheckPress = () => {
    if (habit.type === 'yesno') {
      onToggle(habit.id);
      return;
    }
    if (habit.type === 'numeric' && onNumericQuickComplete) {
      onNumericQuickComplete(habit.id);
      return;
    }
    setExpanded(!expanded);
  };

  return (
    <Pressable
      style={styles.card}
      onPress={handlePress}
      onLongPress={() => onLongPress?.(habit)}
      delayLongPress={500}
    >
      <View style={styles.mainRow}>
        <View style={[styles.iconCircle, { backgroundColor: habit.iconBg || '#E8F4FD' }]}>
          {(() => {
            const IconComp = (habit.iconName && habitIconMap[habit.iconName]) || getIconForCategory(habit.category);
            return <IconComp size={20} color={habit.iconColor || Colors.textPrimary} />;
          })()}
        </View>

        <View style={styles.info}>
          <Text style={styles.habitName} numberOfLines={1}>{habit.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.habitLabel}>Habit</Text>
            <Text style={styles.categoryText}>{habit.category}</Text>
          </View>
        </View>

        {habit.type === 'numeric' ? (
          <TouchableOpacity
            onPress={() => {
              setExpanded(true);
              setNumericFocusToken((t) => t + 1);
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Edit habit value"
          >
            <Text
              style={[
                styles.anyValueSummary,
                {
                  color:
                    isAnyValueNumeric && !habit.numericDayHasEntry
                      ? Colors.textTertiary
                      : Colors.textPrimary,
                },
              ]}
              numberOfLines={1}
            >
              {isAnyValueNumeric ? (
                <>
                  {habit.numericDayHasEntry ? String(habit.current ?? 0) : '—'}
                  {habit.unit ? ` ${habit.unit}` : ''}
                </>
              ) : (
                <>
                  {String(habit.current ?? 0)}
                  {numericTarget != null ? ` / ${numericTarget}` : ''}
                  {habit.unit ? ` ${habit.unit}` : ''}
                </>
              )}
            </Text>
          </TouchableOpacity>
        ) : null}

        {showCompletionCheckbox ? (
          <TouchableOpacity
            style={[styles.checkbox, isCompleted && styles.checkboxDone]}
            onPress={handleCheckPress}
            activeOpacity={0.7}
          >
            {isCompleted && <Check size={18} color={Colors.onPrimary} />}
          </TouchableOpacity>
        ) : null}
      </View>

      {expanded && habit.type === 'numeric' && (
        <NumericExpanded
          habitForNumeric={habit}
          current={habit.current}
          target={habit.target}
          completed={habit.completed}
          unit={habit.unit}
          numericDayHasEntry={isAnyValueNumeric ? !!habit.numericDayHasEntry : true}
          focusEditToken={numericFocusToken}
          onIncrement={() => onIncrement(habit.id)}
          onDecrement={() => onDecrement(habit.id)}
          onSetNumericCurrent={
            onSetNumericCurrent ? (value) => onSetNumericCurrent(habit.id, value) : undefined
          }
        />
      )}

      {expanded && habit.type === 'timer' && (
        <TimerExpanded
          elapsedSec={habit._timerElapsedSec ?? 0}
          targetSec={habit._timerTargetSec ?? timerTargetToSeconds(habit)}
          unit={habit.unit}
          isRunning={timerRunning}
          onStart={() => onTimerStart(habit.id)}
          onPause={() => onTimerPause?.(habit.id)}
          onStop={() => onTimerStop(habit.id)}
          onReset={() => onTimerReset(habit.id)}
        />
      )}

      {expanded && habit.type === 'checklist' && habit.checklistItems && (
        <ChecklistExpanded
          items={habit.checklistItems}
          onToggleItem={(itemId) => onToggleChecklistItem(habit.id, itemId)}
        />
      )}
    </Pressable>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    padding: 14,
    marginBottom: 10,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  habitLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.primary,
  },
  categoryText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  anyValueSummary: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    maxWidth: 120,
    textAlign: 'right',
    marginLeft: 8,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkboxDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  numericRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  numericBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numericValueBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  numericValue: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  numericValueRest: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  numericInput: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    minWidth: 100,
    maxWidth: 200,
    paddingVertical: 6,
    paddingHorizontal: 10,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  timerValue: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  timerValueRest: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  timerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  timerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerBtnSecondary: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checklistBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklistBoxDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checklistText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  checklistTextDone: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
  },
});
