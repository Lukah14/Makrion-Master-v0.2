import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { toDateKey } from '@/lib/dateKey';

const WEEK_LABELS_MON_SUN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Current calendar week Monday → Sunday (labels always Mon..Sun in order). */
function getWeekMonToSun() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 0 Sun .. 6 Sat
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);

  const todayKey = toDateKey(today);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = toDateKey(d);
    days.push({
      label: WEEK_LABELS_MON_SUN[i],
      dateStr,
      date: d.getDate(),
      isToday: dateStr === todayKey,
    });
  }
  return days;
}

export default function HabitWeekStrip({ completionHistory = [] }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const days = getWeekMonToSun();
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
