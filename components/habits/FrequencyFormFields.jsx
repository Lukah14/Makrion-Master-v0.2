import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { clampMonthDay } from '@/lib/habitFrequency';

export const FREQUENCY_OPTIONS = [
  { id: 'daily', label: 'Every day' },
  { id: 'specific_days_week', label: 'Specific days of the week' },
  { id: 'specific_days_month', label: 'Specific days of the month' },
  { id: 'specific_days_year', label: 'Specific days of the year' },
  { id: 'some_days_period', label: 'Some days per period' },
  { id: 'repeat', label: 'Repeat' },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTH_OPTIONS = [
  { m: 1, label: 'Jan' },
  { m: 2, label: 'Feb' },
  { m: 3, label: 'Mar' },
  { m: 4, label: 'Apr' },
  { m: 5, label: 'May' },
  { m: 6, label: 'Jun' },
  { m: 7, label: 'Jul' },
  { m: 8, label: 'Aug' },
  { m: 9, label: 'Sep' },
  { m: 10, label: 'Oct' },
  { m: 11, label: 'Nov' },
  { m: 12, label: 'Dec' },
];

/**
 * Shared frequency UI (create + edit habit). Month labels are English abbreviations only.
 */
export default function HabitFrequencyFormFields({
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
  /** When false, omit top title (e.g. inside modal that has its own header) */
  showTitle = true,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [pickMonth, setPickMonth] = useState(1);
  const [pickDay, setPickDay] = useState(1);

  const toggleDay = (dayIndex) => {
    const current = repeatDays || [];
    if (current.includes(dayIndex)) {
      onRepeatDaysChange(current.filter((d) => d !== dayIndex));
    } else {
      onRepeatDaysChange([...current, dayIndex].sort((a, b) => a - b));
    }
  };

  const toggleMonthDay = (dom) => {
    const current = repeatDays || [];
    if (current.includes(dom)) {
      onRepeatDaysChange(current.filter((d) => d !== dom));
    } else {
      onRepeatDaysChange([...current, dom].sort((a, b) => a - b));
    }
  };

  const addYearlyDate = () => {
    const dNum = pickDay === '' || pickDay == null ? 1 : Number(pickDay);
    const { month, day } = clampMonthDay(pickMonth, dNum);
    const key = `${month}-${day}`;
    const exists = (yearlyDates || []).some((p) => `${p.month}-${p.day}` === key);
    if (exists) {
      Alert.alert('Already added', 'This date is already in the list.');
      return;
    }
    onYearlyDatesChange([...(yearlyDates || []), { month, day }].sort((a, b) =>
      a.month !== b.month ? a.month - b.month : a.day - b.day,
    ));
  };

  const removeYearlyDate = (idx) => {
    const next = [...(yearlyDates || [])];
    next.splice(idx, 1);
    onYearlyDatesChange(next);
  };

  return (
    <View style={styles.section}>
      {showTitle ? <Text style={styles.sectionTitle}>How often do you want to do it?</Text> : null}
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

      {repeatRule === 'specific_days_month' && (
        <View style={styles.monthGrid}>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((dom) => (
            <TouchableOpacity
              key={dom}
              style={[styles.monthChip, (repeatDays || []).includes(dom) && styles.monthChipActive]}
              onPress={() => toggleMonthDay(dom)}
              activeOpacity={0.7}
            >
              <Text style={[styles.monthChipText, (repeatDays || []).includes(dom) && styles.monthChipTextActive]}>
                {dom}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {repeatRule === 'specific_days_year' && (
        <View style={styles.yearBlock}>
          <Text style={styles.subLabel}>Add a date (month + day, repeats every year)</Text>
          <View style={styles.yearPickRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
              {MONTH_OPTIONS.map(({ m, label }) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.monthPickChip, pickMonth === m && styles.monthPickChipActive]}
                  onPress={() => setPickMonth(m)}
                >
                  <Text style={[styles.monthPickText, pickMonth === m && styles.monthPickTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.dayPickRow}>
            <Text style={styles.inlineLbl}>Day</Text>
            <TextInput
              style={styles.smallNumInput}
              value={String(pickDay)}
              onChangeText={(t) => {
                const n = parseInt(t.replace(/\D/g, ''), 10);
                if (t === '') setPickDay('');
                else if (Number.isFinite(n)) setPickDay(Math.min(31, Math.max(1, n)));
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <TouchableOpacity style={styles.addYearBtn} onPress={addYearlyDate} activeOpacity={0.8}>
            <Text style={styles.addYearBtnText}>Add date</Text>
          </TouchableOpacity>
          {(yearlyDates || []).map((p, idx) => (
            <View key={`${p.month}-${p.day}-${idx}`} style={styles.yearListRow}>
              <Text style={styles.yearListText}>
                {MONTH_OPTIONS.find((x) => x.m === p.month)?.label} {p.day}
              </Text>
              <TouchableOpacity onPress={() => removeYearlyDate(idx)} hitSlop={8}>
                <Text style={styles.removeLink}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {repeatRule === 'some_days_period' && (
        <View style={styles.periodBlock}>
          <Text style={styles.subLabel}>How many days per period?</Text>
          <TextInput
            style={styles.periodInputWide}
            value={cadenceCount === '' || cadenceCount == null ? '' : String(cadenceCount)}
            onChangeText={(t) => {
              const n = parseInt(t.replace(/\D/g, ''), 10);
              if (t === '') onCadenceCountChange('');
              else if (Number.isFinite(n)) onCadenceCountChange(Math.min(366, Math.max(1, n)));
            }}
            keyboardType="number-pad"
          />
          <Text style={[styles.subLabel, { marginTop: 12 }]}>Period</Text>
          <View style={styles.periodUnitRow}>
            {[
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
              { id: 'year', label: 'Year' },
            ].map(({ id, label }) => (
              <TouchableOpacity
                key={id}
                style={[styles.periodUnitBtn, cadenceUnit === id && styles.periodUnitBtnActive]}
                onPress={() => onCadenceUnitChange(id)}
              >
                <Text style={[styles.periodUnitText, cadenceUnit === id && styles.periodUnitTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {repeatRule === 'repeat' && (
        <View style={styles.periodBlock}>
          <Text style={styles.subLabel}>Repeat every (days)</Text>
          <TextInput
            style={styles.periodInputWide}
            value={intervalEvery === '' || intervalEvery == null ? '' : String(intervalEvery)}
            onChangeText={(t) => {
              const n = parseInt(t.replace(/\D/g, ''), 10);
              if (t === '') onIntervalEveryChange('');
              else if (Number.isFinite(n)) onIntervalEveryChange(Math.min(365, Math.max(1, n)));
            }}
            keyboardType="number-pad"
          />
          <Text style={styles.hintMuted}>Counted from your start date (e.g. every 2 days).</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (Colors) =>
  StyleSheet.create({
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
    subLabel: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textSecondary,
      marginTop: 8,
      marginBottom: 6,
    },
    hintMuted: {
      fontSize: 12,
      color: Colors.textTertiary,
      marginTop: 8,
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
    radioActive: { borderColor: Colors.error },
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
      flex: 1,
    },
    dayPicker: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
    dayBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: Colors.innerBorder,
    },
    dayBtnActive: { backgroundColor: Colors.error, borderColor: Colors.error },
    dayBtnText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textTertiary },
    dayBtnTextActive: { color: Colors.textWhite },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    monthChip: {
      width: 40,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: Colors.innerBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthChipActive: { backgroundColor: Colors.error, borderColor: Colors.error },
    monthChipText: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans-SemiBold' },
    monthChipTextActive: { color: Colors.textWhite },
    yearBlock: { marginTop: 8 },
    yearPickRow: { marginBottom: 8 },
    monthScroll: { maxHeight: 44 },
    monthPickChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Colors.innerBorder,
      marginRight: 6,
    },
    monthPickChipActive: { backgroundColor: Colors.error, borderColor: Colors.error },
    monthPickText: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans-SemiBold' },
    monthPickTextActive: { color: Colors.textWhite },
    dayPickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    inlineLbl: { fontSize: 14, color: Colors.textSecondary },
    smallNumInput: {
      borderBottomWidth: 1,
      borderBottomColor: Colors.innerBorder,
      minWidth: 48,
      fontSize: 18,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
      paddingVertical: 4,
      textAlign: 'center',
    },
    addYearBtn: {
      backgroundColor: Colors.error,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: 'center',
      marginBottom: 12,
    },
    addYearBtnText: { color: Colors.textWhite, fontFamily: 'PlusJakartaSans-Bold', fontSize: 15 },
    yearListRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors.divider,
    },
    yearListText: { fontSize: 15, color: Colors.textPrimary, fontFamily: 'PlusJakartaSans-Medium' },
    removeLink: { fontSize: 14, color: Colors.error, fontFamily: 'PlusJakartaSans-SemiBold' },
    periodBlock: { marginTop: 8 },
    periodInputWide: {
      borderWidth: 1,
      borderColor: Colors.innerBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 18,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    periodUnitRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    periodUnitBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.innerBorder,
      alignItems: 'center',
    },
    periodUnitBtnActive: { backgroundColor: Colors.error, borderColor: Colors.error },
    periodUnitText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textSecondary },
    periodUnitTextActive: { color: Colors.textWhite },
  });
