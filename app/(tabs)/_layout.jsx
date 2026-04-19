import { Tabs } from 'expo-router';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { House } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { NutritionDateProvider } from '@/context/NutritionDateContext';
import { DomainStreaksProvider } from '@/context/DomainStreaksContext';

const NAV_NUTRITION = require('@/src/NavIcons/Nutrition.png');
const NAV_ACTIVITY = require('@/src/NavIcons/Activity.png');
const NAV_HABIT_TRACKER = require('@/src/NavIcons/HabitTracker.png');
const NAV_PROGRESS = require('@/src/NavIcons/Progress.png');

function NavIcon({ source, color, size }) {
  return (
    <Image
      source={source}
      style={{ width: size, height: size, tintColor: color }}
      resizeMode="contain"
    />
  );
}

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <NutritionDateProvider>
    <DomainStreaksProvider>
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'PlusJakartaSans-Medium',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarIcon: ({ color, size }) => (
            <NavIcon source={NAV_NUTRITION} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => (
            <NavIcon source={NAV_ACTIVITY} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={[styles.centerButton, { backgroundColor: colors.tabCenterButton }]}>
              <House size={24} color={isDark ? '#000000' : '#FFFFFF'} />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'H. Tracker',
          tabBarIcon: ({ color, size }) => (
            <NavIcon source={NAV_HABIT_TRACKER} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <NavIcon source={NAV_PROGRESS} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
    </DomainStreaksProvider>
    </NutritionDateProvider>
  );
}

const styles = StyleSheet.create({
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
