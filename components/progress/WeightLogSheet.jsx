import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Scale, CalendarDays, AlertCircle, ChevronRight, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { todayDateKey } from '@/lib/dateKey';
import { yearMonthFromDateKey } from '@/lib/calendarUtils';
import MonthlyCalendar from '@/components/calendar/MonthlyCalendar';

function formatDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function parseWeightInput(str) {
  const t = String(str ?? '').replace(',', '.').trim();
  if (!t) return NaN;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * @param {Object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onClose
 * @param {string} props.defaultDateKey  YYYY-MM-DD (e.g. selected app day)
 * @param {'add'|'edit'} props.mode
 * @param {{ dateKey: string, weightKg: number }|null} props.editingEntry  required when mode=edit
 * @param {(args: { weightKg: number, dateKey: string }) => Promise<void>} props.onSave
 * @param {(dateKey: string) => Promise<void>} [props.onDelete]
 */
export default function WeightLogSheet({
  visible,
  onClose,
  defaultDateKey,
  mode = 'add',
  editingEntry = null,
  onSave,
  onDelete,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [weight, setWeight] = useState('');
  const [dateKey, setDateKey] = useState(defaultDateKey || todayDateKey());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => yearMonthFromDateKey(defaultDateKey || todayDateKey()).year);
  const [viewMonth, setViewMonth] = useState(() => yearMonthFromDateKey(defaultDateKey || todayDateKey()).monthIndex);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setError('');
    if (mode === 'edit' && editingEntry) {
      setDateKey(editingEntry.dateKey);
      setWeight(String(editingEntry.weightKg));
    } else {
      setDateKey(defaultDateKey || todayDateKey());
      setWeight('');
    }
  }, [visible, mode, editingEntry?.dateKey, editingEntry?.weightKg, defaultDateKey]);

  useEffect(() => {
    if (!visible) return;
    const { year, monthIndex } = yearMonthFromDateKey(dateKey);
    setViewYear(year);
    setViewMonth(monthIndex);
  }, [visible, dateKey]);

  const handleClose = () => {
    setWeight('');
    setError('');
    setCalendarOpen(false);
    onClose();
  };

  const validateAndSave = async () => {
    setError('');
    const val = parseWeightInput(weight);
    if (!String(weight).trim() || !Number.isFinite(val)) {
      setError('Enter a valid weight.');
      return;
    }
    if (val <= 0 || val > 500) {
      setError('Weight must be between 0 and 500 kg.');
      return;
    }

    setSaving(true);
    try {
      await onSave({ weightKg: val, dateKey });
      setWeight('');
      handleClose();
    } catch (e) {
      setError(e?.message || 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete || mode !== 'edit' || !editingEntry) return;
    Alert.alert('Delete entry?', `Remove weigh-in for ${editingEntry.dateKey}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await onDelete(editingEntry.dateKey);
            handleClose();
          } catch (e) {
            setError(e?.message || 'Could not delete.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const onSelectCalendarDay = useCallback((k) => {
    setDateKey(k);
    setCalendarOpen(false);
  }, []);

  const goPrev = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  }, [viewMonth]);

  const goNext = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  }, [viewMonth]);

  const title = mode === 'edit' ? 'Edit weight' : 'Log weight';
  const subtitle = mode === 'edit' ? 'Update this weigh-in' : 'Save your body weight for a day';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => setCalendarOpen(true)}
            activeOpacity={0.7}
          >
            <CalendarDays size={18} color={Colors.textTertiary} />
            <View style={styles.dateRowText}>
              <Text style={styles.dateLabel}>Date</Text>
              <Text style={styles.dateText}>{formatDisplay(dateKey)}</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.inputSection}>
            <View style={styles.inputRow}>
              <Scale size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={(t) => {
                  setWeight(t);
                  setError('');
                }}
                placeholder="e.g. 71.4"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
                autoFocus={mode === 'add'}
                selectionColor={Colors.textPrimary}
                returnKeyType="done"
                onSubmitEditing={validateAndSave}
              />
              <Text style={styles.unitLabel}>kg</Text>
            </View>

            {error ? (
              <View style={styles.errorRow}>
                <AlertCircle size={14} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={validateAndSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.cardBackground} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>{mode === 'edit' ? 'Save changes' : 'Save entry'}</Text>
            )}
          </TouchableOpacity>

          {mode === 'edit' && onDelete ? (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
              <Trash2 size={18} color={Colors.error} />
              <Text style={styles.deleteBtnText}>Delete entry</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>

      <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
        <Pressable style={styles.calOverlay} onPress={() => setCalendarOpen(false)}>
          <Pressable style={styles.calSheet} onPress={() => {}}>
            <Text style={styles.calTitle}>Choose date</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <MonthlyCalendar
                year={viewYear}
                monthIndex={viewMonth}
                selectedDateKey={dateKey}
                onSelectDay={onSelectCalendarDay}
                onPrevMonth={goPrev}
                onNextMonth={goNext}
                monthMeta={{}}
                loading={false}
              />
            </ScrollView>
            <TouchableOpacity style={styles.calDone} onPress={() => setCalendarOpen(false)}>
              <Text style={styles.calDoneText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginBottom: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateRowText: { flex: 1 },
  dateLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    paddingVertical: 14,
  },
  unitLabel: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.error,
  },
  saveBtn: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.onPrimary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginBottom: 6,
  },
  deleteBtnText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.error,
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  calOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  calSheet: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  calTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  calDone: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.textPrimary,
    borderRadius: 14,
  },
  calDoneText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.onPrimary,
  },
});
