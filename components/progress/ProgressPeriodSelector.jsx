import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { PROGRESS_PERIOD_ORDER, PROGRESS_PERIOD_LABELS } from '@/lib/progressPeriods';

/**
 * @param {{ value: string, onChange: (id: string) => void }} props
 */
export default function ProgressPeriodSelector({ value, onChange }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {PROGRESS_PERIOD_ORDER.map((id) => {
        const active = value === id;
        return (
          <TouchableOpacity
            key={id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {PROGRESS_PERIOD_LABELS[id]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (Colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: 8,
      paddingVertical: 4,
      paddingRight: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: Colors.background,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    chipActive: {
      backgroundColor: Colors.textPrimary,
      borderColor: Colors.textPrimary,
    },
    chipText: {
      fontSize: 12,
      fontFamily: 'PlusJakartaSans-Medium',
      color: Colors.textSecondary,
    },
    chipTextActive: {
      color: Colors.onPrimary,
      fontFamily: 'PlusJakartaSans-SemiBold',
    },
  });
