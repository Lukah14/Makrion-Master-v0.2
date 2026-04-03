import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatCalendarDateLine } from '@/lib/calendarUtils';

/**
 * @param {{ dateKey: string, onOpenCalendar: () => void, subtitle?: string, title?: string }} props
 * If title is omitted, shows English formatted date from dateKey.
 */
export default function SelectedDateBar({ dateKey, onOpenCalendar, subtitle, title }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const line = title ?? (dateKey ? formatCalendarDateLine(dateKey) : '');

  return (
    <TouchableOpacity style={s.row} onPress={onOpenCalendar} activeOpacity={0.75}>
      <View style={s.textBlock}>
        <Text style={s.line}>{line}</Text>
        {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
      </View>
      <View style={s.iconWrap}>
        <CalendarDays size={22} color={Colors.textPrimary} />
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  textBlock: {
    flex: 1,
  },
  line: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  sub: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
    marginTop: 4,
  },
  iconWrap: {
    padding: 6,
  },
});
