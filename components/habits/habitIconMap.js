import { Image } from 'react-native';
import React from 'react';

const icons = {
  'ban': require('@/src/Icons/habits_QuitABadHabit.png'),
  'paintbrush': require('@/src/Icons/habits_Art.png'),
  'person-standing': require('@/src/Icons/habits_Meditation.png'),
  'graduation-cap': require('@/src/Icons/habits_Study.png'),
  'bike': require('@/src/Icons/habits_Sports.png'),
  'star': require('@/src/Icons/habits_Entertainment.png'),
  'message-square': require('@/src/Icons/habits_Social.png'),
  'dollar-sign': require('@/src/Icons/habits_Finance.png'),
  'plus': require('@/src/Icons/habits_Health.png'),
  'briefcase': require('@/src/Icons/habits_Work.png'),
  'utensils': require('@/src/Icons/habits_Nutrition.png'),
  'home': require('@/src/Icons/habits_Home.png'),
  'mountain': require('@/src/Icons/habits_Outdoor.png'),
  'grid-2x2': require('@/src/Icons/habits_Other.png'),
  'footprints': require('@/src/Icons/habits_Sports.png'),
  'brain': require('@/src/Icons/habits_Meditation.png'),
};

const FALLBACK = icons['grid-2x2'];

export const habitIconMap = icons;

const categoryIconNameMap = {
  'Quit a bad habit': 'ban',
  'Art': 'paintbrush',
  'Meditation': 'person-standing',
  'Study': 'graduation-cap',
  'Sports': 'bike',
  'Entertainment': 'star',
  'Social': 'message-square',
  'Finance': 'dollar-sign',
  'Health': 'plus',
  'Work': 'briefcase',
  'Nutrition': 'utensils',
  'Home': 'home',
  'Outdoor': 'mountain',
  'Other': 'grid-2x2',
  'Movement': 'footprints',
  'Mind': 'brain',
};

export function getIconForCategory(categoryName) {
  const iconName = categoryIconNameMap[categoryName] || 'grid-2x2';
  return icons[iconName] || FALLBACK;
}

export function getIconNameForCategory(categoryName) {
  return categoryIconNameMap[categoryName] || 'grid-2x2';
}

export function getIconSource(iconName) {
  return icons[iconName] || FALLBACK;
}

/**
 * Renders a habit category icon as an Image.
 * Drop-in replacement for the old Lucide pattern.
 */
export function HabitCategoryIcon({ iconName, category, size = 20, style }) {
  const source = iconName ? (icons[iconName] || FALLBACK) : getIconForCategory(category);
  return (
    <Image
      source={source}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}
