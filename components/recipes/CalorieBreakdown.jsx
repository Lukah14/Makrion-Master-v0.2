import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';

const CHART_SIZE = 110;
const STROKE_WIDTH = 22;
const RADIUS = (CHART_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const MACRO_COLORS = {
  carbs: '#FFB84D',
  fat: '#5CB8FF',
  protein: '#FF6B6B',
};

function DonutSegment({ percentage, offset, color }) {
  const strokeDash = (percentage / 100) * CIRCUMFERENCE;
  const strokeGap = CIRCUMFERENCE - strokeDash;

  return (
    <Circle
      cx={CHART_SIZE / 2}
      cy={CHART_SIZE / 2}
      r={RADIUS}
      stroke={color}
      strokeWidth={STROKE_WIDTH}
      strokeDasharray={`${strokeDash} ${strokeGap}`}
      strokeDashoffset={-offset}
      strokeLinecap="butt"
      fill="transparent"
    />
  );
}

export default function CalorieBreakdown({ recipe }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  if (!recipe) return null;

  const proteinKcal = (recipe.protein || 0) * 4;
  const carbsKcal = (recipe.carbs || 0) * 4;
  const fatKcal = (recipe.fat || 0) * 9;
  const totalKcal = proteinKcal + carbsKcal + fatKcal || 1;

  const carbsPct = Math.round((carbsKcal / totalKcal) * 100);
  const fatPct = Math.round((fatKcal / totalKcal) * 100);
  const proteinPct = 100 - carbsPct - fatPct;

  const macros = [
    { label: 'Carbohydrate', pct: carbsPct, color: MACRO_COLORS.carbs },
    { label: 'Fat', pct: fatPct, color: MACRO_COLORS.fat },
    { label: 'Protein', pct: proteinPct, color: MACRO_COLORS.protein },
  ];

  let cumulativeOffset = 0;
  const segments = macros.map((m) => {
    const seg = { ...m, offset: cumulativeOffset };
    cumulativeOffset += (m.pct / 100) * CIRCUMFERENCE;
    return seg;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calorie Breakdown:</Text>

      <View style={styles.content}>
        <View style={styles.legend}>
          {macros.map((m) => (
            <View key={m.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: m.color }]} />
              <Text style={styles.legendText}>{m.label} ({m.pct}%)</Text>
            </View>
          ))}
        </View>

        <View style={styles.chartWrap}>
          <Svg width={CHART_SIZE} height={CHART_SIZE}>
            <Circle
              cx={CHART_SIZE / 2}
              cy={CHART_SIZE / 2}
              r={RADIUS}
              stroke="#F0F0F0"
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
            />
            <G rotation="-90" origin={`${CHART_SIZE / 2}, ${CHART_SIZE / 2}`}>
              {segments.map((seg) => (
                <DonutSegment
                  key={seg.label}
                  percentage={seg.pct}
                  offset={seg.offset}
                  color={seg.color}
                />
              ))}
            </G>
          </Svg>
        </View>
      </View>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legend: {
    flex: 1,
    gap: 12,
    paddingRight: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textSecondary,
  },
  chartWrap: {
    width: CHART_SIZE,
    height: CHART_SIZE,
    flexShrink: 0,
  },
});
