import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

function getLastSevenDays() {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const label = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    const dateStr = d.toISOString().split('T')[0];
    days.push({ label, dateStr, date: d.getDate(), isToday: i === 0 });
  }
  return days;
}

export default function HabitWeekStrip({ completionHistory = [] }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const days = getLastSevenDays();
  const completedSet = new Set(completionHistory);

  return (
    <View style={styles.row}>
      {days.map((day) => {
        const isCompleted = completedSet.has(day.dateStr);
        return (
          <View key={day.dateStr} style={styles.dayCol}>
            <Text style={styles.dayLabel}>{day.label}</Text>
            <View
              style={[
                styles.dayCircle,
                isCompleted && styles.dayCircleCompleted,
                day.isToday && !isCompleted && styles.dayCircleToday,
              ]}
            >
              {isCompleted ? (
                <Check size={13} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <Text style={[styles.dayNum, day.isToday && styles.dayNumToday]}>
                  {day.date}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 4,
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleCompleted: {
    backgroundColor: Colors.success,
  },
  dayCircleToday: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },
  dayNum: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  dayNumToday: {
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans-Bold',
  },
});
