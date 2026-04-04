import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { ChevronLeft, CalendarDays, ChartBar as BarChartIcon, Pencil } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import HabitDetailCalendar from './HabitDetailCalendar';
import HabitDetailStatistics from './HabitDetailStatistics';
import HabitDetailEdit from './HabitDetailEdit';
import { habitIconMap, getIconForCategory } from './habitIconMap';

const ACCENT = '#E8526A';

const TABS = [
  { id: 'Calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'Statistics', label: 'Stats', Icon: BarChartIcon },
  { id: 'Edit', label: 'Edit', Icon: Pencil },
];

export default function HabitDetailScreen({
  habit,
  initialTab = 'Calendar',
  onBack,
  onSaveEdit,
  onDelete,
  onRestart,
  onOpenFullEditor,
  completionHistory = [],
  completionRows = [],
}) {
  const { colors: Colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, habit?.id]);

  if (!habit) return null;

  const tabIconMuted = Colors.textSecondary;
  const tabIconActive = Colors.textPrimary;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={Colors.background}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <ChevronLeft size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{habit.name}</Text>
          <View style={[styles.categoryIcon, { backgroundColor: habit.iconBg || '#E8F4FD' }]}>
            {(() => {
              const IconComp = (habit.iconName && habitIconMap[habit.iconName]) || getIconForCategory(habit.category);
              return <IconComp size={18} color={habit.iconColor || '#000000'} />;
            })()}
          </View>
        </View>

        <View style={styles.tabRail}>
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <TouchableOpacity
                key={id}
                style={[styles.tabPill, active && styles.tabPillActive]}
                onPress={() => setActiveTab(id)}
                activeOpacity={0.75}
              >
                <Icon size={17} color={active ? tabIconActive : tabIconMuted} />
                <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.content}>
          {activeTab === 'Calendar' && (
            <HabitDetailCalendar
              habit={habit}
              completionHistory={completionHistory}
              completionRows={completionRows}
            />
          )}
          {activeTab === 'Statistics' && (
            <HabitDetailStatistics habit={habit} completionHistory={completionHistory} />
          )}
          {activeTab === 'Edit' && (
            <View style={styles.editTab}>
              <TouchableOpacity
                style={styles.fullEditorCta}
                onPress={() => onOpenFullEditor?.(habit)}
                activeOpacity={0.85}
              >
                <Pencil size={18} color="#FFFFFF" />
                <Text style={styles.fullEditorCtaText}>Edit schedule, type & goals</Text>
              </TouchableOpacity>
              <HabitDetailEdit
                habit={habit}
                onSave={(updated) => { onSaveEdit?.(updated); onBack?.(); }}
                onDelete={(h) => { onDelete?.(h); onBack?.(); }}
                onRestart={onRestart}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(Colors, isDark) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: Colors.background,
      zIndex: 200,
    },
    safeArea: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: Colors.background,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors.border,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    categoryIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabRail: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: 4,
      marginBottom: 10,
      backgroundColor: Colors.innerCard,
      borderRadius: 14,
      padding: 4,
      gap: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Colors.innerBorder,
    },
    tabPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      borderRadius: 10,
    },
    tabPillActive: {
      backgroundColor: isDark ? 'rgba(232, 82, 106, 0.28)' : Colors.primaryLight,
    },
    tabPillText: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textSecondary,
    },
    tabPillTextActive: {
      color: Colors.textPrimary,
      fontFamily: 'PlusJakartaSans-Bold',
    },
    content: {
      flex: 1,
    },
    editTab: {
      flex: 1,
    },
    fullEditorCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginHorizontal: 16,
      marginBottom: 4,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: ACCENT,
    },
    fullEditorCtaText: {
      fontSize: 15,
      fontFamily: 'PlusJakartaSans-Bold',
      color: '#FFFFFF',
    },
  });
}
