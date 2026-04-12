import {
  View,
  Text,
  TextInput,
  ScrollView,
  Switch,
  StyleSheet,
} from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import HabitFrequencyFormFields from '@/components/habits/FrequencyFormFields';

function ScheduleSection({
  endDateEnabled,
  onEndDateEnabledChange,
  endDateDays,
  onEndDateDaysChange,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const formatDate = () => {
    if (!endDateDays) return '';
    const d = new Date();
    d.setDate(d.getDate() + (parseInt(endDateDays, 10) || 0));
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
    </View>
  );
}

export default function WizardStepSchedule({
  repeatRule,
  onRepeatRuleChange,
  repeatDays,
  onRepeatDaysChange,
  yearlyDates,
  onYearlyDatesChange,
  cadenceCount,
  onCadenceCountChange,
  cadenceUnit,
  onCadenceUnitChange,
  intervalEvery,
  onIntervalEveryChange,
  endDateEnabled,
  onEndDateEnabledChange,
  endDateDays,
  onEndDateDaysChange,
  showScheduleDetails,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {!showScheduleDetails ? (
        <HabitFrequencyFormFields
          repeatRule={repeatRule}
          onRepeatRuleChange={onRepeatRuleChange}
          repeatDays={repeatDays}
          onRepeatDaysChange={onRepeatDaysChange}
          yearlyDates={yearlyDates}
          onYearlyDatesChange={onYearlyDatesChange}
          cadenceCount={cadenceCount}
          onCadenceCountChange={onCadenceCountChange}
          cadenceUnit={cadenceUnit}
          onCadenceUnitChange={onCadenceUnitChange}
          intervalEvery={intervalEvery}
          onIntervalEveryChange={onIntervalEveryChange}
          showTitle
        />
      ) : (
        <ScheduleSection
          endDateEnabled={endDateEnabled}
          onEndDateEnabledChange={onEndDateEnabledChange}
          endDateDays={endDateDays}
          onEndDateDaysChange={onEndDateDaysChange}
        />
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (Colors) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20 },
    section: { gap: 4 },
    sectionTitle: {
      fontSize: 22,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.error,
      textAlign: 'center',
      marginBottom: 28,
      marginTop: 10,
      lineHeight: 30,
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
    divider: { height: 1, backgroundColor: Colors.divider },
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
    daysInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  });
