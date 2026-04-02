import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function StepDots({ totalSteps, currentStep }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < currentStep ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.error,
  },
  dotInactive: {
    backgroundColor: Colors.innerBorder,
  },
});
