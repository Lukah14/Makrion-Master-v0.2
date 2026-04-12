import { View, Text, Image, StyleSheet } from 'react-native';
import Card from '@/components/common/Card';
import ProgressRing from '@/components/common/ProgressRing';
import { useTheme } from '@/context/ThemeContext';

const ICON_CALORIES = require('@/src/Icons/Calories.png');

export default function CalorieRing({ consumed, target, burned }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const safeTarget = Math.max(0, Number(target) || 0);
  const remaining = safeTarget - consumed + burned;
  const progress = safeTarget > 0 ? Math.min(consumed / safeTarget, 1) : 0;

  return (
    <Card>
      <View style={styles.topRow}>
        <View style={styles.leftContent}>
          <Text style={styles.remainingValue}>{Math.max(0, remaining).toLocaleString()}</Text>
          <Text style={styles.remainingLabel}>Calories left</Text>
        </View>
        <ProgressRing
          radius={50}
          strokeWidth={8}
          progress={Math.min(progress, 1)}
          color={Colors.textPrimary}
          bgColor={Colors.border}
        >
          <Image source={ICON_CALORIES} style={styles.calorieIcon} resizeMode="contain" />
        </ProgressRing>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{safeTarget.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Goal</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{consumed.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Eaten</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{burned}</Text>
          <Text style={styles.statLabel}>Burned</Text>
        </View>
      </View>
    </Card>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  leftContent: {
    flex: 1,
  },
  remainingValue: {
    fontSize: 42,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  remainingLabel: {
    fontSize: 15,
    color: Colors.textTertiary,
    marginTop: -2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  calorieIcon: {
    width: 26,
    height: 26,
    tintColor: Colors.textPrimary,
  },
});
