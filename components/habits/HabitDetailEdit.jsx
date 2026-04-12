import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Pencil, Shapes, Info, CalendarDays, RotateCcw, Trash2, X, ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { habitCategories } from '@/data/mockData';
import { habitIconMap } from './habitIconMap';
import HabitFrequencyFormFields from '@/components/habits/FrequencyFormFields';
import {
  deriveFrequencyStateFromHabit,
  deriveStartEndKeysFromHabit,
  normalizeDateKeyInput,
  defaultEmojiForCategory,
  formatHabitFrequencyLabelFromState,
} from '@/lib/habitEditForm';
import { validateFrequencyFormState } from '@/lib/habitFrequency';

const ACCENT = '#E8526A';

function findCategoryByHabit(habit) {
  const name = habit?.category;
  if (!name) return null;
  return habitCategories.find((c) => c.name === name) || null;
}

export default function HabitDetailEdit({ habit, onSave, onDelete, onRestart }) {
  const { colors: Colors } = useTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [repeatRule, setRepeatRule] = useState('daily');
  const [repeatDays, setRepeatDays] = useState([]);
  const [yearlyDates, setYearlyDates] = useState([]);
  const [cadenceCount, setCadenceCount] = useState(1);
  const [cadenceUnit, setCadenceUnit] = useState('week');
  const [intervalEvery, setIntervalEvery] = useState(2);
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');

  const [editingName, setEditingName] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [frequencyModal, setFrequencyModal] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [saving, setSaving] = useState(false);

  const syncFromHabit = useCallback((h) => {
    if (!h) return;
    setName(h.name || '');
    setDescription(h.description ?? '');
    setSelectedCategory(findCategoryByHabit(h));
    const f = deriveFrequencyStateFromHabit(h);
    setRepeatRule(f.repeatRule);
    setRepeatDays(f.repeatDays);
    setYearlyDates(f.yearlyDates || []);
    setCadenceCount(f.cadenceCount);
    setCadenceUnit(f.cadenceUnit || 'week');
    setIntervalEvery(f.intervalEvery);
    const { startDateKey, endDateKey } = deriveStartEndKeysFromHabit(h);
    setStartDateStr(startDateKey);
    setEndDateStr(endDateKey || '');
  }, []);

  useEffect(() => {
    syncFromHabit(habit);
  }, [habit, syncFromHabit]);

  const displayCategories = useMemo(
    () => habitCategories.filter((c) => !['Movement', 'Mind'].includes(c.name)),
    [],
  );

  const pickCategory = (cat) => {
    setSelectedCategory(cat);
    setCategoryModal(false);
  };

  const handleRepeatRuleChange = (id) => {
    setRepeatRule(id);
    if (id !== 'specific_days_week' && id !== 'specific_days_month') setRepeatDays([]);
    if (id !== 'specific_days_year') setYearlyDates([]);
    if (id === 'some_days_period') {
      setCadenceCount(1);
      setCadenceUnit('week');
    }
    if (id === 'repeat') setIntervalEvery(2);
  };

  const buildFirestorePatch = () => {
    const cat = selectedCategory;
    const catName = cat?.name || habit.category || 'Other';
    const sk = normalizeDateKeyInput(startDateStr);
    if (!sk) {
      throw new Error('Start date must be YYYY-MM-DD.');
    }
    let endDate = null;
    const trimmedEnd = endDateStr.trim();
    if (trimmedEnd) {
      const ek = normalizeDateKeyInput(trimmedEnd);
      if (!ek) throw new Error('End date must be YYYY-MM-DD or empty.');
      endDate = ek;
    }

    return {
      id: habit.id,
      name: (name || '').trim() || habit.name || 'Habit',
      description: description.trim(),
      category: catName,
      emoji: defaultEmojiForCategory(catName),
      iconName: cat?.iconName || habit.iconName,
      iconBg: cat?.iconBgColor || habit.iconBg,
      iconColor: cat?.iconColor || habit.iconColor,
      color: cat?.iconBgColor || habit.color || habit.iconBg,
      repeatRule,
      repeatDays,
      yearlyDates,
      cadenceCount,
      cadenceUnit,
      intervalEvery,
      startDate: sk,
      endDate,
      endDateEnabled: !!endDate,
      endDateDays: null,
    };
  };

  const handleSave = async () => {
    const fv = validateFrequencyFormState({
      repeatRule,
      repeatDays,
      yearlyDates,
      cadenceCount,
      cadenceUnit,
      intervalEvery,
    });
    if (!fv.ok) {
      Alert.alert('Frequency', fv.message || 'Check your schedule options.');
      return;
    }
    let patch;
    try {
      patch = buildFirestorePatch();
    } catch (e) {
      Alert.alert('Check dates', e?.message || 'Invalid input.');
      return;
    }
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(patch);
    } catch {
      /* parent shows error */
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(habit) },
      ],
    );
  };

  const confirmRestart = () => {
    Alert.alert(
      'Restart Progress',
      'This clears all logged completions for this habit. The habit itself stays. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart', style: 'destructive', onPress: () => onRestart?.(habit) },
      ],
    );
  };

  const categoryLabel = selectedCategory?.name || habit.category || '—';
  const freqLabel = formatHabitFrequencyLabelFromState({
    repeatRule,
    repeatDays,
    yearlyDates,
    cadenceCount,
    cadenceUnit,
    intervalEvery,
  });

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.group}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => setEditingName(true)}
          activeOpacity={0.7}
        >
          <View style={styles.rowIcon}>
            <Pencil size={18} color={ACCENT} />
          </View>
          <Text style={styles.rowLabel}>Habit name</Text>
          {!editingName && <Text style={[styles.rowValue, styles.valueGray]} numberOfLines={1}>{name}</Text>}
        </TouchableOpacity>
        {editingName && (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              autoFocus
              placeholder="Habit name"
              placeholderTextColor={Colors.textTertiary}
              onBlur={() => setEditingName(false)}
              returnKeyType="done"
              onSubmitEditing={() => setEditingName(false)}
            />
            <TouchableOpacity onPress={() => { setName(''); }} style={styles.clearBtn}>
              <X size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => setCategoryModal(true)} activeOpacity={0.7}>
          <View style={styles.rowIcon}>
            <Shapes size={18} color={ACCENT} />
          </View>
          <Text style={styles.rowLabel}>Category</Text>
          <Text style={[styles.rowValue, styles.valueGreen]} numberOfLines={1}>{categoryLabel}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: selectedCategory?.iconBgColor || habit.iconBg || '#E8F4FD' }]}>
            {(() => {
              const IconComp = habitIconMap[selectedCategory?.iconName || habit.iconName] || habitIconMap['grid-2x2'];
              return IconComp ? <IconComp size={18} color={selectedCategory?.iconColor || habit.iconColor || '#000'} /> : null;
            })()}
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.row}
          onPress={() => setEditingDesc(!editingDesc)}
          activeOpacity={0.7}
        >
          <View style={styles.rowIcon}>
            <Info size={18} color={ACCENT} />
          </View>
          <Text style={styles.rowLabel}>Description</Text>
        </TouchableOpacity>
        {editingDesc && (
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Add a description..."
            placeholderTextColor={Colors.textTertiary}
            numberOfLines={3}
          />
        )}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => setFrequencyModal(true)} activeOpacity={0.7}>
          <View style={styles.rowIcon}>
            <CalendarDays size={18} color={ACCENT} />
          </View>
          <Text style={styles.rowLabel}>Frequency</Text>
          <Text style={styles.valueGray} numberOfLines={1}>{freqLabel}</Text>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <CalendarDays size={18} color={ACCENT} />
          </View>
          <Text style={styles.rowLabel}>Start date</Text>
          <TextInput
            style={styles.dateInput}
            value={startDateStr}
            onChangeText={setStartDateStr}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <CalendarDays size={18} color={ACCENT} />
          </View>
          <Text style={styles.rowLabel}>End date</Text>
          <TextInput
            style={styles.dateInput}
            value={endDateStr}
            onChangeText={setEndDateStr}
            placeholder="Optional"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {endDateStr.trim() ? (
          <TouchableOpacity
            style={styles.clearEndRow}
            onPress={() => setEndDateStr('')}
            hitSlop={8}
          >
            <Text style={styles.clearEndText}>Clear end date</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        activeOpacity={0.8}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveBtnText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      <View style={styles.group}>
        <TouchableOpacity style={styles.row} onPress={confirmRestart} activeOpacity={0.7}>
          <View style={styles.rowIcon}>
            <RotateCcw size={18} color={ACCENT} />
          </View>
          <Text style={styles.rowLabel}>Restart habit progress</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={confirmDelete} activeOpacity={0.7}>
          <View style={[styles.rowIcon, styles.rowIconDestructive]}>
            <Trash2 size={18} color={Colors.error} />
          </View>
          <Text style={[styles.rowLabel, styles.rowLabelDestructive]}>Delete habit</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 60 }} />

      <Modal visible={categoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: Colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>Category</Text>
              <TouchableOpacity onPress={() => setCategoryModal(false)} hitSlop={12}>
                <X size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {displayCategories.map((cat) => {
                const IconComp = habitIconMap[cat.iconName] || habitIconMap['grid-2x2'];
                const sel = selectedCategory?.id === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catRow, sel && { backgroundColor: Colors.innerCard }]}
                    onPress={() => pickCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.catIconBox, { backgroundColor: cat.iconBgColor }]}>
                      <IconComp size={20} color={cat.iconColor} />
                    </View>
                    <Text style={[styles.catName, { color: Colors.textPrimary }]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={frequencyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: Colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>Frequency</Text>
              <TouchableOpacity onPress={() => setFrequencyModal(false)} hitSlop={12}>
                <X size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <HabitFrequencyFormFields
                repeatRule={repeatRule}
                onRepeatRuleChange={handleRepeatRuleChange}
                repeatDays={repeatDays}
                onRepeatDaysChange={setRepeatDays}
                yearlyDates={yearlyDates}
                onYearlyDatesChange={setYearlyDates}
                cadenceCount={cadenceCount}
                onCadenceCountChange={setCadenceCount}
                cadenceUnit={cadenceUnit}
                onCadenceUnitChange={setCadenceUnit}
                intervalEvery={intervalEvery}
                onIntervalEveryChange={setIntervalEvery}
                showTitle={false}
              />
              <TouchableOpacity
                style={[styles.modalDone, { backgroundColor: ACCENT }]}
                onPress={() => {
                  const v = validateFrequencyFormState({
                    repeatRule,
                    repeatDays,
                    yearlyDates,
                    cadenceCount,
                    cadenceUnit,
                    intervalEvery,
                  });
                  if (!v.ok) {
                    Alert.alert('Frequency', v.message || 'Fix the options above.');
                    return;
                  }
                  setFrequencyModal(false);
                }}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function createStyles(Colors) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    group: {
      backgroundColor: Colors.cardBackground,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      gap: 10,
    },
    rowIcon: {
      width: 30,
      alignItems: 'center',
    },
    rowIconDestructive: {},
    rowLabel: {
      flex: 1,
      fontSize: 15,
      fontFamily: 'PlusJakartaSans-Medium',
      color: Colors.textPrimary,
    },
    rowLabelDestructive: {
      color: Colors.error,
    },
    rowValue: {
      fontSize: 14,
      color: Colors.textSecondary,
      maxWidth: 100,
    },
    valueGray: {
      color: Colors.textSecondary,
      fontSize: 14,
      flexShrink: 1,
      textAlign: 'right',
    },
    valueGreen: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.success,
      marginRight: 4,
      maxWidth: 90,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: Colors.border,
      marginLeft: 60,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: Colors.innerCard,
      borderRadius: 10,
      paddingHorizontal: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Colors.innerBorder,
    },
    textInput: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 15,
      color: Colors.textPrimary,
    },
    textArea: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: Colors.innerCard,
      borderRadius: 10,
      paddingHorizontal: 12,
      minHeight: 80,
      textAlignVertical: 'top',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Colors.innerBorder,
    },
    dateInput: {
      minWidth: 120,
      maxWidth: 140,
      paddingVertical: 8,
      paddingHorizontal: 10,
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: ACCENT,
      backgroundColor: ACCENT + '22',
      borderRadius: 10,
    },
    clearEndRow: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    clearEndText: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: ACCENT,
    },
    clearBtn: {
      padding: 4,
    },
    categoryBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtn: {
      marginHorizontal: 16,
      marginTop: 16,
      backgroundColor: ACCENT,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      minHeight: 52,
      justifyContent: 'center',
    },
    saveBtnDisabled: {
      opacity: 0.75,
    },
    saveBtnText: {
      fontSize: 16,
      fontFamily: 'PlusJakartaSans-Bold',
      color: '#FFFFFF',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: Platform.OS === 'web' ? '85%' : '88%',
      paddingBottom: 24,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: 'PlusJakartaSans-Bold',
    },
    modalScroll: {
      maxHeight: 420,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    catIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catName: {
      fontSize: 16,
      fontFamily: 'PlusJakartaSans-Medium',
    },
    radioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: ACCENT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: {
      borderColor: ACCENT,
    },
    radioDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: ACCENT,
    },
    radioLabel: {
      fontSize: 15,
      fontFamily: 'PlusJakartaSans-Medium',
    },
    modalDone: {
      marginTop: 16,
      marginHorizontal: 8,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
    },
    modalDoneText: {
      color: '#FFFFFF',
      fontFamily: 'PlusJakartaSans-Bold',
      fontSize: 16,
    },
  });
}
