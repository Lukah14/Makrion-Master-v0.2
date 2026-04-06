import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export default function SettingsStackLayout() {
  const { colors: Colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerTintColor: Colors.textPrimary,
        headerStyle: { backgroundColor: Colors.background },
        headerTitleStyle: {
          fontFamily: 'PlusJakartaSans-Bold',
          fontSize: 17,
          color: Colors.textPrimary,
        },
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="personal" options={{ title: 'Personal details' }} />
      <Stack.Screen name="nutrition-goals" options={{ title: 'Nutrition goals' }} />
      <Stack.Screen name="goals-weight" options={{ title: 'Goals & weight' }} />
      <Stack.Screen name="weight-history" options={{ title: 'Weight history' }} />
    </Stack>
  );
}
