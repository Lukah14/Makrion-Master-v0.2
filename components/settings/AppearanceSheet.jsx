import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, Platform } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const OPTIONS = [
  { key: 'light', label: 'Light', desc: 'Always use light appearance' },
  { key: 'dark', label: 'Dark', desc: 'Always use dark appearance' },
  { key: 'system', label: 'System', desc: 'Match your device setting' },
];

export default function AppearanceSheet({ visible, current, onChange, onClose }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Appearance</Text>
          <Text style={styles.subtitle}>Choose how the app looks to you</Text>

          <View style={styles.optionList}>
            {OPTIONS.map((opt, i) => {
              const selected = current === opt.key;
              return (
                <View key={opt.key}>
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => {
                      onClose();
                      onChange(opt.key);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.optionDesc}>{opt.desc}</Text>
                    </View>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                  {i < OPTIONS.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
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
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
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
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginBottom: 24,
  },
  optionList: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  optionText: { flex: 1 },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
  },
  optionLabelSelected: {
    fontFamily: 'PlusJakartaSans-Bold',
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.textPrimary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  cancelBtn: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
});
