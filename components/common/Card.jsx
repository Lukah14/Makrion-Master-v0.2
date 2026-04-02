import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';

const createStyles = (Colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: Colors.cardBackground,
      borderRadius: Layout.borderRadius.xl,
      padding: 16,
      marginBottom: 12,
      ...Layout.cardShadow,
    },
  });

export default function Card({ children, style }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return <View style={[styles.card, style]}>{children}</View>;
}
