import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';

export const ACTIVITY_TYPE_OPTIONS = [
  { value: 'time', label: 'Time' },
  { value: 'distance', label: 'Distance' },
  { value: 'reps', label: 'Reps' },
];

export default function ActivityTypeSelector({ value, onChange, disabled }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);

  return (
    <View style={[s.wrap, disabled && s.wrapDisabled]}>
      {ACTIVITY_TYPE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[s.chip, active && s.chipActive]}
            onPress={() => onChange(opt.value)}
            disabled={disabled}
            activeOpacity={0.75}
          >
            <Text style={[s.chipText, active && s.chipTextActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wrapDisabled: { opacity: 0.55 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.innerCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.onPrimary,
  },
});
