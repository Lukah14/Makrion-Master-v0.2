import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Grid2x2 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { habitCategories } from '@/data/mockData';
import { habitIconMap } from './habitIconMap';

function CategoryCard({ category, isSelected, onSelect }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const IconComponent = habitIconMap[category.iconName] || Grid2x2;

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={() => onSelect(category)}
      activeOpacity={0.7}
    >
      <Text style={styles.cardName} numberOfLines={2}>{category.name}</Text>
      <View style={[styles.iconBox, { backgroundColor: category.iconBgColor }]}>
        <IconComponent size={20} color={category.iconColor} />
      </View>
    </TouchableOpacity>
  );
}

export default function WizardStepCategory({ selectedCategory, onSelectCategory }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const displayCategories = habitCategories.filter(
    (c) => !['Movement', 'Mind'].includes(c.name)
  );

  const rows = [];
  for (let i = 0; i < displayCategories.length; i += 2) {
    rows.push(displayCategories.slice(i, i + 2));
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Select a category for your habit</Text>

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                isSelected={selectedCategory?.id === category.id}
                onSelect={onSelectCategory}
              />
            ))}
            {row.length === 1 && <View style={styles.cardPlaceholder} />}
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 28,
    marginTop: 10,
    lineHeight: 30,
  },
  grid: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.innerCard,
    borderRadius: 14,
    padding: 14,
    minHeight: 56,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: Colors.error,
  },
  cardPlaceholder: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
