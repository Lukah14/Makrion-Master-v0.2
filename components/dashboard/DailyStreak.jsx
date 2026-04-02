import { View, Text, StyleSheet } from 'react-native';
import { Heart, Zap, SquareCheck as CheckSquare } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const iconMap = {
  heart: Heart,
  zap: Zap,
  'check-square': CheckSquare,
};

function StreakBadge({ badge }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const IconComponent = iconMap[badge.icon] || Heart;

  return (
    <View style={[styles.badge, { backgroundColor: badge.bgColor }]}>
      <IconComponent size={14} color={badge.color} />
      <View style={styles.badgeTextContainer}>
        <Text style={[styles.days, { color: badge.color }]}>{badge.days}d</Text>
        <Text style={styles.label}>{badge.label}</Text>
      </View>
    </View>
  );
}

export default function DailyStreak({ badges }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.container}>
      {badges.map((badge) => (
        <StreakBadge key={badge.id} badge={badge} />
      ))}
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  badgeTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  days: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  label: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-Regular',
  },
});
