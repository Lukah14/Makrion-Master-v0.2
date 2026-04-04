import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert,
} from 'react-native';
import {
  Pencil, Shapes, Info, CalendarDays, RotateCcw, Trash2, X,
} from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const ACCENT = '#E8526A';

const REPEAT_LABELS = {
  daily: 'Every day',
  specific_days_week: 'Specific days',
  specific_days_month: 'Monthly',
  specific_days_year: 'Yearly',
  some_days_period: 'Periodic',
  repeat: 'Repeat',
};

export default function HabitDetailEdit({ habit, onSave, onDelete, onRestart }) {
  const { colors: Colors } = useTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [name, setName] = useState(habit.name || '');
  const [description, setDescription] = useState(habit.description || '');
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);

  const handleSave = () => {
    onSave?.({
      ...habit,
      name: name.trim() || habit.name,
      description: description.trim(),
    });
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
      'This will clear all completion history for this habit. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart', style: 'destructive', onPress: () => onRestart?.(habit) },
      ],
    );
  };

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
          {!editingName && <Text style={[styles.rowValue, styles.valueGray]}>{name}</Text>}
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

        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Shapes size={18} color={ACCENT} />
          </View>
          <Text style={styles.rowLabel}>Category</Text>
          <Text style={[styles.rowValue, styles.valueGreen]}>{habit.category}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: habit.iconBg || '#E8F4FD' }]}>
            <Text style={{ fontSize: 14 }}>{habit.emoji}</Text>
          </View>
        </View>

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

        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <CalendarDays size={18} color={ACCENT} />
          </View>
          <Text style={styles.rowLabel}>Frequency</Text>
          <Text style={styles.valueGray}>{REPEAT_LABELS[habit.repeatRule] || 'Every day'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <CalendarDays size={18} color={ACCENT} />
          </View>
          <Text style={styles.rowLabel}>Start date</Text>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>{habit.startDate || '-'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <CalendarDays size={18} color={ACCENT} />
          </View>
          <Text style={styles.rowLabel}>End date</Text>
          {habit.endDate ? (
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>{habit.endDate}</Text>
            </View>
          ) : (
            <Text style={styles.valueGray}>-</Text>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
        <Text style={styles.saveBtnText}>Save Changes</Text>
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
      gap: 14,
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
    },
    valueGray: {
      color: Colors.textSecondary,
      fontSize: 14,
    },
    valueGreen: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.success,
      marginRight: 8,
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
    dateBadge: {
      backgroundColor: ACCENT + '33',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
    },
    dateBadgeText: {
      fontSize: 12,
      fontFamily: 'PlusJakartaSans-Bold',
      color: ACCENT,
    },
    saveBtn: {
      marginHorizontal: 16,
      marginTop: 16,
      backgroundColor: ACCENT,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    saveBtnText: {
      fontSize: 16,
      fontFamily: 'PlusJakartaSans-Bold',
      color: '#FFFFFF',
    },
  });
}
