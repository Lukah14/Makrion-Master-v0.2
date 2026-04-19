import { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  StyleSheet, Pressable, Platform,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { FILTER_OPTIONS, emptyFoodSearchFilters } from '@/data/foodDatabase';

const FILTER_KEYS = ['category', 'calories', 'protein', 'carbs', 'fat', 'diet', 'source', 'sort'];
const FILTER_LABELS = {
  category: 'Category',
  calories: 'Calories',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  diet: 'Diet',
  source: 'Source',
  sort: 'Sort by',
};

export default function FilterSheet({ visible, activeFilter, filters, onApply, onClose, onReset }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const [localFilters, setLocalFilters] = useState(filters);
  const [section, setSection] = useState(activeFilter || 'category');

  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
      setSection(activeFilter || 'category');
    }
  }, [visible, filters, activeFilter]);

  const toggle = (key, value) => {
    setLocalFilters((prev) => {
      const curr = prev[key] || [];
      if (key === 'sort') {
        return { ...prev, [key]: [value] };
      }
      return {
        ...prev,
        [key]: curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value],
      };
    });
  };

  const handleReset = () => {
    setLocalFilters(emptyFoodSearchFilters());
    onReset?.();
  };

  const handleApply = () => {
    onApply({ ...filters, ...localFilters });
    onClose();
  };

  const opts = FILTER_OPTIONS[section] || [];
  const selected = localFilters[section] || [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filter</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <ScrollView style={styles.sidebar} showsVerticalScrollIndicator={false}>
              {FILTER_KEYS.map((key) => {
                const count = (localFilters[key] || []).length;
                const isActive = section === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                    onPress={() => setSection(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sidebarText, isActive && styles.sidebarTextActive]}>
                      {FILTER_LABELS[key]}
                    </Text>
                    {count > 0 && (
                      <View style={styles.countDot}>
                        <Text style={styles.countText}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <ScrollView style={styles.options} showsVerticalScrollIndicator={false}>
              <Text style={styles.optionTitle}>{FILTER_LABELS[section]}</Text>
              {opts.map((opt) => {
                const checked = selected.includes(opt);
                return (
                  <TouchableOpacity
                    key={opt}
                    style={styles.optionRow}
                    onPress={() => toggle(section, opt)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.optionText, checked && styles.optionTextActive]}>{opt}</Text>
                    <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                      {checked && <Check size={13} color={Colors.onPrimary} strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
              <Text style={styles.applyText}>Apply filters</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexDirection: 'row',
    height: 320,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sidebar: {
    width: 130,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingTop: 8,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  sidebarItemActive: {
    backgroundColor: Colors.background,
    borderRightWidth: 2,
    borderRightColor: Colors.textPrimary,
  },
  sidebarText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textSecondary,
  },
  sidebarTextActive: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  countDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 10,
    color: Colors.onPrimary,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  options: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  optionTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  optionText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textPrimary,
  },
  optionTextActive: {
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  resetText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
  },
  applyText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.onPrimary,
  },
});
