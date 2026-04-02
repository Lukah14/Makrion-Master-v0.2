import { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  StyleSheet, ScrollView, Switch, Pressable, Platform,
} from 'react-native';
import { X, Flame, Target, TrendingUp, Settings2, Info } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const GOAL_TYPES = [
  { key: 'Fat Loss', label: 'Fat Loss', icon: Flame, color: '#FF6B35', bg: '#FFF3EE' },
  { key: 'Maintain', label: 'Maintain', icon: Target, color: '#2DA89E', bg: '#E6F7F5' },
  { key: 'Muscle Gain', label: 'Muscle Gain', icon: TrendingUp, color: '#4A9BD9', bg: '#E8F4FD' },
  { key: 'Custom', label: 'Custom', icon: Settings2, color: '#9B59B6', bg: '#F3E8FD' },
];

const DEFAULTS = {
  'Fat Loss': { calories: '1800', rate: '0.5' },
  Maintain: { calories: '2200', rate: '0' },
  'Muscle Gain': { calories: '2600', rate: '0.25' },
  Custom: { calories: '2000', rate: '0.5' },
};

export default function EditGoalSheet({ visible, goal, onSave, onClose }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [goalType, setGoalType] = useState(goal?.type || 'Fat Loss');
  const [goalWeight, setGoalWeight] = useState(String(goal?.targetWeight || '65'));
  const [calories, setCalories] = useState(String(goal?.calorieTarget || '1800'));
  const [autoAdj, setAutoAdj] = useState(goal?.autoAdjustments ?? true);
  const [weeklyRate, setWeeklyRate] = useState(String(goal?.weeklyRate || '0.5'));
  const [notes, setNotes] = useState(goal?.notes || '');

  const handleTypeChange = (type) => {
    setGoalType(type);
    const d = DEFAULTS[type];
    setCalories(d.calories);
    setWeeklyRate(d.rate);
  };

  const handleSave = () => {
    onSave({
      ...goal,
      type: goalType,
      targetWeight: parseFloat(goalWeight) || goal?.targetWeight,
      calorieTarget: parseInt(calories) || goal?.calorieTarget,
      autoAdjustments: autoAdj,
      weeklyRate: parseFloat(weeklyRate) || 0,
      notes,
    });
    onClose();
  };

  const handleRestore = () => {
    const d = DEFAULTS[goalType];
    setCalories(d.calories);
    setWeeklyRate(d.rate);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Edit Phase</Text>
            <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn} activeOpacity={0.7}>
              <Text style={styles.restoreText}>Restore</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            <Text style={styles.sectionLabel}>Goal Type</Text>
            <View style={styles.typeRow}>
              {GOAL_TYPES.map((gt) => {
                const Ic = gt.icon;
                const active = goalType === gt.key;
                return (
                  <TouchableOpacity
                    key={gt.key}
                    style={[styles.typeChip, active && { backgroundColor: gt.bg, borderColor: gt.color }]}
                    onPress={() => handleTypeChange(gt.key)}
                    activeOpacity={0.75}
                  >
                    <Ic size={14} color={active ? gt.color : '#888'} />
                    <Text style={[styles.typeChipText, active && { color: gt.color }]}>{gt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Goal Weight</Text>
              <TextInput
                style={styles.input}
                value={goalWeight}
                onChangeText={setGoalWeight}
                keyboardType="decimal-pad"
                placeholderTextColor="#666"
                selectionColor="#F5C542"
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>Calories</Text>
                <Info size={14} color="#888" style={{ marginLeft: 4 }} />
              </View>
              <TextInput
                style={styles.input}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                placeholderTextColor="#666"
                selectionColor="#F5C542"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Weekly Rate (kg)</Text>
              <TextInput
                style={styles.input}
                value={weeklyRate}
                onChangeText={setWeeklyRate}
                keyboardType="decimal-pad"
                placeholderTextColor="#666"
                selectionColor="#F5C542"
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>Auto adjustments</Text>
                <Info size={14} color="#888" style={{ marginLeft: 4 }} />
              </View>
              <Switch
                value={autoAdj}
                onValueChange={setAutoAdj}
                trackColor={{ false: '#444', true: '#F5C542' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#444"
              />
            </View>

            <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Reason for this goal..."
                placeholderTextColor="#666"
                multiline
                selectionColor="#F5C542"
              />
            </View>

          </ScrollView>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>OK</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    maxHeight: '88%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  restoreBtn: {
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  restoreText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
    minWidth: 120,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notesInput: {
    textAlign: 'left',
    minHeight: 60,
    minWidth: 160,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  saveBtn: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.onPrimary,
  },
});
