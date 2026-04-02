import { View, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import CategoryChip from './CategoryChip';

const FILTER_OPTIONS = ['All', 'Active', 'Completed', 'Missed', 'Archived'];

export default function HabitFilterTabs({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Search size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search habits..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {FILTER_OPTIONS.map((option) => (
          <CategoryChip
            key={option}
            label={option}
            isActive={activeFilter === option}
            onPress={() => onFilterChange(option)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
});
