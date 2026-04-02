import {
  Ban, Paintbrush, PersonStanding, GraduationCap, Bike, Star,
  MessageSquare, DollarSign, Plus, Briefcase, UtensilsCrossed,
  Hop as Home, Mountain, Grid2x2, Footprints, Brain,
} from 'lucide-react-native';

export const habitIconMap = {
  'ban': Ban,
  'paintbrush': Paintbrush,
  'person-standing': PersonStanding,
  'graduation-cap': GraduationCap,
  'bike': Bike,
  'star': Star,
  'message-square': MessageSquare,
  'dollar-sign': DollarSign,
  'plus': Plus,
  'briefcase': Briefcase,
  'utensils': UtensilsCrossed,
  'home': Home,
  'mountain': Mountain,
  'grid-2x2': Grid2x2,
  'footprints': Footprints,
  'brain': Brain,
};

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
  return habitIconMap[iconName] || Grid2x2;
}

export function getIconNameForCategory(categoryName) {
  return categoryIconNameMap[categoryName] || 'grid-2x2';
}
