import { toDateKey } from '@/lib/dateKey';

export const userData = {
  name: 'Sarah',
  greeting: 'Good morning',
  avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
};

export const streakBadges = [
  { id: '1', label: 'Nutrition', days: 7, icon: 'heart', color: '#E86C5D', bgColor: '#FDECEA' },
  { id: '2', label: 'Activity', days: 12, icon: 'zap', color: '#22C55E', bgColor: '#DCFCE7' },
  { id: '3', label: 'Habits', days: 5, icon: 'check-square', color: '#4A9BD9', bgColor: '#E8F4FD' },
];

export const getWeekDates = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dates = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    dates.push({
      id: i.toString(),
      day: days[i],
      date: date.getDate(),
      isToday: date.toDateString() === today.toDateString(),
      fullDate: date,
      dateKey: toDateKey(date),
    });
  }
  return dates;
};

export const dailyGoals = {
  calories: { target: 2000, consumed: 1245, burned: 320 },
  protein: { target: 148, consumed: 74, unit: 'g' },
  carbs: { target: 200, consumed: 145, unit: 'g' },
  fat: { target: 65, consumed: 38, unit: 'g' },
  water: { target: 2.5, consumed: 1.25, unit: 'L', glasses: 6, filledGlasses: 3 },
  steps: { target: 10000, current: 6842 },
};

export const meals = [
  {
    id: '1',
    type: 'Breakfast',
    emoji: '\uD83C\uDF5E',
    time: '8:30 AM',
    totalCalories: 415,
    macros: { protein: 27, carbs: 59, fat: 7 },
    items: [
      { id: '1a', name: 'Oatmeal with Berries', amount: '250g', calories: 285, protein: 9, carbs: 52, fat: 4 },
      { id: '1b', name: 'Greek Yogurt', amount: '150g', calories: 130, protein: 18, carbs: 7, fat: 3 },
    ],
  },
  {
    id: '2',
    type: 'Lunch',
    emoji: '\u2600\uFE0F',
    time: '12:45 PM',
    totalCalories: 540,
    macros: { protein: 48, carbs: 46, fat: 16 },
    items: [
      { id: '2a', name: 'Grilled Chicken Salad', amount: '300g', calories: 380, protein: 42, carbs: 18, fat: 14 },
      { id: '2b', name: 'Whole Wheat Bread', amount: '60g', calories: 160, protein: 6, carbs: 28, fat: 2 },
    ],
  },
  {
    id: '3',
    type: 'Dinner',
    emoji: '\uD83C\uDF19',
    time: '7:10 PM',
    totalCalories: 485,
    macros: { protein: 38, carbs: 42, fat: 14 },
    items: [
      { id: '3a', name: 'Salmon with Quinoa', amount: '350g', calories: 485, protein: 38, carbs: 42, fat: 14 },
    ],
  },
  {
    id: '4',
    type: 'Snacks',
    emoji: '\uD83C\uDF4E',
    time: null,
    totalCalories: 0,
    macros: { protein: 0, carbs: 0, fat: 0 },
    items: [],
  },
];

export const activityData = {
  caloriesBurned: 320,
  activeMinutes: 35,
  steps: 6842,
  stepsGoal: 10000,
  stepProgress: 68,
  workouts: [
    { id: '1', name: 'Morning Run', duration: '25 min', calories: 210, type: 'running', time: '7:00 AM' },
    { id: '2', name: 'Yoga Flow', duration: '10 min', calories: 60, type: 'yoga', time: '6:30 AM' },
  ],
};

export const habitsData = {
  completed: 2,
  total: 7,
  habits: [
    { id: '1', name: 'Drink', emoji: '\uD83D\uDCA7', completed: true, color: '#4A9BD9', bgColor: '#E8F4FD' },
    { id: '2', name: '10,000', emoji: '\uD83D\uDC63', completed: false, color: '#6B7280', bgColor: '#F3F4F6' },
    { id: '3', name: 'Healthy', emoji: '\uD83E\uDD66', completed: true, color: '#FFFFFF', bgColor: '#2DA89E' },
    { id: '4', name: 'Workout', emoji: '\uD83D\uDCAA', completed: false, color: '#FFFFFF', bgColor: '#1A1A2E' },
    { id: '5', name: 'Meditate', emoji: '\uD83E\uDDD8', completed: false, color: '#E86C5D', bgColor: '#FDECEA' },
  ],
};

