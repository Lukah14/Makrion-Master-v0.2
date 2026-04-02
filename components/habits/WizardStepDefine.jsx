import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ChevronDown, Check, Plus, X, Target, Clock } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const NUMERIC_CONDITIONS = ['At least', 'Less than', 'Exactly', 'Any value'];
const TIMER_CONDITIONS = ['At least', 'Less than', 'Any value'];

function FloatingInput({ label, value, onChangeText, keyboardType, autoFocus, style }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [focused, setFocused] = useState(false);
  const hasValue = value && value.length > 0;
  const showLabel = focused || hasValue;

  return (
    <View style={[styles.floatOuter, focused && styles.floatOuterFocused, style]}>
      {showLabel && <Text style={styles.floatLabel}>{label}</Text>}
      <TextInput
        style={styles.floatInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={showLabel ? '' : label}
        placeholderTextColor={Colors.textTertiary}
        keyboardType={keyboardType || 'default'}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

function ConditionDropdown({ value, onChange, options, fullWidth }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.dropdownWrapper, fullWidth && styles.dropdownWrapperFull]}>
      <TouchableOpacity
        style={[styles.dropdownTrigger, open && styles.dropdownTriggerOpen]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownValue}>{value}</Text>
        <ChevronDown size={18} color={Colors.error} />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownList}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.dropdownItem, option === options[options.length - 1] && styles.dropdownItemLast]}
              onPress={() => { onChange(option); setOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownItemText, option === value && styles.dropdownItemActive]}>
                {option}
              </Text>
              {option === value && <Check size={16} color={Colors.error} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function TimeInput({ value, onChange }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [focused, setFocused] = useState(false);

  const handleChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) onChange(digits);
    else onChange(`${digits.slice(0, 2)}:${digits.slice(2)}`);
  };

  return (
    <View style={[styles.timeBox, focused && styles.timeBoxFocused]}>
      <TextInput
        style={styles.timeInput}
        value={value || '00:00'}
        onChangeText={handleChange}
        keyboardType="numeric"
        maxLength={5}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectTextOnFocus
      />
    </View>
  );
}

