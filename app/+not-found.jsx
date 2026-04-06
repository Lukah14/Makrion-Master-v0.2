import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export default function NotFoundScreen() {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page not found</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.buttonText}>Go home</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
});
