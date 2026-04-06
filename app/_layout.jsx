import { useEffect } from 'react';
import '@/lib/firebase';
import { Stack, useSegments, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import AppearancePreferenceSync from '@/components/settings/AppearancePreferenceSync';
import { OnboardingNavProvider, useOnboardingNav } from '@/context/OnboardingNavContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useUserHealthProfile } from '@/hooks/useUserHealthProfile';
import { signOutUser } from '@/services/authService';
import { onboardingLog } from '@/lib/onboardingDebug';

SplashScreen.preventAutoHideAsync();

// Use group path only — `/(tabs)/index` often resolves to +not-found; `/(tabs)` opens the tab layout.
const DASHBOARD_HREF = '/(tabs)';

function NavigationGate() {
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading, error: profileError, complete, retry } = useUserHealthProfile();
  const { savedThisSession, gateRevision, saveSucceededRef, clearSavedFlag } = useOnboardingNav();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const { colors: Colors, isDark } = useTheme();

  const booting = authLoading || (!!user && profileLoading);

  useEffect(() => {
    const seg = segments ?? [];
    const path = typeof pathname === 'string' ? pathname : '';
    const onOnboarding =
      seg[0] === '(onboarding)' ||
      seg.includes('(onboarding)') ||
      path.includes('onboarding');
    if (complete && !onOnboarding) {
      clearSavedFlag();
    }
  }, [complete, segments, pathname, clearSavedFlag]);

  useEffect(() => {
    if (booting) return;
    if (user && profileError) return;

    const seg = segments ?? [];
    const segJoined = seg.join('/');
    const path = typeof pathname === 'string' ? pathname : '';
    const root = seg[0];

    const pendingSave = saveSucceededRef.current;
    const effective = complete || savedThisSession || pendingSave;

    // Segment-based first — avoid path.includes('login') false positives fighting onboarding.
    const inAuth =
      root === '(auth)' ||
      seg.includes('(auth)') ||
      segJoined.includes('(auth)') ||
      /\(auth\)/.test(path);

    const inOnboarding =
      root === '(onboarding)' ||
      seg.includes('(onboarding)') ||
      segJoined.includes('onboarding') ||
      path.includes('onboarding');

    const inTabs = root === '(tabs)' || seg.includes('(tabs)') || segJoined.includes('(tabs)');

    if (__DEV__) {
      onboardingLog('gate', {
        effective,
        complete,
        savedThisSession,
        pendingRef: pendingSave,
        gateRevision,
        root,
        pathname: path,
        segments: seg,
        inAuth,
        inOnboarding,
        inTabs,
      });
    }

    if (!user) {
      if (!inAuth) {
        onboardingLog('redirect → login');
        router.replace('/(auth)/login');
      }
      return;
    }

    // Must run before `inAuth`: loose pathname heuristics must not block post-save dashboard.
    if (effective && inOnboarding) {
      onboardingLog('redirect onboarding → dashboard (priority)');
      router.replace(DASHBOARD_HREF);
      return;
    }

    if (inAuth) {
      if (!effective) {
        onboardingLog('redirect auth → onboarding');
        router.replace('/(onboarding)');
      } else {
        onboardingLog('redirect auth → dashboard');
        router.replace(DASHBOARD_HREF);
      }
      return;
    }

    if (!effective && inTabs) {
      onboardingLog('redirect tabs → onboarding (incomplete)');
      router.replace('/(onboarding)');
      return;
    }
  }, [
    user,
    booting,
    profileError,
    complete,
    savedThisSession,
    gateRevision,
    segments,
    pathname,
    router,
    saveSucceededRef,
  ]);

  if (user && profileError && !booting) {
    return (
      <View style={[styles.blocker, { backgroundColor: Colors.background }]}>
        <Text style={[styles.errTitle, { color: Colors.textPrimary }]}>Couldn&apos;t load profile</Text>
        <Text style={[styles.errBody, { color: Colors.textSecondary }]}>{profileError}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: Colors.textPrimary }]}
          onPress={retry}
          activeOpacity={0.85}
        >
          <Text style={[styles.retryTxt, { color: Colors.onPrimary }]}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => signOutUser()} style={styles.signOutPad}>
          <Text style={{ color: Colors.textTertiary, fontFamily: 'PlusJakartaSans-SemiBold' }}>
            Sign out
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(settings)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      {booting ? (
        <View style={[styles.blocker, { backgroundColor: Colors.background }]}>
          <ActivityIndicator size="large" color={Colors.textPrimary} />
        </View>
      ) : null}
      <StatusBar style={isDark ? 'light-content' : 'dark-content'} />
    </View>
  );
}

function RootContent() {
  return (
    <AuthProvider>
      <OnboardingNavProvider>
        <AppearancePreferenceSync />
        <NavigationGate />
      </OnboardingNavProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  blocker: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  errTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  errBody: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  retryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  retryTxt: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  signOutPad: { marginTop: 20, padding: 12 },
});

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <RootContent />
    </ThemeProvider>
  );
}
