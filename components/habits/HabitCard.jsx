import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Check, Plus, Minus, Play, Square, RotateCcw, Flame } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { habitIconMap, getIconForCategory } from './habitIconMap';

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

function NumericExpanded({ current, target, unit, onIncrement, onDecrement }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <View style={styles.expandedSection}>
      <View style={styles.numericRow}>
        <TouchableOpacity style={styles.numericBtn} onPress={onDecrement} activeOpacity={0.7}>
          <Minus size={16} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.numericValue}>
          {current} / {target} {unit}
        </Text>
        <TouchableOpacity style={styles.numericBtn} onPress={onIncrement} activeOpacity={0.7}>
          <Plus size={16} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min((current / target) * 100, 100)}%` },
          ]}
        />
      </View>
    </View>
  );
}

function TimerExpanded({ current, target, unit, isRunning, onStart, onStop, onReset }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <View style={styles.expandedSection}>
      <Text style={styles.timerValue}>
        {current} / {target} {unit}
      </Text>
      <View style={styles.timerControls}>
        {!isRunning ? (
          <TouchableOpacity style={styles.timerBtn} onPress={onStart} activeOpacity={0.7}>
            <Play size={16} color={Colors.onPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.timerBtn} onPress={onStop} activeOpacity={0.7}>
            <Square size={16} color={Colors.onPrimary} />
          </TouchableOpacity>
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
  onToggleChecklistItem,
  onTimerStart,
  onTimerStop,
  onTimerReset,
  onLongPress,
  timerRunning,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [expanded, setExpanded] = useState(false);

  const isCompleted =
    habit.type === 'yesno'
      ? habit.completed
      : habit.type === 'checklist'
        ? habit.checklistItems?.every((item) => item.completed)
        : habit.current >= habit.target;

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
    } else {
      setExpanded(!expanded);
    }
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

        <TouchableOpacity
          style={[styles.checkbox, isCompleted && styles.checkboxDone]}
          onPress={handleCheckPress}
          activeOpacity={0.7}
        >
          {isCompleted && <Check size={18} color={Colors.onPrimary} />}
        </TouchableOpacity>
      </View>

      {expanded && habit.type === 'numeric' && (
        <NumericExpanded
          current={habit.current}
          target={habit.target}
          unit={habit.unit}
          onIncrement={() => onIncrement(habit.id)}
          onDecrement={() => onDecrement(habit.id)}
        />
      )}

      {expanded && habit.type === 'timer' && (
        <TimerExpanded
          current={habit.current}
          target={habit.target}
          unit={habit.unit}
          isRunning={timerRunning}
          onStart={() => onTimerStart(habit.id)}
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
  numericValue: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    minWidth: 100,
    textAlign: 'center',
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
    marginBottom: 10,
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
