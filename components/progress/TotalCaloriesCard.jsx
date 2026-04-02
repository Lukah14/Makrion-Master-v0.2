import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';

const screenWidth = Dimensions.get('window').width - 48;

const WEEK_FILTERS = ['This week', 'Last week', '2 wks. ago', '3 wks. ago'];

const PROTEIN_COLOR = '#E86C5D';
const CARBS_COLOR = '#F5A623';
const FATS_COLOR = '#4A9BD9';

const MOCK_WEEKS = {
  'This week': [
    { day: 'Sun', protein: 0, carbs: 0, fats: 0 },
    { day: 'Mon', protein: 480, carbs: 530, fats: 288 },
    { day: 'Tue', protein: 0, carbs: 0, fats: 0 },
    { day: 'Wed', protein: 0, carbs: 0, fats: 0 },
    { day: 'Thu', protein: 0, carbs: 0, fats: 0 },
    { day: 'Fri', protein: 0, carbs: 0, fats: 0 },
    { day: 'Sat', protein: 0, carbs: 0, fats: 0 },
  ],
  'Last week': [
    { day: 'Sun', protein: 320, carbs: 410, fats: 220 },
    { day: 'Mon', protein: 500, carbs: 580, fats: 310 },
    { day: 'Tue', protein: 420, carbs: 460, fats: 260 },
    { day: 'Wed', protein: 380, carbs: 500, fats: 290 },
    { day: 'Thu', protein: 450, carbs: 520, fats: 270 },
    { day: 'Fri', protein: 510, carbs: 600, fats: 330 },
    { day: 'Sat', protein: 390, carbs: 470, fats: 240 },
  ],
  '2 wks. ago': [
    { day: 'Sun', protein: 300, carbs: 380, fats: 200 },
    { day: 'Mon', protein: 480, carbs: 560, fats: 300 },
    { day: 'Tue', protein: 400, carbs: 440, fats: 250 },
    { day: 'Wed', protein: 360, carbs: 480, fats: 280 },
    { day: 'Thu', protein: 430, carbs: 500, fats: 260 },
    { day: 'Fri', protein: 490, carbs: 580, fats: 320 },
    { day: 'Sat', protein: 370, carbs: 450, fats: 230 },
  ],
  '3 wks. ago': [
    { day: 'Sun', protein: 290, carbs: 360, fats: 190 },
    { day: 'Mon', protein: 460, carbs: 540, fats: 290 },
    { day: 'Tue', protein: 390, carbs: 420, fats: 240 },
    { day: 'Wed', protein: 350, carbs: 460, fats: 270 },
    { day: 'Thu', protein: 410, carbs: 480, fats: 250 },
    { day: 'Fri', protein: 470, carbs: 560, fats: 310 },
    { day: 'Sat', protein: 360, carbs: 430, fats: 220 },
  ],
};

function StackedBarChart({ data }) {
  const { colors: Colors } = useTheme();
  const chartWidth = screenWidth - 32;
  const chartHeight = 160;
  const padBottom = 24;
  const padLeft = 36;
  const padTop = 8;
  const innerW = chartWidth - padLeft - 8;
  const innerH = chartHeight - padBottom - padTop;

  const maxTotal = Math.max(...data.map((d) => d.protein + d.carbs + d.fats), 1500);
  const barW = innerW / data.length - 6;
  const gridLines = [0, 500, 1000, 1500];

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {gridLines.map((v, i) => {
        const y = padTop + innerH - (v / maxTotal) * innerH;
        return (
          <Line
            key={i}
            x1={padLeft}
            y1={y}
            x2={chartWidth - 8}
            y2={y}
            stroke="#E5E7EB"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        );
      })}
      {gridLines.map((v, i) => {
        const y = padTop + innerH - (v / maxTotal) * innerH;
        return (
          <SvgText key={i} x={padLeft - 4} y={y + 4} fontSize={9} fill={Colors.textTertiary} textAnchor="end">
            {v > 0 ? v : '0'}
          </SvgText>
        );
      })}

      {data.map((d, i) => {
        const x = padLeft + i * (barW + 6);
        const totalH = ((d.protein + d.carbs + d.fats) / maxTotal) * innerH;
        const protH = (d.protein / maxTotal) * innerH;
        const carbH = (d.carbs / maxTotal) * innerH;
        const fatH = (d.fats / maxTotal) * innerH;
        const base = padTop + innerH;

        return (
          <View key={i}>
            <Rect x={x} y={base - protH} width={barW} height={protH} rx={0} fill={PROTEIN_COLOR} />
            <Rect x={x} y={base - protH - carbH} width={barW} height={carbH} rx={0} fill={CARBS_COLOR} />
            <Rect
              x={x}
              y={base - protH - carbH - fatH}
              width={barW}
              height={fatH + (i === 0 ? 2 : 0)}
              rx={totalH > 0 ? 3 : 0}
              fill={FATS_COLOR}
            />
            <SvgText x={x + barW / 2} y={chartHeight - 6} fontSize={9} fill={Colors.textTertiary} textAnchor="middle">
              {d.day}
            </SvgText>
          </View>
        );
      })}
    </Svg>
  );
}

export default function TotalCaloriesCard() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [week, setWeek] = useState('This week');
  const data = MOCK_WEEKS[week];
  const total = data.reduce((s, d) => s + d.protein + d.carbs + d.fats, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Total Calories</Text>
      <View style={styles.totalRow}>
        <Text style={styles.totalVal}>{total.toLocaleString()}</Text>
        <Text style={styles.totalUnit}> cals</Text>
      </View>

      <StackedBarChart data={data} />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: PROTEIN_COLOR }]} />
          <Text style={styles.legendText}>Protein</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: CARBS_COLOR }]} />
          <Text style={styles.legendText}>Carbs</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: FATS_COLOR }]} />
          <Text style={styles.legendText}>Fats</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {WEEK_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setWeek(f)}
            style={[styles.filterBtn, week === f && styles.filterBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterBtnText, week === f && styles.filterBtnTextActive]}>{f}</Text>
          </TouchableOpacity>
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
  title: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  totalVal: {
    fontSize: 36,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  totalUnit: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textSecondary,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 3,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterBtnActive: {
    backgroundColor: Colors.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterBtnText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  filterBtnTextActive: {
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
});