export const progressData = {
  currentWeight: 68.5,
  startWeight: 72.0,
  goalWeight: 62.0,
  weightLost: 3.5,
  percentDone: 65,
  streak: 7,
  weeklyWeights: [72, 71.2, 70.5, 70, 69.5, 69, 68.5],
};

export const recentlyLoggedData = [
  {
    id: '1',
    name: 'Salmon with Quinoa',
    time: '7:10 PM',
    calories: 485,
    protein: 38,
    carbs: 42,
    fat: 14,
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=200&h=150&dpr=1',
  },
  {
    id: '2',
    name: 'Grilled Chicken Salad',
    time: '12:45 PM',
    calories: 380,
    protein: 42,
    carbs: 18,
    fat: 14,
    image: 'https://images.pexels.com/photos/1095550/pexels-photo-1095550.jpeg?auto=compress&cs=tinysrgb&w=200&h=150&dpr=1',
  },
];

export const nutritionFoodDatabase = [
  { id: 'f1', name: 'Chicken Breast', brand: 'Generic', calories: 165, protein: 31, carbs: 0, fat: 3.6, per: '100g', image: 'https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { id: 'f2', name: 'Brown Rice', brand: 'Uncle Bens', calories: 112, protein: 2.3, carbs: 24, fat: 0.8, per: '100g', image: 'https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { id: 'f3', name: 'Salmon Fillet', brand: 'Fresh', calories: 208, protein: 20, carbs: 0, fat: 13, per: '100g', image: 'https://images.pexels.com/photos/3296279/pexels-photo-3296279.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { id: 'f4', name: 'Greek Yogurt', brand: 'Fage', calories: 59, protein: 10, carbs: 3.6, fat: 0.7, per: '100g', image: 'https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { id: 'f5', name: 'Banana', brand: 'Fresh', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, per: '100g', image: 'https://images.pexels.com/photos/2316466/pexels-photo-2316466.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { id: 'f6', name: 'Avocado', brand: 'Fresh', calories: 160, protein: 2, carbs: 9, fat: 15, per: '100g', image: 'https://images.pexels.com/photos/557659/pexels-photo-557659.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { id: 'f7', name: 'Oatmeal', brand: 'Quaker', calories: 68, protein: 2.4, carbs: 12, fat: 1.4, per: '100g', image: 'https://images.pexels.com/photos/216951/pexels-photo-216951.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { id: 'f8', name: 'Almonds', brand: 'Generic', calories: 579, protein: 21, carbs: 22, fat: 50, per: '100g', image: 'https://images.pexels.com/photos/1013420/pexels-photo-1013420.jpeg?auto=compress&cs=tinysrgb&w=100' },
];

export const exerciseLibrary = [
  { id: 'e1', name: 'Running', category: 'Cardio', caloriesPerMin: 10, bodyPart: 'Full Body', difficulty: 'Moderate', icon: 'running' },
  { id: 'e2', name: 'Push Ups', category: 'Strength', caloriesPerMin: 7, bodyPart: 'Chest', difficulty: 'Beginner', icon: 'dumbbell' },
  { id: 'e3', name: 'Squats', category: 'Strength', caloriesPerMin: 8, bodyPart: 'Legs', difficulty: 'Beginner', icon: 'dumbbell' },
  { id: 'e4', name: 'Yoga', category: 'Flexibility', caloriesPerMin: 4, bodyPart: 'Full Body', difficulty: 'Easy', icon: 'yoga' },
  { id: 'e5', name: 'Cycling', category: 'Cardio', caloriesPerMin: 9, bodyPart: 'Legs', difficulty: 'Moderate', icon: 'bike' },
  { id: 'e6', name: 'Plank', category: 'Strength', caloriesPerMin: 5, bodyPart: 'Core', difficulty: 'Beginner', icon: 'dumbbell' },
  { id: 'e7', name: 'Swimming', category: 'Cardio', caloriesPerMin: 11, bodyPart: 'Full Body', difficulty: 'Moderate', icon: 'swimming' },
  { id: 'e8', name: 'Deadlift', category: 'Strength', caloriesPerMin: 8, bodyPart: 'Back', difficulty: 'Advanced', icon: 'dumbbell' },
];

export const allHabitsData = [
  {
    id: 'h1', name: 'Drink 2.5L Water', type: 'numeric', target: 2500, current: 1500, unit: 'ml',
    emoji: '\uD83D\uDCA7', category: 'Health', streak: 12, bestStreak: 18, completed: false,
    iconName: 'plus', iconBg: '#84CC16', iconColor: '#FFFFFF',
    description: 'Stay hydrated throughout the day', repeatRule: 'daily', repeatDays: null,
    startDate: '2026-01-01', endDate: null, endDateEnabled: false, endDateDays: null,
    reminderTime: '08:00', reminderCount: 2, priority: 'high', color: '#4A9BD9',
    isPaused: false, checklistItems: null, sortOrder: 0, isArchived: false,
    completionHistory: [
      '2026-03-09','2026-03-10','2026-03-11','2026-03-12','2026-03-14',
      '2026-03-15','2026-03-16','2026-03-17','2026-03-18','2026-03-19','2026-03-20',
      '2026-02-20','2026-02-21','2026-02-22','2026-02-23','2026-02-24','2026-02-25','2026-02-26',
    ],
    notes: [
      { date: '2026-03-15', text: 'Hit 2.5L before dinner today!' },
      { date: '2026-03-10', text: 'Added a lemon to my water for variety' },
    ],
  },
  {
    id: 'h2', name: '10,000 Steps', type: 'numeric', target: 10000, current: 6842, unit: 'steps',
    emoji: '\uD83D\uDC5F', category: 'Movement', streak: 3, bestStreak: 9, completed: false,
    iconName: 'footprints', iconBg: '#8B5CF6', iconColor: '#FFFFFF',
    description: 'Walk at least 10,000 steps daily', repeatRule: 'daily', repeatDays: null,
    startDate: '2026-02-01', endDate: null, endDateEnabled: false, endDateDays: null,
    reminderTime: '07:00', reminderCount: 1, priority: 'default', color: '#9B59B6',
    isPaused: false, checklistItems: null, sortOrder: 1, isArchived: false,
    completionHistory: [
      '2026-03-11','2026-03-12','2026-03-15','2026-03-16','2026-03-19',
      '2026-02-15','2026-02-16','2026-02-17','2026-02-20',
    ],
    notes: [],
  },
  {
    id: 'h3', name: 'Healthy Breakfast', type: 'yesno', target: 1, current: 1, unit: '',
    emoji: '\uD83E\uDD66', category: 'Nutrition', streak: 7, bestStreak: 14, completed: true,
    iconName: 'utensils', iconBg: '#F59E0B', iconColor: '#FFFFFF',
    description: 'Eat a nutritious breakfast every morning', repeatRule: 'daily', repeatDays: null,
    startDate: '2026-01-15', endDate: null, endDateEnabled: false, endDateDays: null,
    reminderTime: '07:30', reminderCount: 1, priority: 'default', color: '#F5A623',
    isPaused: false, checklistItems: null, sortOrder: 2, isArchived: false,
    completionHistory: [
      '2026-03-14','2026-03-15','2026-03-16','2026-03-17','2026-03-18','2026-03-19','2026-03-21',
      '2026-03-07','2026-03-08','2026-03-09','2026-03-10',
      '2026-02-25','2026-02-26','2026-02-27',
    ],
    notes: [
      { date: '2026-03-18', text: 'Had overnight oats - so good!' },
    ],
  },
  {
    id: 'h4', name: 'Workout 45 min', type: 'timer', target: 45, current: 45, unit: 'min',
    emoji: '\uD83D\uDCAA', category: 'Movement', streak: 5, bestStreak: 12, completed: true,
    iconName: 'footprints', iconBg: '#8B5CF6', iconColor: '#FFFFFF',
    description: 'Complete a 45-minute workout session', repeatRule: 'specific_days_week', repeatDays: [1, 2, 3, 4, 5],
    startDate: '2026-01-01', endDate: null, endDateEnabled: false, endDateDays: null,
    reminderTime: '06:00', reminderCount: 1, priority: 'high', color: '#E86C5D',
    isPaused: false, checklistItems: null, sortOrder: 3, isArchived: false,
    completionHistory: [
      '2026-03-16','2026-03-17','2026-03-18','2026-03-19','2026-03-21',
      '2026-03-09','2026-03-10','2026-03-11','2026-03-12',
      '2026-02-23','2026-02-24','2026-02-25',
    ],
    notes: [],
  },
  {
    id: 'h5', name: 'Meditate 10 min', type: 'timer', target: 10, current: 0, unit: 'min',
    emoji: '\uD83E\uDDD8', category: 'Mind', streak: 0, bestStreak: 5, completed: false,
    iconName: 'brain', iconBg: '#EC4899', iconColor: '#FFFFFF',
    description: 'Practice mindfulness meditation', repeatRule: 'daily', repeatDays: null,
    startDate: '2026-03-01', endDate: null, endDateEnabled: false, endDateDays: null,
    reminderTime: '21:00', reminderCount: 1, priority: 'default', color: '#E86C5D',
    isPaused: false, checklistItems: null, sortOrder: 4, isArchived: false,
    completionHistory: [
      '2026-03-01','2026-03-02','2026-03-03','2026-03-04','2026-03-05',
    ],
    notes: [],
  },
  {
    id: 'h6', name: 'Sleep 8 hours', type: 'numeric', target: 8, current: 0, unit: 'hours',
    emoji: '\uD83D\uDE34', category: 'Health', streak: 8, bestStreak: 22, completed: false,
    iconName: 'plus', iconBg: '#84CC16', iconColor: '#FFFFFF',
    description: 'Get at least 8 hours of quality sleep', repeatRule: 'daily', repeatDays: null,
    startDate: '2026-01-01', endDate: null, endDateEnabled: false, endDateDays: null,
    reminderTime: '22:00', reminderCount: 1, priority: 'default', color: '#4A9BD9',
    isPaused: false, checklistItems: null, sortOrder: 5, isArchived: false,
    completionHistory: [
      '2026-03-13','2026-03-14','2026-03-15','2026-03-16','2026-03-17','2026-03-18','2026-03-19','2026-03-20',
      '2026-02-10','2026-02-11','2026-02-12',
    ],
    notes: [],
  },
  {
    id: 'h7', name: 'Read 30 pages', type: 'numeric', target: 30, current: 12, unit: 'pages',
    emoji: '\uD83D\uDCDA', category: 'Study', streak: 4, bestStreak: 7, completed: false,
    iconName: 'graduation-cap', iconBg: '#14B8A6', iconColor: '#FFFFFF',
    description: 'Read at least 30 pages of a book', repeatRule: 'daily', repeatDays: null,
    startDate: '2026-02-15', endDate: '2026-06-15', endDateEnabled: true, endDateDays: 120,
    reminderTime: '20:00', reminderCount: 1, priority: 'default', color: '#2DA89E',
    isPaused: false, checklistItems: null, sortOrder: 6, isArchived: false,
    completionHistory: [
      '2026-03-17','2026-03-18','2026-03-19','2026-03-20',
      '2026-03-10','2026-03-11','2026-03-12',
      '2026-02-20','2026-02-21','2026-02-22',
    ],
    notes: [
      { date: '2026-03-20', text: 'Finished chapter 12 of Atomic Habits' },
    ],
  },
  {
    id: 'h8', name: 'Morning Routine', type: 'checklist', target: 5, current: 3, unit: 'items',
    emoji: '\u2600\uFE0F', category: 'Home', streak: 10, bestStreak: 21, completed: false,
    iconName: 'home', iconBg: '#F97316', iconColor: '#1A1A2E',
    description: 'Complete morning routine checklist', repeatRule: 'daily', repeatDays: null,
    startDate: '2026-01-01', endDate: null, endDateEnabled: false, endDateDays: null,
    reminderTime: '06:30', reminderCount: 1, priority: 'high', color: '#F5A623',
    isPaused: false,
    checklistItems: [
      { id: 'cl1', text: 'Make bed', completed: true },
      { id: 'cl2', text: 'Stretch 5 min', completed: true },
      { id: 'cl3', text: 'Cold shower', completed: true },
      { id: 'cl4', text: 'Journal', completed: false },
      { id: 'cl5', text: 'Plan the day', completed: false },
    ],
    sortOrder: 7, isArchived: false,
    completionHistory: [
      '2026-03-11','2026-03-12','2026-03-13','2026-03-14','2026-03-15',
      '2026-03-16','2026-03-17','2026-03-18','2026-03-19','2026-03-21',
      '2026-02-25','2026-02-26','2026-02-27','2026-02-28',
    ],
    notes: [],
  },
  {
    id: 'h9', name: 'No sugar after 6pm', type: 'yesno', target: 1, current: 0, unit: '',
    emoji: '\uD83C\uDF6C', category: 'Nutrition', streak: 2, bestStreak: 6, completed: false,
    iconName: 'utensils', iconBg: '#F59E0B', iconColor: '#FFFFFF',
    description: 'Avoid sugary foods after 6pm', repeatRule: 'daily', repeatDays: null,
    startDate: '2026-02-01', endDate: null, endDateEnabled: false, endDateDays: null,
    reminderTime: '17:45', reminderCount: 1, priority: 'default', color: '#FF9800',
    isPaused: true, checklistItems: null, sortOrder: 8, isArchived: false,
    completionHistory: [
      '2026-03-19','2026-03-20',
      '2026-03-12','2026-03-13','2026-03-14','2026-03-15',
    ],
    notes: [],
  },
  {
    id: 'h10', name: 'Practice Guitar', type: 'timer', target: 20, current: 0, unit: 'min',
    emoji: '\uD83C\uDFB8', category: 'Art', streak: 0, bestStreak: 3, completed: false,
    iconName: 'paintbrush', iconBg: '#EC4899', iconColor: '#FFFFFF',
    description: 'Practice guitar for 20 minutes', repeatRule: 'specific_days_week', repeatDays: [1, 3, 5],
    startDate: '2026-03-01', endDate: null, endDateEnabled: false, endDateDays: null,
    reminderTime: '19:00', reminderCount: 0, priority: 'low', color: '#E86C5D',
    isPaused: false, checklistItems: null, sortOrder: 9, isArchived: true,
    completionHistory: [
      '2026-03-02','2026-03-04','2026-03-06',
    ],
    notes: [],
  },
];

export const habitCategories = [
  { id: 'cat1', name: 'Quit a bad habit', iconName: 'ban', iconColor: '#FFFFFF', iconBgColor: '#EF4444' },
  { id: 'cat2', name: 'Art', iconName: 'paintbrush', iconColor: '#FFFFFF', iconBgColor: '#EC4899' },
  { id: 'cat3', name: 'Meditation', iconName: 'person-standing', iconColor: '#FFFFFF', iconBgColor: '#6366F1' },
  { id: 'cat4', name: 'Study', iconName: 'graduation-cap', iconColor: '#FFFFFF', iconBgColor: '#14B8A6' },
  { id: 'cat5', name: 'Sports', iconName: 'bike', iconColor: '#FFFFFF', iconBgColor: '#3B82F6' },
  { id: 'cat6', name: 'Entertainment', iconName: 'star', iconColor: '#FFFFFF', iconBgColor: '#06B6D4' },
  { id: 'cat7', name: 'Social', iconName: 'message-square', iconColor: '#FFFFFF', iconBgColor: '#22C55E' },
  { id: 'cat8', name: 'Finance', iconName: 'dollar-sign', iconColor: '#1A1A2E', iconBgColor: '#A3E635' },
  { id: 'cat9', name: 'Health', iconName: 'plus', iconColor: '#FFFFFF', iconBgColor: '#84CC16' },
  { id: 'cat10', name: 'Work', iconName: 'briefcase', iconColor: '#1A1A2E', iconBgColor: '#D9F99D' },
  { id: 'cat11', name: 'Nutrition', iconName: 'utensils', iconColor: '#FFFFFF', iconBgColor: '#F59E0B' },
  { id: 'cat12', name: 'Home', iconName: 'home', iconColor: '#1A1A2E', iconBgColor: '#F97316' },
  { id: 'cat13', name: 'Outdoor', iconName: 'mountain', iconColor: '#1A1A2E', iconBgColor: '#FB923C' },
  { id: 'cat14', name: 'Other', iconName: 'grid-2x2', iconColor: '#FFFFFF', iconBgColor: '#EF4444' },
  { id: 'cat15', name: 'Movement', iconName: 'footprints', iconColor: '#FFFFFF', iconBgColor: '#8B5CF6' },
  { id: 'cat16', name: 'Mind', iconName: 'brain', iconColor: '#FFFFFF', iconBgColor: '#EC4899' },
];

export const motivationalQuotes = [
  '"Every healthy choice you make today is an investment in your future self."',
  '"Small daily improvements are the key to staggering long-term results."',
  '"The secret of getting ahead is getting started."',
  '"You don\'t have to be perfect, just consistent."',
  '"Discipline is choosing between what you want now and what you want most."',
  '"Success is the sum of small efforts repeated day in and day out."',
  '"The only bad workout is the one that didn\'t happen."',
  '"Take care of your body. It\'s the only place you have to live."',
];

export const progressHistory = {
  weights: [
    { date: '2025-12-01', value: 72.0 },
    { date: '2025-12-15', value: 71.2 },
    { date: '2026-01-01', value: 70.5 },
    { date: '2026-01-15', value: 70.0 },
    { date: '2026-02-01', value: 69.5 },
    { date: '2026-02-15', value: 69.0 },
    { date: '2026-03-01', value: 68.5 },
  ],
  weeklyCalories: [
    { day: 'Mon', value: 1850 },
    { day: 'Tue', value: 2100 },
    { day: 'Wed', value: 1950 },
    { day: 'Thu', value: 2200 },
    { day: 'Fri', value: 1800 },
    { day: 'Sat', value: 2050 },
    { day: 'Sun', value: 1245 },
  ],
  weeklySteps: [
    { day: 'Mon', value: 8200 },
    { day: 'Tue', value: 10500 },
    { day: 'Wed', value: 7800 },
    { day: 'Thu', value: 9200 },
    { day: 'Fri', value: 11000 },
    { day: 'Sat', value: 6500 },
    { day: 'Sun', value: 6842 },
  ],
};

export const memorableMoments = [
  { id: 'm1', date: '2026-03-19', text: 'Hit my protein goal every day this week!', mood: '\uD83D\uDE0A', type: 'achievement', moodRating: 9, photoUrl: null },
  { id: 'm2', date: '2026-03-17', text: 'First 5K run completed', mood: '\uD83C\uDF89', type: 'milestone', moodRating: 10, photoUrl: null },
  { id: 'm3', date: '2026-03-15', text: 'Feeling more energetic after cutting sugar', mood: '\u26A1', type: 'note', moodRating: 7, photoUrl: null },
];
