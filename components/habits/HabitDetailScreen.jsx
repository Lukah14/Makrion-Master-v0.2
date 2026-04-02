import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import HabitDetailCalendar from './HabitDetailCalendar';
import HabitDetailStatistics from './HabitDetailStatistics';
import HabitDetailEdit from './HabitDetailEdit';
import { habitIconMap, getIconForCategory } from './habitIconMap';

const DARK = '#1A1A1A';
const CARD = '#2A2A2A';
const ACCENT = '#E8526A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = '#6B7280';

const TABS = ['Calendar', 'Statistics', 'Edit'];

export default function HabitDetailScreen({
  habit,
  initialTab = 'Calendar',
  onBack,
  onSaveEdit,
  onArchive,
  onDelete,
  onRestart,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!habit) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DARK} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <ChevronLeft size={22} color={ACCENT} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{habit.name}</Text>
          <View style={[styles.categoryIcon, { backgroundColor: habit.iconBg || '#E8F4FD' }]}>
            {(() => {
              const IconComp = (habit.iconName && habitIconMap[habit.iconName]) || getIconForCategory(habit.category);
              return <IconComp size={18} color={habit.iconColor || '#000000'} />;
            })()}
          </View>
        </View>

        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={styles.tabBtn}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>
          {activeTab === 'Calendar' && (
            <HabitDetailCalendar habit={habit} />
          )}
          {activeTab === 'Statistics' && (
            <HabitDetailStatistics habit={habit} />
          )}
          {activeTab === 'Edit' && (
            <HabitDetailEdit
              habit={habit}
              onSave={(updated) => { onSaveEdit?.(updated); onBack?.(); }}
              onArchive={(h) => { onArchive?.(h); onBack?.(); }}
              onDelete={(h) => { onDelete?.(h); onBack?.(); }}
              onRestart={onRestart}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: DARK,
    zIndex: 200,
  },
  safeArea: {
    flex: 1,
    backgroundColor: DARK,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: DARK,
    gap: 12,
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
    color: TEXT_PRIMARY,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: DARK,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED,
  },
  tabTextActive: {
    color: TEXT_PRIMARY,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: ACCENT,
    borderRadius: 1,
  },
  content: {
    flex: 1,
  },
});
