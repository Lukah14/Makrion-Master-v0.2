import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { buildMonthGridCells, monthLabel, WEEKDAY_SHORT } from '@/lib/calendarUtils';

/** Reference-style green ring for days with logged data */
export const CALENDAR_TRACKED_GREEN = '#2F9D5C';
const BORDER_LIGHT = '#E8E8E8';

/**
 * @param {Object} props
 * @param {number} props.year
 * @param {number} props.monthIndex 0-11
 * @param {string} props.selectedDateKey YYYY-MM-DD
 * @param {(dateKey: string) => void} [props.onSelectDay]
 * @param {Record<string, { hasTrackedData?: boolean, hasMoment?: boolean }>} [props.monthMeta]
 * @param {boolean} [props.loading]
 * @param {() => void} props.onPrevMonth
 * @param {() => void} props.onNextMonth
 * @param {() => void} [props.onTitlePress] month/year picker
 * @param {'light' | 'dark'} [props.variant]
 * @param {boolean} [props.interactiveHeader=true]
 */
export default function MonthlyCalendar({
  year,
  monthIndex,
  selectedDateKey,
  onSelectDay,
  monthMeta = {},
  loading = false,
  onPrevMonth,
  onNextMonth,
  onTitlePress,
  variant = 'light',
  interactiveHeader = true,
}) {
  const { colors: Colors } = useTheme();
  const { width: winW } = useWindowDimensions();
  const isDark = variant === 'dark';

  const textPrimary = isDark ? '#FFFFFF' : Colors.textPrimary;
  const textMuted = isDark ? '#8E8E93' : '#B0B0B0';
  const chevronColor = isDark ? '#8E8E93' : Colors.textTertiary;
  const bg = isDark ? 'transparent' : Colors.background;

  const { label } = monthLabel(year, monthIndex);
  const cells = buildMonthGridCells(year, monthIndex);
  const pad = 8;
  const gridW = Math.min(winW - 32, 400);
  const cellW = (gridW - pad * 2) / 7;
  const circle = Math.min(44, cellW - 6);

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {interactiveHeader && (
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.titleTouchable}
            onPress={onTitlePress}
            disabled={!onTitlePress}
            activeOpacity={onTitlePress ? 0.6 : 1}
            hitSlop={8}
          >
            <Text style={[styles.monthTitle, { color: textPrimary }]}>{label}</Text>
            {onTitlePress ? (
              <ChevronDown size={18} color={chevronColor} style={styles.titleChevron} />
            ) : null}
          </TouchableOpacity>
          <View style={styles.navArrows}>
            <TouchableOpacity onPress={onPrevMonth} style={styles.arrowBtn} hitSlop={10} activeOpacity={0.6}>
              <ChevronLeft size={22} color={textPrimary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onNextMonth} style={styles.arrowBtn} hitSlop={10} activeOpacity={0.6}>
              <ChevronRight size={22} color={textPrimary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={CALENDAR_TRACKED_GREEN} />
        </View>
      ) : null}

      <View style={[styles.grid, { width: gridW, paddingHorizontal: pad }]}>
        {cells.map((cell) => {
          const meta = monthMeta[cell.dateKey] || {};
          const tracked = !!meta.hasTrackedData;
          const dot = !!meta.hasMoment;
          const selected = cell.dateKey === selectedDateKey;
          const overflow = !cell.inMonth;

          let borderColor = BORDER_LIGHT;
          let borderW = 1;
          if (overflow) {
            borderColor = 'transparent';
            borderW = 0;
          } else if (tracked) {
            borderColor = CALENDAR_TRACKED_GREEN;
            borderW = 2;
          }

          if (selected && !overflow) {
            borderColor = tracked ? CALENDAR_TRACKED_GREEN : textPrimary;
            borderW = 2;
          }

          const labelColor = overflow ? textMuted : textPrimary;
          const fill =
            selected && !overflow
              ? tracked
                ? 'rgba(47, 157, 92, 0.1)'
                : isDark
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(0,0,0,0.06)'
              : 'transparent';

          return (
            <TouchableOpacity
              key={cell.dateKey}
              style={[styles.cell, { width: cellW, height: cellW + 4 }]}
              onPress={() => onSelectDay?.(cell.dateKey)}
              disabled={!onSelectDay}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.circle,
                  {
                    width: circle,
                    height: circle,
                    borderRadius: circle / 2,
                    borderWidth: borderW,
                    borderColor,
                    backgroundColor: fill,
                  },
                ]}
              >
                <Text style={[styles.dayNum, { color: labelColor, fontSize: circle > 40 ? 17 : 15 }]}>
                  {cell.day}
                </Text>
                {dot && !overflow ? <View style={[styles.dot, { backgroundColor: textPrimary }]} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.weekdayRow, { width: gridW, paddingHorizontal: pad }]}>
        {WEEKDAY_SHORT.map((d) => (
          <Text key={d} style={[styles.weekdayLabel, { width: cellW, color: textMuted }]}>
            {d}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  titleTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  monthTitle: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.3,
  },
  titleChevron: {
    marginLeft: 4,
    marginTop: 2,
  },
  navArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowBtn: {
    padding: 6,
  },
  loadingRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignSelf: 'center',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayNum: {
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  dot: {
    position: 'absolute',
    bottom: 7,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignSelf: 'center',
    marginTop: 10,
    paddingBottom: 4,
  },
  weekdayLabel: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
  },
});
