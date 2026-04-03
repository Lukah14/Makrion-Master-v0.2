import { useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity,
  StyleSheet, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Target, Scale, History, Sun, Mail, Trash2, LogOut, ChevronRight } from 'lucide-react-native';
import { Layout } from '@/constants/layout';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { signOutUser } from '@/services/authService';
import AppearanceSheet from '@/components/settings/AppearanceSheet';

function SectionLabel({ label }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function SettingsCard({ children }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return <View style={styles.card}>{children}</View>;
}

function SettingsRow({ icon, iconBg, label, subtitle, onPress, right, showDivider = true, destructive = false }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.65 : 1}
    >
      {icon && (
        <View style={[styles.iconWrap, { backgroundColor: iconBg || Colors.background }]}>
          {icon}
        </View>
      )}
      <View style={styles.rowContent}>
        <View style={styles.rowInner}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, destructive && styles.destructiveLabel]}>{label}</Text>
            {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
          </View>
          <View style={styles.rowRight}>
            {right}
            {onPress && !right && (
              <ChevronRight size={16} color={Colors.textTertiary} />
            )}
          </View>
        </View>
        {showDivider && <View style={styles.divider} />}
      </View>
    </TouchableOpacity>
  );
}

const APPEARANCE_LABELS = { light: 'Light', dark: 'Dark', system: 'System' };

export default function SettingsScreen() {
  const { colors: Colors, preference: appearance, setPreference: setAppearance } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(Colors);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const displayName = user?.displayName || 'User';
  const displayEmail = user?.email || '';

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try { await signOutUser(); } catch {}
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Settings</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatarPlaceholder}>
            <User size={22} color={Colors.textTertiary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileMeta}>{displayEmail}</Text>
          </View>
        </View>

        <SectionLabel label="Personal" />
        <SettingsCard>
          <SettingsRow
            icon={<User size={16} color="#FFFFFF" />}
            iconBg="#1A1A2E"
            label="Personal details"
            subtitle="Name, age, height, weight"
            onPress={() => {}}
          />
          <SettingsRow
            icon={<Target size={16} color="#FFFFFF" />}
            iconBg="#2DA89E"
            label="Edit nutrition goals"
            subtitle="Calories, macros & targets"
            onPress={() => {}}
          />
          <SettingsRow
            icon={<Scale size={16} color="#FFFFFF" />}
            iconBg="#4A9BD9"
            label="Goals & current weight"
            subtitle="Track your weight goal"
            onPress={() => {}}
          />
          <SettingsRow
            icon={<History size={16} color="#FFFFFF" />}
            iconBg="#F5A623"
            label="Weight history"
            subtitle="View all weigh-ins"
            onPress={() => {}}
            showDivider={false}
          />
        </SettingsCard>

        <SectionLabel label="Preferences" />
        <SettingsCard>
          <SettingsRow
            icon={<Sun size={16} color="#FFFFFF" />}
            iconBg="#1A1A2E"
            label="Appearance"
            subtitle="Choose light, dark, or system appearance"
            onPress={() => setAppearanceOpen(true)}
            showDivider={false}
            right={
              <Text style={styles.metaValue}>{APPEARANCE_LABELS[appearance]}</Text>
            }
          />
        </SettingsCard>

        <SectionLabel label="Legal & Support" />
        <SettingsCard>
          <SettingsRow
            icon={<Mail size={16} color="#FFFFFF" />}
            iconBg="#2DA89E"
            label="Account Email"
            subtitle={displayEmail}
          />
          <SettingsRow
            icon={<Trash2 size={16} color="#FFFFFF" />}
            iconBg="#F44336"
            label="Delete Account"
            subtitle="Permanently remove all your data"
            onPress={handleDeleteAccount}
            showDivider={false}
            destructive
          />
        </SettingsCard>

        <TouchableOpacity style={styles.logoutCard} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={18} color="#E86C5D" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0</Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      <AppearanceSheet
        visible={appearanceOpen}
        current={appearance}
        onChange={setAppearance}
        onClose={() => setAppearanceOpen(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 8,
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: 30,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 20,
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    padding: 16,
    marginBottom: 24,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.border,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  profileMeta: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginTop: 2,
  },

  sectionLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },

  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginBottom: 14,
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  rowText: { flex: 1, marginRight: 8 },
  rowLabel: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
  },
  destructiveLabel: {
    color: Colors.error,
  },
  rowSubtitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginTop: 2,
    lineHeight: 17,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  metaValue: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
    marginRight: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },

  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.proteinLight,
    borderRadius: Layout.borderRadius.xl,
    paddingVertical: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.error,
  },

  versionText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginBottom: 8,
  },
});
