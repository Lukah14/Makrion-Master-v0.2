import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function WeeklyDateSelector({ dates, onDateSelect }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [selectedId, setSelectedId] = useState(
    dates.find((d) => d.isToday)?.id || dates[0]?.id
  );

  const handleSelect = (date) => {
    setSelectedId(date.id);
    onDateSelect && onDateSelect(date);
  };

  return (
    <View style={styles.container}>
      {dates.map((date) => {
        const isSelected = date.id === selectedId;
        return (
          <TouchableOpacity
            key={date.id}
            style={[styles.dateItem, isSelected && styles.dateItemSelected]}
            onPress={() => handleSelect(date)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
              {date.day}
            </Text>
            <Text style={[styles.dateText, isSelected && styles.dateTextSelected]}>
              {date.date}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  dateItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 42,
  },
  dateItemSelected: {
    backgroundColor: Colors.textPrimary,
  },
  dayText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-Medium',
    marginBottom: 4,
  },
  dayTextSelected: {
    color: Colors.onPrimary,
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  dateTextSelected: {
    color: Colors.onPrimary,
  },
});
