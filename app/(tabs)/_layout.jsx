import { Tabs } from 'expo-router';
import { View, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { NutritionDateProvider } from '@/context/NutritionDateContext';
import { DomainStreaksProvider } from '@/context/DomainStreaksContext';
import {
  TAB_BAR_CONTENT_HEIGHT,
  TAB_BAR_TOP_PADDING,
  getTabBarBottomPadding,
} from '@/constants/tabBar';

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
  const insets = useSafeAreaInsets();

  /**
   * Edge-to-edge (Android 15 / `edgeToEdgeEnabled: true`) draws content behind the system
   * navigation bar. We disable React Navigation's internal safe-area padding
   * (`safeAreaInsets.bottom = 0`) and apply our own via `getTabBarBottomPadding` so it is
   * counted exactly once. The same helper feeds `useTabBarLayout`, which screens use to
   * keep their own scroll padding and floating buttons clear of the tab bar — guaranteeing
   * consistent geometry across the iPhone home indicator, Android gesture bar, Android
   * 3-button nav, and small-screen devices with no inset at all.
   */
  const tabBarPaddingBottom = getTabBarBottomPadding(insets.bottom);
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + TAB_BAR_TOP_PADDING + tabBarPaddingBottom;

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
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: TAB_BAR_TOP_PADDING,
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 10,
        },
        // Prevent React Navigation from adding its own bottom inset on top of ours
        safeAreaInsets: { bottom: 0 },
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
