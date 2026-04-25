import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, TextInput, Keyboard, Modal } from 'react-native';
import { Check, Plus, Minus, Play, Pause, Square, RotateCcw, Pencil } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { HabitCategoryIcon } from './habitIconMap';
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
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function HHMMEditInput({ initialSec, onSave, onCancel }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const initMin = Math.floor(Math.max(0, Number(initialSec) || 0) / 60);
  const [hStr, setHStr] = useState(String(Math.floor(initMin / 60)));
  const [mStr, setMStr] = useState(String(initMin % 60));
  const [mError, setMError] = useState(false);

  const handleSave = () => {
    const h = Math.max(0, parseInt(hStr, 10) || 0);
    const m = parseInt(mStr, 10) || 0;
    if (m > 59) { setMError(true); return; }
    onSave((h * 60 + m) * 60);
  };

  return (
    <View style={styles.editInputWrap}>
      <Text style={styles.editModalTitle}>Set completed time</Text>
      <View style={styles.editHHMM}>
        <View style={styles.editFieldWrap}>
          <TextInput
            style={styles.editField}
            value={hStr}
            onChangeText={(t) => setHStr(t.replace(/\D/g, ''))}
            keyboardType="number-pad"
            maxLength={3}
            selectTextOnFocus
          />
          <Text style={styles.editUnit}>HH</Text>
        </View>
        <Text style={styles.editColon}>:</Text>
        <View style={styles.editFieldWrap}>
          <TextInput
            style={[styles.editField, mError && styles.editFieldError]}
            value={mStr}
            onChangeText={(t) => { setMStr(t.replace(/\D/g, '')); setMError(false); }}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
          <Text style={styles.editUnit}>MM</Text>
        </View>
      </View>
      {mError && <Text style={styles.editError}>Minutes must be 0–59</Text>}
      <TouchableOpacity style={styles.editSaveBtn} onPress={handleSave} activeOpacity={0.8}>
        <Text style={styles.editSaveBtnText}>Save</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.editCancelBtn} onPress={onCancel} activeOpacity={0.8}>
        <Text style={styles.editCancelBtnText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

function TimerExpanded({
  elapsedSec,
  targetSec,
  isRunning,
  onStart,
  onPause,
  onStop,
  onReset,
  onEditSave,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [editOpen, setEditOpen] = useState(false);
  const ts = Math.max(1, Number(targetSec) || 1);
  const es = Math.max(0, Number(elapsedSec) || 0);
  const pct = Math.min((es / ts) * 100, 100);

  return (
    <View style={styles.expandedSection}>
      <Text style={styles.timerValue}>
        {formatDuration(es)}
        <Text style={styles.timerValueRest}>{' / '}{formatDuration(ts)}</Text>
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
        {onEditSave && (
          <TouchableOpacity
            style={styles.timerBtnSecondary}
            onPress={() => setEditOpen(true)}
            activeOpacity={0.7}
          >
            <Pencil size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={editOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setEditOpen(false)}
      >
        <Pressable style={styles.editOverlay} onPress={() => setEditOpen(false)}>
          <Pressable style={styles.editSheet} onPress={() => {}}>
            <HHMMEditInput
              initialSec={es}
              onSave={(sec) => { onEditSave(sec); setEditOpen(false); }}
              onCancel={() => setEditOpen(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
  onTimerEditSave,
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
          <HabitCategoryIcon iconName={habit.iconName} category={habit.category} size={20} />
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
          isRunning={timerRunning}
          onStart={() => onTimerStart(habit.id)}
          onPause={() => onTimerPause?.(habit.id)}
          onStop={() => onTimerStop(habit.id)}
          onReset={() => onTimerReset(habit.id)}
          onEditSave={onTimerEditSave ? (sec) => onTimerEditSave(habit.id, sec) : undefined}
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
  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  editSheet: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  editInputWrap: {
    alignItems: 'center',
  },
  editModalTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  editHHMM: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  editFieldWrap: {
    alignItems: 'center',
    gap: 4,
  },
  editField: {
    width: 72,
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.background,
    fontSize: 26,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    padding: 0,
  },
  editFieldError: {
    borderColor: Colors.error || '#E53935',
  },
  editUnit: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  editColon: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  editError: {
    fontSize: 12,
    color: Colors.error || '#E53935',
    marginBottom: 12,
    textAlign: 'center',
  },
  editSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 32,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  editSaveBtnText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.onPrimary,
  },
  editCancelBtn: {
    paddingVertical: 10,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  editCancelBtnText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textSecondary,
  },
});
