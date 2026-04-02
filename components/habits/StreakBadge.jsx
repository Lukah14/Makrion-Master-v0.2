import { View, Text, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

export default function StreakBadge({ count }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <View style={styles.badge}>
      <Flame size={14} color={Colors.textPrimary} />
      <Text style={styles.text}>{count}</Text>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
});
