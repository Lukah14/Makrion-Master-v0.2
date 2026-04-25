import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';
import { Flag } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { todayDateKey, parseDateKey, toDateKey } from '@/lib/dateKey';

const screenWidth = Dimensions.get('window').width - 48;

const TIME_RANGES = ['90 Days', '6 Months', '1 Year', 'All time'];

function startKeyForRange(rangeLabel) {
  const end = todayDateKey();
  if (rangeLabel === 'All time') return null;
  const endD = parseDateKey(end);
  if (rangeLabel === '90 Days') {
    endD.setDate(endD.getDate() - 89);
    return toDateKey(endD);
  }
  if (rangeLabel === '6 Months') {
    endD.setMonth(endD.getMonth() - 6);
    return toDateKey(endD);
  }
  if (rangeLabel === '1 Year') {
    endD.setFullYear(endD.getFullYear() - 1);
    return toDateKey(endD);
  }
  endD.setDate(endD.getDate() - 89);
  return toDateKey(endD);
}

function WeightLineChart({ data }) {
  const { colors: Colors } = useTheme();
  const chartWidth = screenWidth - 32;
  const chartHeight = 160;
  const padTop = 16;
  const padBottom = 28;
  const padLeft = 40;
  const padRight = 12;
  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  if (!data?.length) {
    return (
      <View style={{ height: 160, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: Colors.textTertiary, fontFamily: 'PlusJakartaSans-Medium' }}>
          No entries in this range
        </Text>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values) - 0.5;
  const maxVal = Math.max(...values) + 0.5;
  const range = maxVal - minVal || 1;

  const toX = (i) => padLeft + (i / Math.max(data.length - 1, 1)) * innerW;
  const toY = (v) => padTop + (1 - (v - minVal) / range) * innerH;

  const pts = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');

  const areaBottom = padTop + innerH;
  const areaPts =
    `${toX(0)},${areaBottom} ` +
    data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ') +
    ` ${toX(data.length - 1)},${areaBottom}`;

  const gridLines = 5;
  const gridVals = Array.from({ length: gridLines }, (_, i) => minVal + (range / (gridLines - 1)) * i);

  return (
    <Svg width={chartWidth} height={chartHeight}>
      <Defs>
        <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Colors.textPrimary} stopOpacity="0.08" />
          <Stop offset="1" stopColor={Colors.textPrimary} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {gridVals.map((v, i) => {
        const y = toY(v);
        return (
          <Line
            key={i}
            x1={padLeft}
            y1={y}
            x2={chartWidth - padRight}
            y2={y}
            stroke="#E5E7EB"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        );
      })}

      {gridVals.map((v, i) => (
        <SvgText
          key={i}
          x={padLeft - 6}
          y={toY(v) + 4}
          fontSize={10}
          fill={Colors.textTertiary}
          textAnchor="end"
        >
          {v.toFixed(1)}
        </SvgText>
      ))}

      <Polygon points={areaPts} fill="url(#areaGrad)" />

      <Polyline
        points={pts}
        fill="none"
        stroke={Colors.textPrimary}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        return isLast ? (
          <SvgText
            key={i}
            x={toX(i)}
            y={toY(d.value) - 8}
            fontSize={10}
            fill={Colors.textPrimary}
            textAnchor="middle"
            fontWeight="bold"
          >
            {d.value}
          </SvgText>
        ) : null;
      })}

      {data.map((d, i) => (
        <SvgText
          key={`lbl-${i}`}
          x={toX(i)}
          y={chartHeight - 4}
          fontSize={10}
          fill={Colors.textTertiary}
          textAnchor="middle"
        >
          {d.label}
        </SvgText>
      ))}
    </Svg>
  );
}

/**
 * @param {Object} props
 * @param {number|null|undefined} props.currentWeight  latest weight (overall)
 * @param {number|null|undefined} props.goalWeight
 * @param {number|null|undefined} props.startWeight
 * @param {boolean} props.hasData
 * @param {Array<{ dateKey: string, weightKg: number }>} props.entries  ascending by dateKey
 */
export default function GoalProgressCard({
  currentWeight,
  goalWeight,
  startWeight,
  hasData,
  entries = [],
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [range, setRange] = useState('90 Days');

  const chartData = useMemo(() => {
    const start = startKeyForRange(range);
    const filtered =
      start == null
        ? entries
        : entries.filter((e) => e.dateKey >= start);
    return filtered.map((e) => ({
      label: new Date(e.dateKey + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: e.weightKg,
      dateKey: e.dateKey,
    }));
  }, [entries, range]);

  const data =
    chartData.length > 0
      ? chartData
      : currentWeight != null && Number.isFinite(Number(currentWeight))
        ? [{ label: 'Now', value: Number(currentWeight) }]
        : [];

  const sw = startWeight != null && Number.isFinite(Number(startWeight)) ? Number(startWeight) : null;
  const gw = goalWeight != null && Number.isFinite(Number(goalWeight)) ? Number(goalWeight) : null;
  const cw = currentWeight != null && Number.isFinite(Number(currentWeight)) ? Number(currentWeight) : null;

  const total = sw != null && gw != null ? Math.abs(gw - sw) : 0;
  const done = sw != null && cw != null ? Math.abs(cw - sw) : 0;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  const isActive = hasData && chartData.length > 1;

  const bannerText = isActive
    ? "You're making progress—now's the time to keep pushing!"
    : "Getting started is the hardest part. You're ready for this!";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Goal Progress</Text>
        <View style={styles.pctBadge}>
          <Flag size={12} color={Colors.textPrimary} />
          <Text style={styles.pctText}>{pct}% <Text style={styles.pctSuffix}>of goal</Text></Text>
        </View>
      </View>

      <View style={styles.rangeRow}>
        {TIME_RANGES.map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRange(r)}
            style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.rangeBtnText, range === r && styles.rangeBtnTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <WeightLineChart data={data} />

      <View style={styles.banner}>
        <Text style={styles.bannerText}>{bannerText}</Text>
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
    gap: 8,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  pctBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    flexShrink: 1,
  },
  pctText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  pctSuffix: {
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
  },
  rangeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  rangeBtnActive: {
    backgroundColor: Colors.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  rangeBtnText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  rangeBtnTextActive: {
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  banner: {
    marginTop: 14,
    backgroundColor: Colors.successLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bannerText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.success,
    textAlign: 'center',
  },
});
