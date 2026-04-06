import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

function formatFooter(lastDate) {
  if (!lastDate) return 'No weigh-in yet';
  const last = new Date(lastDate + 'T12:00:00');
  const now = new Date();
  const diff = Math.floor((now - last) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Weighed in today';
  if (diff === 1) return 'Last weigh-in: yesterday';
  return `Last weigh-in: ${diff}d ago`;
}

export default function WeightSummaryCard({ currentWeight, goalWeight, startWeight, lastDate }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const cw = currentWeight != null && Number.isFinite(Number(currentWeight)) ? Number(currentWeight) : null;
  const gw = goalWeight != null && Number.isFinite(Number(goalWeight)) ? Number(goalWeight) : null;
  const sw = startWeight != null && Number.isFinite(Number(startWeight)) ? Number(startWeight) : null;
  const total = sw != null && gw != null ? Math.abs(gw - sw) : 0;
  const done = sw != null && cw != null ? Math.abs(cw - sw) : 0;
  const progress = total > 0 ? Math.min(done / total, 1) : 0;

  const weightDisplay =
    cw != null
      ? `${cw % 1 === 0 ? String(cw) : cw.toFixed(1)}`
      : '—';

  return (
    <View style={styles.card}>
      <Text style={styles.label}>My Weight</Text>
      <Text style={styles.value}>
        {weightDisplay} <Text style={styles.unit}>kg</Text>
      </Text>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <Text style={styles.goalText}>
        Goal{' '}
        <Text style={styles.goalBold}>
          {gw != null ? `${gw % 1 === 0 ? String(gw) : gw.toFixed(1)} kg` : '—'}
        </Text>
      </Text>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{formatFooter(lastDate)}</Text>
      </View>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-Medium',
    marginBottom: 6,
  },
  value: {
    fontSize: 36,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    lineHeight: 42,
  },
  unit: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
  },
  barTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    backgroundColor: Colors.textPrimary,
    borderRadius: 2,
  },
  goalText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  goalBold: {
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  footer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans-Regular',
  },
});
