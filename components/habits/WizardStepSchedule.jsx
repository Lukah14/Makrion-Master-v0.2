import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, StyleSheet } from 'react-native';
import { CalendarDays, Bell, Flag } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const FREQUENCY_OPTIONS = [
  { id: 'daily', label: 'Every day' },
  { id: 'specific_days_week', label: 'Specific days of the week' },
  { id: 'specific_days_month', label: 'Specific days of the month' },
  { id: 'specific_days_year', label: 'Specific days of the year' },
  { id: 'some_days_period', label: 'Some days per period' },
  { id: 'repeat', label: 'Repeat' },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PRIORITY_OPTIONS = ['Low', 'Default', 'High', 'Urgent'];

function FrequencySection({ repeatRule, onRepeatRuleChange, repeatDays, onRepeatDaysChange }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const toggleDay = (dayIndex) => {
    const current = repeatDays || [];
    if (current.includes(dayIndex)) {
      onRepeatDaysChange(current.filter((d) => d !== dayIndex));
    } else {
      onRepeatDaysChange([...current, dayIndex]);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>How often do you want to do it?</Text>
      {FREQUENCY_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={styles.radioRow}
          onPress={() => onRepeatRuleChange(option.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.radio, repeatRule === option.id && styles.radioActive]}>
            {repeatRule === option.id && <View style={styles.radioDot} />}
          </View>
          <Text style={styles.radioLabel}>{option.label}</Text>
        </TouchableOpacity>
      ))}

      {repeatRule === 'specific_days_week' && (
        <View style={styles.dayPicker}>
          {DAY_LABELS.map((day, index) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayBtn,
                (repeatDays || []).includes(index + 1) && styles.dayBtnActive,
              ]}
              onPress={() => toggleDay(index + 1)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayBtnText,
                  (repeatDays || []).includes(index + 1) && styles.dayBtnTextActive,
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function ScheduleSection({
  startDate,
  endDateEnabled,
  onEndDateEnabledChange,
  endDateDays,
  onEndDateDaysChange,
  priority,
  onPriorityChange,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const formatDate = () => {
    if (!endDateDays) return '';
    const d = new Date();
    d.setDate(d.getDate() + (parseInt(endDateDays) || 0));
    return `${String(d.getDate()).padStart(2, '0')}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${d.getFullYear()}.`;
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>When do you want to do it?</Text>

      <View style={styles.settingRow}>
        <CalendarDays size={20} color={Colors.error} />
        <Text style={styles.settingLabel}>Start date</Text>
        <View style={styles.settingValue}>
          <Text style={styles.settingValueText}>Today</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.settingRow}>
        <CalendarDays size={20} color={Colors.error} />
        <Text style={styles.settingLabel}>End date</Text>
        <Switch
          value={endDateEnabled}
          onValueChange={onEndDateEnabledChange}
          trackColor={{ false: Colors.innerBorder, true: Colors.error }}
          thumbColor={Colors.textWhite}
        />
      </View>

      {endDateEnabled && (
        <View style={styles.endDateDetails}>
          <View style={styles.dateChip}>
            <Text style={styles.dateChipText}>{formatDate()}</Text>
          </View>
          <View style={styles.daysInputRow}>
            <TextInput
              style={styles.daysInput}
              value={endDateDays}
              onChangeText={onEndDateDaysChange}
              keyboardType="numeric"
              placeholder="60"
              placeholderTextColor={Colors.textSecondary}
            />
            <Text style={styles.daysLabel}>days.</Text>
          </View>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.settingRow}>
        <Bell size={20} color={Colors.error} />
        <Text style={styles.settingLabel}>Time and reminders</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>0</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.settingRow}>
        <Flag size={20} color={Colors.error} />
        <Text style={styles.settingLabel}>Priority</Text>
        <TouchableOpacity style={styles.priorityChip} activeOpacity={0.7}>
          <Text style={styles.priorityChipText}>{priority || 'Default'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function WizardStepSchedule({
  repeatRule,
  onRepeatRuleChange,
  repeatDays,
  onRepeatDaysChange,
  endDateEnabled,
  onEndDateEnabledChange,
  endDateDays,
  onEndDateDaysChange,
  priority,
  onPriorityChange,
  showScheduleDetails,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {!showScheduleDetails ? (
        <FrequencySection
          repeatRule={repeatRule}
          onRepeatRuleChange={onRepeatRuleChange}
          repeatDays={repeatDays}
          onRepeatDaysChange={onRepeatDaysChange}
        />
      ) : (
        <ScheduleSection
          endDateEnabled={endDateEnabled}
          onEndDateEnabledChange={onEndDateEnabledChange}
          endDateDays={endDateDays}
          onEndDateDaysChange={onEndDateDaysChange}
          priority={priority}
          onPriorityChange={onPriorityChange}
        />
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 28,
    marginTop: 10,
    lineHeight: 30,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: Colors.error,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.error,
  },
  radioLabel: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  dayPicker: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  dayBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.innerBorder,
  },
  dayBtnActive: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  dayBtnText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
  },
  dayBtnTextActive: {
    color: Colors.textWhite,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  settingValue: {
    backgroundColor: Colors.error + '15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  settingValueText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  endDateDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 36,
  },
  dateChip: {
    backgroundColor: Colors.error + '15',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dateChipText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.error,
  },
  daysInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daysInput: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.innerBorder,
    paddingVertical: 4,
    minWidth: 50,
    textAlign: 'center',
  },
  daysLabel: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  countBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.innerBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  priorityChip: {
    backgroundColor: Colors.error + '15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  priorityChipText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.error,
  },
});