function ExtraGoalsSection({ goals, onChange }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [expanded, setExpanded] = useState(false);
  const activeCount = goals.filter((g) => g.value && g.value.trim()).length;

  const updateGoal = (idx, val) => {
    onChange(goals.map((g, i) => (i === idx ? { ...g, value: val } : g)));
  };

  return (
    <View style={styles.extraCard}>
      <TouchableOpacity style={styles.extraHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View style={styles.extraLeft}>
          <View style={styles.extraIconCircle}>
            <Target size={18} color={Colors.error} />
          </View>
          <Text style={styles.extraLabel}>Extra goals</Text>
        </View>
        <View style={styles.extraBadge}>
          <Text style={styles.extraBadgeText}>{activeCount}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.extraList}>
          {goals.map((goal, idx) => (
            <View key={idx} style={[styles.extraRow, idx === goals.length - 1 && styles.extraRowLast]}>
              <Text style={styles.extraRowLabel}>{goal.label}</Text>
              <TextInput
                style={styles.extraRowInput}
                value={goal.value}
                onChangeText={(v) => updateGoal(idx, v)}
                placeholder="—"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                textAlign="right"
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function WizardStepDefine({
  habitName,
  onNameChange,
  description,
  onDescriptionChange,
  habitType,
  targetValue,
  onTargetValueChange,
  targetUnit,
  onTargetUnitChange,
  timerValue,
  onTimerValueChange,
  condition,
  onConditionChange,
  extraGoals,
  onExtraGoalsChange,
  checklistItems,
  onChecklistItemsChange,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const addChecklistItem = () => {
    onChecklistItemsChange([...(checklistItems || []), { id: `new-${Date.now()}`, text: '', completed: false }]);
  };

  const updateChecklistItem = (id, text) => {
    onChecklistItemsChange((checklistItems || []).map((item) => item.id === id ? { ...item, text } : item));
  };

  const removeChecklistItem = (id) => {
    onChecklistItemsChange((checklistItems || []).filter((item) => item.id !== id));
  };

  const conditionOptions = habitType === 'timer' ? TIMER_CONDITIONS : NUMERIC_CONDITIONS;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Define your habit</Text>

      {habitType === 'yesno' && (
        <>
          <FloatingInput label="Habit" value={habitName} onChangeText={onNameChange} autoFocus />
          <Text style={styles.hint}>e.g., Limit junk food consumption.</Text>
          <FloatingInput
            label="Description (optional)"
            value={description}
            onChangeText={onDescriptionChange}
            style={styles.mt16}
          />
        </>
      )}

      {habitType === 'numeric' && (
        <>
          <FloatingInput label="Habit" value={habitName} onChangeText={onNameChange} autoFocus />

          <View style={styles.conditionRow}>
            <ConditionDropdown
              value={condition}
              onChange={onConditionChange}
              options={conditionOptions}
            />
            {condition !== 'Any value' ? (
              <FloatingInput
                label="Goal"
                value={targetValue}
                onChangeText={onTargetValueChange}
                keyboardType="numeric"
                style={styles.goalInput}
              />
            ) : (
              <View style={[styles.goalInput, styles.anyBox]}>
                <Text style={styles.anyBoxText}>any amount</Text>
              </View>
            )}
          </View>

          <View style={styles.unitRow}>
            <FloatingInput
              label="Unit (optional)"
              value={targetUnit}
              onChangeText={onTargetUnitChange}
              style={styles.unitInput}
            />
            <Text style={styles.perDay}>a day.</Text>
          </View>

          <Text style={styles.hint}>
            {condition === 'Any value'
              ? `e.g., Drink water. Any value of ${targetUnit || 'glasses'} a day.`
              : `e.g., Drink water. ${condition} ${targetValue || '8'} ${targetUnit || 'glasses'} a day.`}
          </Text>

          <FloatingInput
            label="Description (optional)"
            value={description}
            onChangeText={onDescriptionChange}
            style={styles.mt16}
          />

          <ExtraGoalsSection goals={extraGoals || []} onChange={onExtraGoalsChange} />
        </>
      )}

      {habitType === 'timer' && (
        <>
          <FloatingInput label="Habit" value={habitName} onChangeText={onNameChange} autoFocus />

          <View style={styles.mt16}>
            <ConditionDropdown
              value={condition}
              onChange={onConditionChange}
              options={conditionOptions}
              fullWidth
            />
          </View>

          <View style={styles.timerRow}>
            {condition !== 'Any value' ? (
              <TimeInput value={timerValue} onChange={onTimerValueChange} />
            ) : (
              <View style={styles.anyTimerBox}>
                <Clock size={15} color={Colors.textTertiary} />
                <Text style={styles.anyTimerText}>any duration</Text>
              </View>
            )}
            <Text style={styles.perDay}>a day.</Text>
          </View>

          <Text style={styles.hint}>
            {condition === 'Any value'
              ? 'e.g., Meditate. Any amount of time a day.'
              : `e.g., Meditate. ${condition} 20 minutes a day.`}
          </Text>

          <FloatingInput
            label="Description (optional)"
            value={description}
            onChangeText={onDescriptionChange}
            style={styles.mt16}
          />

          <ExtraGoalsSection goals={extraGoals || []} onChange={onExtraGoalsChange} />
        </>
      )}

      {habitType === 'checklist' && (
        <>
          <FloatingInput label="Habit" value={habitName} onChangeText={onNameChange} autoFocus />
          <Text style={styles.hint}>e.g., Complete your morning routine.</Text>

          <FloatingInput
            label="Description (optional)"
            value={description}
            onChangeText={onDescriptionChange}
            style={styles.mt16}
          />

          <View style={styles.checklistSection}>
            <Text style={styles.checklistTitle}>Checklist Items</Text>
            {(checklistItems || []).map((item, index) => (
              <View key={item.id} style={styles.checklistRow}>
                <Text style={styles.checklistIndex}>{index + 1}.</Text>
                <FloatingInput
                  label={`Item ${index + 1}`}
                  value={item.text}
                  onChangeText={(text) => updateChecklistItem(item.id, text)}
                  style={{ flex: 1 }}
                />
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeChecklistItem(item.id)} activeOpacity={0.7}>
                  <X size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addItemBtn} onPress={addChecklistItem} activeOpacity={0.7}>
              <Plus size={16} color={Colors.error} />
              <Text style={styles.addItemText}>Add item</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 4,
  },
  hint: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  mt16: { marginTop: 16 },

  floatOuter: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: Colors.innerCard,
    minHeight: 56,
    justifyContent: 'center',
  },
  floatOuterFocused: { borderColor: Colors.error },
  floatLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.error,
    marginBottom: 2,
  },
  floatInput: {
    fontSize: 16,
    color: Colors.textPrimary,
    padding: 0,
  },

  conditionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  goalInput: { flex: 1 },
  anyBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.innerCard,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 56,
  },
  anyBoxText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },

  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  unitInput: { flex: 1 },
  perDay: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans-Medium',
  },

  dropdownWrapper: {
    flex: 1,
    zIndex: 10,
  },
  dropdownWrapperFull: {
    flex: undefined,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.innerCard,
    minHeight: 56,
  },
  dropdownTriggerOpen: { borderColor: Colors.error },
  dropdownValue: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  dropdownList: {
    position: 'absolute',
    top: 62,
    left: 0,
    right: 0,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 30,
    zIndex: 999,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  dropdownItemLast: { borderBottomWidth: 0 },
  dropdownItemText: {
    fontSize: 17,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  dropdownItemActive: {
    color: Colors.error,
    fontFamily: 'PlusJakartaSans-Bold',
  },

  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 14,
  },
  timeBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.innerCard,
    alignItems: 'center',
    minWidth: 120,
  },
  timeBoxFocused: { borderColor: Colors.error },
  timeInput: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    padding: 0,
    letterSpacing: 3,
  },
  anyTimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.innerCard,
  },
  anyTimerText: {
    fontSize: 15,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },

  extraCard: {
    marginTop: 20,
    borderRadius: 14,
    backgroundColor: Colors.innerCard,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  extraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  extraLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  extraIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.error + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraLabel: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  extraBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraBadgeText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    color: Colors.textWhite,
  },
  extraList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  extraRowLast: { borderBottomWidth: 0 },
  extraRowLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  extraRowInput: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    minWidth: 80,
    padding: 0,
  },

  checklistSection: { marginTop: 20 },
  checklistTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textTertiary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  checklistIndex: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
    width: 22,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  addItemText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.error,
  },
});
