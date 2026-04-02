import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert,
} from 'react-native';
import {
  Pencil, Shapes, Info, Bell, Flag, CalendarDays, Archive, RotateCcw, Trash2, ChevronRight, X,
} from 'lucide-react-native';

const DARK = '#1A1A1A';
const CARD = '#2A2A2A';
const ACCENT = '#E8526A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#9CA3AF';
const TEXT_MUTED = '#6B7280';

const REPEAT_LABELS = {
  daily: 'Every day',
  specific_days_week: 'Specific days',
  specific_days_month: 'Monthly',
  specific_days_year: 'Yearly',
  some_days_period: 'Periodic',
  repeat: 'Repeat',
};

const PRIORITY_OPTIONS = ['low', 'default', 'high'];
const PRIORITY_LABELS = { low: 'Low', default: 'Default', high: 'High' };

function EditRow({ icon, label, value, onPress, valueStyle, destructive }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, destructive && styles.rowIconDestructive]}>
        {icon}
      </View>
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      {value !== undefined && (
        <Text style={[styles.rowValue, valueStyle]}>{value}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function HabitDetailEdit({ habit, onSave, onArchive, onDelete, onRestart }) {
  const [name, setName] = useState(habit.name || '');
  const [description, setDescription] = useState(habit.description || '');
  const [priority, setPriority] = useState(habit.priority || 'default');
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);

  const cyclePriority = () => {
    const idx = PRIORITY_OPTIONS.indexOf(priority);
    setPriority(PRIORITY_OPTIONS[(idx + 1) % PRIORITY_OPTIONS.length]);
  };

  const handleSave = () => {
    onSave?.({
      ...habit,
      name: name.trim() || habit.name,
      description: description.trim(),
      priority,
    });
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(habit) },
      ]
    );
  };

  const confirmRestart = () => {
    Alert.alert(
      'Restart Progress',
      'This will clear all completion history for this habit. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart', style: 'destructive', onPress: () => onRestart?.(habit) },
      ]
    );
  };

  const confirmArchive = () => {
    Alert.alert(
      habit.isArchived ? 'Unarchive Habit' : 'Archive Habit',
      habit.isArchived
        ? 'This habit will be moved back to active habits.'
        : 'This habit will be archived and hidden from your daily list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: habit.isArchived ? 'Unarchive' : 'Archive',
          onPress: () => onArchive?.(habit),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.group}>
        <EditRow
          icon={<Pencil size={18} color={ACCENT} />}
          label="Habit name"
          value={!editingName ? name : undefined}
          valueStyle={styles.valueGray}
          onPress={() => setEditingName(true)}
        />
        {editingName && (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              autoFocus
              placeholder="Habit name"
              placeholderTextColor={TEXT_MUTED}
              onBlur={() => setEditingName(false)}
              returnKeyType="done"
              onSubmitEditing={() => setEditingName(false)}
            />
            <TouchableOpacity onPress={() => { setName(''); }} style={styles.clearBtn}>
              <X size={16} color={TEXT_MUTED} />
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

        <EditRow
          icon={<Info size={18} color={ACCENT} />}
          label="Description"
          onPress={() => setEditingDesc(!editingDesc)}
        />
        {editingDesc && (
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Add a description..."
            placeholderTextColor={TEXT_MUTED}
            numberOfLines={3}
          />
        )}

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Bell size={18} color={ACCENT} />
          </View>
          <Text style={styles.rowLabel}>Time and reminders</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{habit.reminderCount || 0}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={cyclePriority} activeOpacity={0.7}>
          <View style={styles.rowIcon}>
            <Flag size={18} color={ACCENT} />
          </View>
          <Text style={styles.rowLabel}>Priority</Text>
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityBadgeText}>{PRIORITY_LABELS[priority]}</Text>
          </View>
        </TouchableOpacity>

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
        <TouchableOpacity style={styles.row} onPress={confirmArchive} activeOpacity={0.7}>
          <View style={styles.rowIcon}>
            <Archive size={18} color={ACCENT} />
          </View>
          <Text style={styles.rowLabel}>{habit.isArchived ? 'Unarchive' : 'Archive'}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={confirmRestart} activeOpacity={0.7}>
          <View style={styles.rowIcon}>
            <RotateCcw size={18} color={ACCENT} />
          </View>
          <Text style={styles.rowLabel}>Restart habit progress</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={confirmDelete} activeOpacity={0.7}>
          <View style={[styles.rowIcon, styles.rowIconDestructive]}>
            <Trash2 size={18} color="#F44336" />
          </View>
          <Text style={[styles.rowLabel, styles.rowLabelDestructive]}>Delete habit</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: DARK,
  },
  group: {
    backgroundColor: CARD,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
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
    color: TEXT_PRIMARY,
  },
  rowLabelDestructive: {
    color: '#F44336',
  },
  rowValue: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  valueGray: {
    color: TEXT_MUTED,
    fontSize: 14,
  },
  valueGreen: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#22C55E',
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#3A3A3A',
    marginLeft: 60,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  textArea: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 80,
    textAlignVertical: 'top',
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
  countBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_PRIMARY,
  },
  priorityBadge: {
    backgroundColor: ACCENT + '33',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  priorityBadgeText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: ACCENT,
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
