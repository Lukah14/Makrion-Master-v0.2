import { View, Text, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const createStyles = (Colors) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    count: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-Bold',
    },
    label: {
      fontSize: 11,
      fontFamily: 'PlusJakartaSans-Medium',
      color: Colors.textTertiary,
      marginLeft: 2,
    },
  });

export default function StrikeBadge({ count, label, color }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const accentColor = color || Colors.streakFire;

  return (
    <View style={[styles.badge, { backgroundColor: accentColor + '14' }]}>
      <Flame size={14} color={accentColor} />
      <Text style={[styles.count, { color: accentColor }]}>{count}</Text>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}
