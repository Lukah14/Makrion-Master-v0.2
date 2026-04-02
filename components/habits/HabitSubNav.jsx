import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarDays, SlidersHorizontal } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

export default function HabitSubNav({ activeSubpage, onChangeSubpage }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.navButton, activeSubpage === 'today' && styles.navButtonActive]}
        onPress={() => onChangeSubpage('today')}
        activeOpacity={0.7}
      >
        <CalendarDays
          size={20}
          color={activeSubpage === 'today' ? Colors.onPrimary : Colors.textSecondary}
        />
        <Text style={[styles.navLabel, activeSubpage === 'today' && styles.navLabelActive]}>
          Today
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.navButton, activeSubpage === 'habits' && styles.navButtonActive]}
        onPress={() => onChangeSubpage('habits')}
        activeOpacity={0.7}
      >
        <SlidersHorizontal
          size={20}
          color={activeSubpage === 'habits' ? Colors.onPrimary : Colors.textSecondary}
        />
        <Text style={[styles.navLabel, activeSubpage === 'habits' && styles.navLabelActive]}>
          Habits
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    backgroundColor: Colors.cardBackground,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  navButtonActive: {
    backgroundColor: Colors.textPrimary,
  },
  navLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
  navLabelActive: {
    color: Colors.onPrimary,
  },
});
