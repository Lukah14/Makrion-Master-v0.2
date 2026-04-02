import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Flame, Trophy } from 'lucide-react-native';
import Card from '@/components/common/Card';
import SectionHeader from '@/components/common/SectionHeader';
import { useTheme } from '@/context/ThemeContext';

function MiniBarChart({ data }) {
  const { colors: Colors } = useTheme();
  const maxVal = Math.max(...data);
  const barWidth = 8;
  const chartHeight = 50;
  const gap = 4;
  const totalWidth = data.length * (barWidth + gap) - gap;

  return (
    <Svg width={totalWidth} height={chartHeight}>
      {data.map((val, i) => {
        const barHeight = (val / maxVal) * chartHeight;
        const isLast = i === data.length - 1;
        return (
          <Rect
            key={i}
            x={i * (barWidth + gap)}
            y={chartHeight - barHeight}
            width={barWidth}
            height={barHeight}
            rx={3}
            fill={isLast ? Colors.textPrimary : Colors.border}
          />
        );
      })}
    </Svg>
  );
}

export default function ProgressSnapshot({ data }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const weightData = data?.weeklyWeights || [72, 71.2, 70.5, 70, 69.5, 69, 68.5];

  return (
    <View>
      <SectionHeader title="Progress" actionText="View all" />
      <Card>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.weight}>
              {data?.currentWeight || 68.5}
              <Text style={styles.unit}>kg</Text>
            </Text>
            <Text style={styles.change}>
              <Text style={{ color: Colors.primary }}>{'\u2193'}{data?.weightLost || 3.5}kg</Text>
              {'  '}since start
            </Text>
            <Text style={styles.goal}>
              Goal: {data?.goalWeight || 62}kg {'\u00B7'} {data?.percentDone || 65}% done
            </Text>
          </View>
          <MiniBarChart data={weightData} />
        </View>

        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: Colors.caloriesLight }]}>
            <Flame size={14} color={Colors.streakFire} />
            <Text style={[styles.badgeText, { color: Colors.streakFire }]}>
              {data?.streak || 7} day streak
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: Colors.caloriesLight }]}>
            <Trophy size={14} color={Colors.calories} />
            <Text style={[styles.badgeText, { color: Colors.calories }]}>On track!</Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  weight: {
    fontSize: 36,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  unit: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
  },
  change: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  goal: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
});
