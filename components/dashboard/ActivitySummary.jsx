import { View, Text, StyleSheet } from 'react-native';
import { Flame, Clock, Footprints } from 'lucide-react-native';
import Card from '@/components/common/Card';
import SectionHeader from '@/components/common/SectionHeader';
import { useTheme } from '@/context/ThemeContext';

export default function ActivitySummary({ data }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const stepPercent = Math.min((data.steps / data.stepsGoal) * 100, 100);

  return (
    <View>
      <SectionHeader title="Today's Activity" actionText="Details" />
      <Card>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.caloriesLight }]}>
              <Flame size={18} color={Colors.calories} />
            </View>
            <Text style={styles.statValue}>
              {data.caloriesBurned}
              <Text style={styles.statUnit}>kcal</Text>
            </Text>
            <Text style={styles.statLabel}>Burned</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.primaryLight }]}>
              <Clock size={18} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>
              {data.activeMinutes}
              <Text style={styles.statUnit}>min</Text>
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.fatLight }]}>
              <Footprints size={18} color={Colors.fat} />
            </View>
            <Text style={styles.statValue}>
              {data.steps.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Steps</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Step goal progress</Text>
            <Text style={[styles.progressPercent, { color: Colors.primary }]}>{data.stepProgress}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${stepPercent}%` }]} />
          </View>
        </View>
      </Card>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  statUnit: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  progressSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  progressPercent: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
});
