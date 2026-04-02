import { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  StyleSheet, Pressable, Platform, ActivityIndicator,
} from 'react-native';
import { Scale, CalendarDays, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

function formatToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function UpdateProgressSheet({ visible, lastWeight, onSave, onClose }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const today = formatToday();

  const handleSave = async () => {
    setError('');
    const val = parseFloat(weight);
    if (!weight.trim() || isNaN(val)) {
      setError('Please enter a valid weight.');
      return;
    }
    if (val <= 0 || val > 500) {
      setError('Weight must be between 0 and 500 kg.');
      return;
    }

    setSaving(true);
    try {
      await onSave(val, today);
      setWeight('');
      onClose();
    } catch (e) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setWeight('');
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <Text style={styles.title}>Update Progress</Text>
          <Text style={styles.subtitle}>Log your current weight</Text>

          <View style={styles.dateRow}>
            <CalendarDays size={16} color={Colors.textTertiary} />
            <Text style={styles.dateText}>{formatDisplay(today)}</Text>
          </View>

          <View style={styles.inputSection}>
            <View style={styles.inputRow}>
              <Scale size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={(t) => { setWeight(t); setError(''); }}
                placeholder={lastWeight ? `Last: ${lastWeight} kg` : 'Enter weight'}
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
                autoFocus
                selectionColor={Colors.textPrimary}
                returnKeyType="done"
                onSubmitEditing={handleSave}
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

          {lastWeight ? (
            <View style={styles.lastEntry}>
              <Text style={styles.lastEntryLabel}>Previous weight</Text>
              <Text style={styles.lastEntryValue}>{lastWeight} kg</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.cardBackground} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Entry</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
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
    gap: 8,
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textSecondary,
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
  lastEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },
  lastEntryLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
  },
  lastEntryValue: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
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
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
});
