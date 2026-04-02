import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Line } from 'react-native-svg';
import { Circle as HelpCircle } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const screenWidth = Dimensions.get('window').width - 48;

const BMI_RANGES = [
  { label: 'Underweight', color: '#3B82F6', max: 18.5 },
  { label: 'Healthy', color: '#22C55E', max: 24.9 },
  { label: 'Overweight', color: '#F59E0B', max: 29.9 },
  { label: 'Obese', color: '#EF4444', max: 40 },
];

function getBMIStatus(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: '#3B82F6' };
  if (bmi < 25) return { label: 'Healthy', color: '#22C55E' };
  if (bmi < 30) return { label: 'Overweight', color: '#F59E0B' };
  return { label: 'Obese', color: '#EF4444' };
}

function BMIScale({ bmi }) {
  const w = screenWidth - 32;
  const h = 18;
  const minBMI = 15;
  const maxBMI = 40;
  const pct = Math.min(Math.max((bmi - minBMI) / (maxBMI - minBMI), 0), 1);
  const markerX = pct * w;

  return (
    <Svg width={w} height={h + 8}>
      <Defs>
        <LinearGradient id="bmiGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#3B82F6" />
          <Stop offset="0.28" stopColor="#22C55E" />
          <Stop offset="0.56" stopColor="#F59E0B" />
          <Stop offset="1" stopColor="#EF4444" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={4} width={w} height={h - 8} rx={5} fill="url(#bmiGrad)" />
      <Line
        x1={markerX}
        y1={0}
        x2={markerX}
        y2={h + 4}
        stroke="#1A1A2E"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function BMICard({ weight = 72, height = 175 }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const bmi = weight / Math.pow(height / 100, 2);
  const rounded = Math.round(bmi * 10) / 10;
  const status = getBMIStatus(rounded);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Your BMI</Text>
        <HelpCircle size={20} color={Colors.textTertiary} />
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.bmiValue}>{rounded}</Text>
        <Text style={styles.bmiLabel}> Your weight is </Text>
        <View style={[styles.statusPill, { backgroundColor: status.color + '22' }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.scaleWrap}>
        <BMIScale bmi={rounded} />
      </View>

      <View style={styles.legend}>
        {BMI_RANGES.map((r) => (
          <View key={r.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: r.color }]} />
            <Text style={styles.legendText}>{r.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  bmiValue: {
    fontSize: 36,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  bmiLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginLeft: 4,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  scaleWrap: {
    marginBottom: 14,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textSecondary,
  },
});
