import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const createStyles = (Colors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    title: {
      fontSize: 20,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionText: {
      fontSize: 14,
      color: Colors.textTertiary,
      marginRight: 2,
    },
  });

export default function SectionHeader({ title, actionText, onAction }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {actionText && (
        <TouchableOpacity onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionText}</Text>
          <ChevronRight size={16} color={Colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
