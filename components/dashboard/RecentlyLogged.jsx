import { View, Text, Image, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import SectionHeader from '@/components/common/SectionHeader';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';

function LoggedItem({ item }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.item}>
      <Image source={{ uri: item.image }} style={styles.itemImage} />
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemTime}>{item.time}</Text>
        </View>
        <View style={styles.itemStats}>
          <Flame size={12} color={Colors.calories} />
          <Text style={styles.itemCalories}>{item.calories} cal</Text>
        </View>
        <View style={styles.macrosRow}>
          <Text style={[styles.macroText, { color: Colors.proteinRing }]}>{'\u25CF'} {item.protein}g</Text>
          <Text style={[styles.macroText, { color: Colors.carbsRing }]}>{'\u25CF'} {item.carbs}g</Text>
          <Text style={[styles.macroText, { color: Colors.fatRing }]}>{'\u25CF'} {item.fat}g</Text>
        </View>
      </View>
    </View>
  );
}

export default function RecentlyLogged({ items }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  if (!items || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader title="Recently Logged" />
      {items.map((item) => (
        <LoggedItem key={item.id} item={item} />
      ))}
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.lg,
    padding: 12,
    marginBottom: 10,
    ...Layout.cardShadow,
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: Layout.borderRadius.md,
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    flex: 1,
  },
  itemTime: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  itemStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  itemCalories: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 10,
  },
  macroText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
  },
});
