import { View, Text, StyleSheet } from 'react-native';

export default function Badge({ label, color, bgColor, icon }) {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
});
