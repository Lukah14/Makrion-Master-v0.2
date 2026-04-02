import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function DateStrip({ selectedDate, onDateChange }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const dates = useMemo(() => {
    const today = new Date();
    const center = selectedDate || today;
    const dayOfWeek = center.getDay();
    const startOfWeek = new Date(center);
    startOfWeek.setDate(center.getDate() - ((dayOfWeek + 4) % 7));

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      result.push({
        id: i.toString(),
        dayName: shortDayNames[date.getDay()],
        dateNum: date.getDate(),
        fullDate: new Date(date),
        isToday: date.toDateString() === today.toDateString(),
        isSelected: date.toDateString() === (selectedDate || today).toDateString(),
      });
    }
    return result;
  }, [selectedDate]);

  return (
    <View style={styles.container}>
      {dates.map((date) => (
        <TouchableOpacity
          key={date.id}
          style={[styles.dateItem, date.isSelected && styles.dateItemSelected]}
          onPress={() => onDateChange(date.fullDate)}
          activeOpacity={0.7}
        >
          <Text style={[styles.dayName, date.isSelected && styles.dayNameSelected]}>
            {date.dayName}
          </Text>
          <Text style={[styles.dateNum, date.isSelected && styles.dateNumSelected]}>
            {date.dateNum}
          </Text>
          {date.isToday && date.isSelected && <View style={styles.todayDot} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  dateItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    minWidth: 44,
    gap: 4,
  },
  dateItemSelected: {
    backgroundColor: Colors.textPrimary,
  },
  dayName: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  dayNameSelected: {
    color: Colors.onPrimary,
  },
  dateNum: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  dateNumSelected: {
    color: Colors.onPrimary,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.onPrimary,
    marginTop: 2,
  },
});
