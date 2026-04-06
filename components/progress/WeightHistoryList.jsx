import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

/**
 * Recent weigh-ins (newest first). Tap row to edit.
 * @param {Object} props
 * @param {Array<{ dateKey: string, weightKg: number }>} props.entries  any order; sorted internally
 * @param {(entry: { dateKey: string, weightKg: number }) => void} props.onEditEntry
 * @param {number} [props.maxRows=12]
 */
export default function WeightHistoryList({ entries = [], onEditEntry, maxRows = 12 }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const sorted = [...entries].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  const rows = sorted.slice(0, maxRows);

  if (rows.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Weigh-in history</Text>
      <Text style={styles.hint}>Tap a row to edit or delete</Text>
      {rows.map((e, idx) => (
        <TouchableOpacity
          key={e.dateKey}
          style={[styles.row, idx === rows.length - 1 && styles.rowLast]}
          onPress={() => onEditEntry?.(e)}
          activeOpacity={0.65}
        >
          <View>
            <Text style={styles.date}>
              {new Date(e.dateKey + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.kg}>
              {typeof e.weightKg === 'number' ? e.weightKg.toFixed(1).replace(/\.0$/, '') : '—'} kg
            </Text>
            <Pencil size={16} color={Colors.textTertiary} />
          </View>
        </TouchableOpacity>
      ))}
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
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 12,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  date: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kg: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
});
