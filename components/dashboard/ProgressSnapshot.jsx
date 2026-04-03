import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Flame, Trophy, Scale } from 'lucide-react-native';
import Card from '@/components/common/Card';
import SectionHeader from '@/components/common/SectionHeader';
import { useTheme } from '@/context/ThemeContext';

function MiniBarChart({ data }) {
  const { colors: Colors } = useTheme();
  if (!data?.length) return null;

  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data);
  const range = Math.max(maxVal - minVal, 0.1);
  const barWidth = 8;
  const chartHeight = 50;
  const gap = 4;
  const totalWidth = data.length * (barWidth + gap) - gap;

  return (
    <Svg width={totalWidth} height={chartHeight}>
      {data.map((val, i) => {
        const normalized = (val - minVal) / range;
        const barHeight = Math.max(4, normalized * chartHeight);
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

export default function ProgressSnapshot({ data, onViewAll }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const has = data?.hasWeightData;
  const weeklyWeights = data?.weeklyWeights || [];
  const current = data?.currentWeight;
  const goal = data?.goalWeight;
  const lost = data?.weightLost;
  const pct = data?.percentDone;

  const showChange = has && lost != null && !Number.isNaN(lost);
  const showGoalLine = has && goal != null && pct != null;

  return (
    <View>
      <SectionHeader title="Weight progress" actionText="View all" onAction={onViewAll} />
      <Card>
        {!has ? (
          <View style={styles.emptyBlock}>
            <View style={[styles.emptyIcon, { backgroundColor: Colors.innerCard }]}>
              <Scale size={22} color={Colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No weight logged yet</Text>
            <Text style={styles.emptySub}>
              Open Progress and tap Update Progress to record your weight. Your trend will show here.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.topRow}>
              <View style={styles.topLeft}>
                <Text style={styles.weight}>
                  {typeof current === 'number' ? current : '—'}
                  {typeof current === 'number' && (
                    <Text style={styles.unit}> kg</Text>
                  )}
                </Text>
                {showChange && (
                  <Text style={styles.change}>
                    <Text style={{ color: Colors.primary }}>
                      {lost >= 0 ? '\u2193' : '\u2191'}
                      {Math.abs(lost)} kg
                    </Text>
                    {' '}
                    {data?.startWeight != null ? 'from start weight' : 'change'}
                  </Text>
                )}
                {showGoalLine && (
                  <Text style={styles.goal}>
                    Goal: {goal} kg · {pct}% toward goal
                  </Text>
                )}
                {goal != null && !showGoalLine && (
                  <Text style={styles.goal}>Goal: {goal} kg</Text>
                )}
              </View>
              {weeklyWeights.length > 0 && <MiniBarChart data={weeklyWeights} />}
            </View>

            {(pct != null && pct > 0) || weeklyWeights.length >= 3 ? (
              <View style={styles.badges}>
                {weeklyWeights.length >= 3 && (
                  <View style={[styles.badge, { backgroundColor: Colors.caloriesLight }]}>
                    <Flame size={14} color={Colors.streakFire} />
                    <Text style={[styles.badgeText, { color: Colors.streakFire }]}>
                      {weeklyWeights.length} entries (7d)
                    </Text>
                  </View>
                )}
                {pct != null && pct >= 50 && (
                  <View style={[styles.badge, { backgroundColor: Colors.caloriesLight }]}>
                    <Trophy size={14} color={Colors.calories} />
                    <Text style={[styles.badgeText, { color: Colors.calories }]}>On track</Text>
                  </View>
                )}
              </View>
            ) : null}
          </>
        )}
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
  topLeft: {
    flex: 1,
    paddingRight: 8,
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
  emptyBlock: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
