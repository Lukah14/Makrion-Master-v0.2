import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarDays, Trophy, RefreshCw, Check, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

function ActionCard({ icon, title, description, onPress }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.actionIcon}>{icon}</View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc}>{description}</Text>
      </View>
      <ChevronRight size={20} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function EmptyState({ onAddHabit }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <View style={styles.container}>
      <View style={styles.illustration}>
        <CalendarDays size={64} color={Colors.textTertiary} />
      </View>
      <Text style={styles.title}>No activities scheduled</Text>
      <Text style={styles.subtitle}>Add something to plan your day</Text>

      <View style={styles.actions}>
        <ActionCard
          icon={<Trophy size={24} color="#C0394F" />}
          title="Habit"
          description="Activity that repeats over time. It has detailed tracking and statistics."
          onPress={onAddHabit}
        />
      </View>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#F5E6E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginBottom: 32,
  },
  actions: {
    width: '100%',
    gap: 1,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF2F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 13,
    color: Colors.textTertiary,
    lineHeight: 18,
  },
});
