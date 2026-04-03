import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useSelectedDate } from '@/context/NutritionDateContext';
import { yearMonthFromDateKey, formatCalendarDateLine } from '@/lib/calendarUtils';
import { todayDateKey } from '@/lib/dateKey';
import MonthlyCalendar from '@/components/calendar/MonthlyCalendar';
import { useCalendarMonthMetadata } from '@/hooks/useCalendarMonthMetadata';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Full-screen calendar matching reference: month grid, metadata, global date.
 * @param {{ visible: boolean, onClose: () => void }} props
 */
export default function CalendarModal({ visible, onClose }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const { dateKey: selectedDateKey, setDateKey, calendarRefreshKey } = useSelectedDate();

  const [viewYear, setViewYear] = useState(() => yearMonthFromDateKey(selectedDateKey).year);
  const [viewMonth, setViewMonth] = useState(() => yearMonthFromDateKey(selectedDateKey).monthIndex);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      const { year, monthIndex } = yearMonthFromDateKey(selectedDateKey);
      setViewYear(year);
      setViewMonth(monthIndex);
    }
  }, [visible, selectedDateKey]);

  const { meta, loading } = useCalendarMonthMetadata(viewYear, viewMonth, calendarRefreshKey);

  const goPrev = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const goNext = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  const onSelectDay = useCallback(
    (key) => {
      setDateKey(key);
      onClose();
    },
    [setDateKey, onClose]
  );

  const applyPicker = (y, m) => {
    setViewYear(y);
    setViewMonth(m);
    setPickerOpen(false);
  };

  const today = todayDateKey();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Calendar</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={s.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={s.todayRow}
            onPress={() => {
              setDateKey(today);
              const { year, monthIndex } = yearMonthFromDateKey(today);
              setViewYear(year);
              setViewMonth(monthIndex);
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Text style={s.todayText}>Jump to today</Text>
            <Text style={s.todayMeta}>{formatCalendarDateLine(today)}</Text>
          </TouchableOpacity>

          <MonthlyCalendar
            year={viewYear}
            monthIndex={viewMonth}
            selectedDateKey={selectedDateKey}
            onSelectDay={onSelectDay}
            monthMeta={meta}
            loading={loading}
            onPrevMonth={goPrev}
            onNextMonth={goNext}
            onTitlePress={() => setPickerOpen(true)}
            variant="light"
          />

          <MonthYearPickerModal
            visible={pickerOpen}
            year={viewYear}
            monthIndex={viewMonth}
            onApply={applyPicker}
            onClose={() => setPickerOpen(false)}
            colors={Colors}
          />
        </View>
      </View>
    </Modal>
  );
}

function MonthYearPickerModal({ visible, year, monthIndex, onApply, onClose, colors: Colors }) {
  const s = createPickerStyles(Colors);
  const startYear = new Date().getFullYear() - 5;
  const endYear = new Date().getFullYear() + 2;
  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.box} onPress={() => {}}>
          <Text style={s.pickerTitle}>Month & year</Text>
          <View style={s.pickerCols}>
            <ScrollView style={s.col} showsVerticalScrollIndicator={false}>
              {MONTHS.map((name, idx) => (
                <TouchableOpacity
                  key={name}
                  style={[s.opt, idx === monthIndex && s.optOn]}
                  onPress={() => onApply(year, idx)}
                >
                  <Text style={[s.optText, idx === monthIndex && s.optTextOn]}>{name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView style={s.col} showsVerticalScrollIndicator={false}>
              {years.map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[s.opt, y === year && s.optOn]}
                  onPress={() => onApply(y, monthIndex)}
                >
                  <Text style={[s.optText, y === year && s.optTextOn]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginTop: 10,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  doneText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.primary,
  },
  todayRow: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.innerCard,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  todayMeta: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-Medium',
  },
});

const createPickerStyles = (Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  box: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerCols: {
    flexDirection: 'row',
    gap: 12,
    maxHeight: 360,
  },
  col: {
    flex: 1,
  },
  opt: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  optOn: {
    backgroundColor: Colors.textPrimary,
  },
  optText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  optTextOn: {
    color: Colors.onPrimary,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  cancelBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
});
