import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import '@/lib/firebase';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BootErrorBoundary from '@/components/common/BootErrorBoundary';

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[BOOT:root_layout] loaded (Firebase + Auth modules initialized via firebase.js import)');
}
import { Stack, useSegments, useRouter, usePathname, useNavigationContainerRef } from 'expo-router';
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
import { UserProfileProvider } from '@/context/UserProfileContext';
import AppearancePreferenceSync from '@/components/settings/AppearancePreferenceSync';
import { OnboardingNavProvider, useOnboardingNav } from '@/context/OnboardingNavContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useUserHealthProfile } from '@/hooks/useUserHealthProfile';
import { signOutUser } from '@/services/authService';
import {
  GATE_BOOT_FAILSAFE_MS,
  ABSOLUTE_BOOT_FAILSAFE_MS,
} from '@/lib/bootstrapConstants';
import { onboardingLog, onboardingFlowLog, bootLog, bootStage } from '@/lib/onboardingDebug';
import { flowLog } from '@/lib/flowLog';

SplashScreen.preventAutoHideAsync();

// Use group path only — `/(tabs)/index` often resolves to +not-found; `/(tabs)` opens the tab layout.
const DASHBOARD_HREF = '/(tabs)';

function NavigationGate({ fontsReady }) {
  const { user, loading: authLoading } = useAuth();
  const {
    loading: profileLoading,
    error: profileError,
    complete,
    retry,
    profileResolved,
  } = useUserHealthProfile();
  const { savedThisSession, gateRevision, saveSucceededRef, clearSavedFlag } = useOnboardingNav();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const navigationRef = useNavigationContainerRef();
  const { colors: Colors, isDark } = useTheme();

  const [gateFailsafe, setGateFailsafe] = useState(false);
  const [absoluteBootstrapDone, setAbsoluteBootstrapDone] = useState(false);
  const prevBootingRef = useRef(null);

  /** Same `router.replace(href)` twice in one commit cycle (e.g. auth + profile hook update) crashes Expo Router. */
  const lastGateReplaceRef = useRef({ href: null, at: 0 });

  /** C) Last line of defense: never show the gate spinner past this deadline. */
  useEffect(() => {
    bootStage('bootstrap', `absolute failsafe armed (${ABSOLUTE_BOOT_FAILSAFE_MS}ms)`);
    const t = setTimeout(() => {
      bootLog(
        `ABSOLUTE bootstrap failsafe (${ABSOLUTE_BOOT_FAILSAFE_MS}ms): force end loading / allow routing`,
      );
      setAbsoluteBootstrapDone(true);
    }, ABSOLUTE_BOOT_FAILSAFE_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    bootLog('gate: bootstrap timer reset', { uid: user?.uid ?? null });
    setGateFailsafe(false);
    if (!user?.uid) {
      bootLog('gate: signed out — profile gate failsafe not armed');
      return undefined;
    }
    const t = setTimeout(() => {
      bootLog(
        `gate failsafe (${GATE_BOOT_FAILSAFE_MS}ms): unblock navigation (duplicate safety vs profile listener)`,
      );
      setGateFailsafe(true);
    }, GATE_BOOT_FAILSAFE_MS);
    return () => clearTimeout(t);
  }, [user?.uid]);

  const effectiveComplete = complete || savedThisSession || saveSucceededRef.current;
  /**
   * A–H bootstrap: wait for auth when signed out; when signed in wait for profile resolution
   * (first snapshot, error, or profile failsafe) unless onboarding already signalled complete this session.
   * `authLoading` must not block once `user` is set.
   */
  /**
   * Do not tie booting to `gateFailsafe`: that timer used to unblock at 6s while UserProfileProvider
   * was still running getDoc retries after listener Target-ID failures — causing a false onboarding redirect.
   */
  const booting =
    !absoluteBootstrapDone &&
    ((!user && authLoading) || (!!user && !effectiveComplete && !profileResolved));

  useEffect(() => {
    if (prevBootingRef.current !== booting) {
      flowLog(booting ? 'LOADING_START' : 'LOADING_END', {
        scope: 'navigation_gate_booting',
        booting,
        hasUser: !!user,
        effectiveComplete,
        profileResolved,
      });
      prevBootingRef.current = booting;
    }
  }, [booting, user, effectiveComplete, profileResolved]);

  useEffect(() => {
    if (!fontsReady) return;
    flowLog('ONBOARDING_GUARD_RESULT', {
      hasUser: !!user,
      authLoading,
      profileLoading,
      profileResolved,
      profileError: profileError || null,
      complete,
      savedThisSession,
      pendingSave: saveSucceededRef.current,
      effectiveComplete,
      booting,
      gateFailsafe,
      absoluteBootstrapDone,
    });
  }, [
    fontsReady,
    user,
    authLoading,
    profileLoading,
    profileResolved,
    profileError,
    complete,
    savedThisSession,
    effectiveComplete,
    booting,
    gateFailsafe,
    absoluteBootstrapDone,
    gateRevision,
  ]);

  /**
   * Only clear the post-save latch once the user has actually left onboarding routes.
   * Do NOT use loose path.includes('onboarding') — empty/wrong segments + complete=true could clear
   * saveSucceededRef while the wizard is still visible and before notifyProfileSaved runs.
   */
  useEffect(() => {
    const seg = segments ?? [];
    const path = typeof pathname === 'string' ? pathname : '';
    const inOnboardingGroup =
      seg[0] === '(onboarding)' ||
      seg.includes('(onboarding)') ||
      /\(onboarding\)/.test(path);
    const inTabsGroup = seg[0] === '(tabs)' || seg.includes('(tabs)') || /\(tabs\)/.test(path);
    if (complete && inTabsGroup && !inOnboardingGroup) {
      onboardingFlowLog('guard: clear local save flags — Firestore complete and user on tabs');
      flowLog('CLEAR_SAVE_LATCH', { reason: 'firestore_complete_on_tabs' });
      clearSavedFlag();
    }
  }, [complete, segments, pathname, clearSavedFlag]);

  /**
   * Defer router.replace until fonts are loaded, boot finished, and the root NavigationContainer
   * is ready — avoids "Attempted to navigate before mounting the Root Layout" (Expo Router).
   */
  useEffect(() => {
    if (!fontsReady) {
      if (__DEV__) bootStage('nav', 'waiting — fonts not ready');
      return undefined;
    }

    if (booting) {
      if (__DEV__) bootStage('nav', 'waiting — booting true');
      return undefined;
    }

    let cancelled = false;
    let removeNavListener = null;

    const gateReplace = (href) => {
      const now = Date.now();
      const prev = lastGateReplaceRef.current;
      if (prev.href === href && now - prev.at < 1200) {
        bootLog('nav: skip duplicate gate replace', href);
        flowLog('NAV_SKIP_DUPLICATE', { href, msSince: now - prev.at });
        return;
      }
      lastGateReplaceRef.current = { href, at: now };
      if (href === DASHBOARD_HREF) {
        flowLog('NAVIGATE_DASHBOARD', { href });
        flowLog('DASHBOARD_ROUTE', { href });
      } else if (href === '/(onboarding)') {
        flowLog('NAVIGATE_ONBOARDING');
        flowLog('ONBOARDING_ROUTE', { href });
      } else if (String(href).includes('login')) flowLog('NAVIGATE_LOGIN', { href });
      router.replace(href);
    };

    const applyGate = () => {
      if (cancelled || !navigationRef.isReady()) return;

      flowLog('ONBOARDING_GUARD_RUN', {
        hasUser: !!user,
        booting,
        profileResolved,
        complete,
      });

      if (__DEV__) bootStage('nav', 'bootstrap decision (A–H)');

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

    const inSettings =
      root === '(settings)' ||
      seg.includes('(settings)') ||
      segJoined.includes('(settings)') ||
      path.includes('(settings)');

    if (inOnboarding || pendingSave || (user && profileError)) {
      onboardingFlowLog('guard check result', {
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
        inSettings,
        gateFailsafe,
      });
    }

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
        inSettings,
        gateFailsafe,
      });
    }

    if (!user) {
      lastGateReplaceRef.current = { href: null, at: 0 };
      if (!inAuth) {
        flowLog('REDIRECT_AUTH', '/(auth)/login');
        bootLog('navigating to login', 'no auth user');
        onboardingFlowLog('guard: redirect → login');
        onboardingLog('redirect → login');
        gateReplace('/(auth)/login');
      }
      bootLog('loading finished', 'unauthenticated');
      return;
    }

    if (user && profileError && !effective && !gateFailsafe && !absoluteBootstrapDone) {
      onboardingFlowLog('guard: stop — profileError, not complete yet', String(profileError));
      onboardingLog('gate: stop — profileError and no effective complete yet', profileError);
      return;
    }
    if (user && profileError && !effective && (gateFailsafe || absoluteBootstrapDone)) {
      flowLog('REDIRECT_ONBOARDING', { reason: 'profile_error_failsafe' });
      bootLog(
        'navigating to onboarding',
        'profile listener error — fallback after failsafe (missing/incomplete treated as onboarding)',
      );
      bootLog('gate failsafe: route despite profile listener error');
      onboardingFlowLog('gate: failsafe with profileError — allow routing fallback');
    }
    if (user && profileError && effective) {
      onboardingFlowLog('guard: profileError ignored — local/Firestore complete allows app', String(profileError));
      onboardingLog(
        'gate: profileError ignored because save/local complete is true — allow navigation',
        profileError,
      );
    }

    // Must run before `inAuth`: loose pathname heuristics must not block post-save dashboard.
    if (effective && inOnboarding) {
      flowLog('NAVIGATE_DASHBOARD', { from: 'onboarding', href: DASHBOARD_HREF });
      bootLog('navigating to dashboard', 'profile complete — leaving onboarding');
      onboardingFlowLog('guard: redirect onboarding → dashboard (replace)', DASHBOARD_HREF);
      onboardingLog('redirect onboarding → dashboard (priority)', {
        complete,
        savedThisSession,
        pendingRef: pendingSave,
      });
      gateReplace(DASHBOARD_HREF);
      return;
    }

    if (inAuth) {
      if (!effective) {
        flowLog('REDIRECT_ONBOARDING', { from: 'auth', reason: 'incomplete' });
        bootLog('navigating to onboarding', 'signed in — profile missing or incomplete');
        onboardingFlowLog('guard: redirect auth → onboarding');
        onboardingLog('redirect auth → onboarding');
        gateReplace('/(onboarding)');
      } else {
        flowLog('NAVIGATE_DASHBOARD', { from: 'auth', href: DASHBOARD_HREF });
        bootLog('navigating to dashboard', 'signed in — profile complete');
        onboardingFlowLog('guard: redirect auth → dashboard');
        onboardingLog('redirect auth → dashboard');
        gateReplace(DASHBOARD_HREF);
      }
      bootLog('loading finished', 'auth stack');
      return;
    }

    if (!effective && inTabs) {
      flowLog('REDIRECT_ONBOARDING', { from: 'tabs', reason: 'incomplete_profile' });
      bootLog('navigating to onboarding', 'incomplete profile — was on tabs');
      onboardingFlowLog('guard: redirect tabs → onboarding (incomplete profile)');
      onboardingLog('redirect tabs → onboarding (incomplete)');
      gateReplace('/(onboarding)');
      return;
    }

    if (!effective && inSettings) {
      flowLog('REDIRECT_ONBOARDING', { from: 'settings', reason: 'incomplete_profile' });
      bootLog('navigating to onboarding', 'incomplete profile — was on settings');
      onboardingFlowLog('guard: redirect settings → onboarding (incomplete profile)');
      gateReplace('/(onboarding)');
      return;
    }

    const inKnownArea = inAuth || inOnboarding || inTabs || inSettings;
    if (user && !effective && !inKnownArea) {
      flowLog('REDIRECT_ONBOARDING', { from: 'ambiguous', reason: 'incomplete' });
      bootLog('navigating to onboarding', 'ambiguous route — incomplete', { path, segments: seg });
      onboardingFlowLog('guard: ambiguous route → onboarding (incomplete)');
      gateReplace('/(onboarding)');
      return;
    }
    if (user && effective && !inKnownArea) {
      flowLog('NAVIGATE_DASHBOARD', { from: 'ambiguous', href: DASHBOARD_HREF });
      bootLog('navigating to dashboard', 'ambiguous route — complete', { path, segments: seg });
      onboardingFlowLog('guard: ambiguous route → dashboard (complete)');
      gateReplace(DASHBOARD_HREF);
      return;
    }

    bootLog('loading finished', 'no redirect needed', { path, segments: seg, profileLoading });
    };

    const tryApply = () => {
      if (cancelled) return;
      if (navigationRef.isReady()) {
        applyGate();
        return;
      }
      removeNavListener = navigationRef.addListener('state', () => {
        if (cancelled || !navigationRef.isReady()) return;
        applyGate();
        try {
          removeNavListener?.();
        } catch {
          /* ignore */
        }
        removeNavListener = null;
      });
    };

    const timeoutId = setTimeout(tryApply, 0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      try {
        removeNavListener?.();
      } catch {
        /* ignore */
      }
    };
  }, [
    fontsReady,
    user,
    booting,
    profileError,
    complete,
    savedThisSession,
    gateRevision,
    segments,
    pathname,
    router,
    navigationRef,
    saveSucceededRef,
    profileLoading,
    gateFailsafe,
    absoluteBootstrapDone,
    profileResolved,
  ]);

  const showProfileErrorScreen =
    fontsReady &&
    user &&
    profileError &&
    !booting &&
    !effectiveComplete &&
    !gateFailsafe &&
    !absoluteBootstrapDone;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(settings)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      {!fontsReady ? (
        <View style={[styles.blocker, { backgroundColor: Colors.background }]}>
          <ActivityIndicator size="large" color={Colors.textPrimary} />
        </View>
      ) : showProfileErrorScreen ? (
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
      ) : booting ? (
        <View style={[styles.blocker, { backgroundColor: Colors.background }]}>
          <ActivityIndicator size="large" color={Colors.textPrimary} />
        </View>
      ) : null}
      {__DEV__ && absoluteBootstrapDone && user && profileError ? (
        <View
          style={[styles.devBanner, { borderTopColor: Colors.textTertiary, backgroundColor: Colors.background }]}
          pointerEvents="none"
        >
          <Text style={[styles.devBannerText, { color: Colors.textSecondary }]}>
            [Dev] Bootstrap absolute failsafe — profile listener: {String(profileError)}
          </Text>
        </View>
      ) : null}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </View>
  );
}

function RootContent({ fontsReady }) {
  useEffect(() => {
    bootLog('app boot: RootContent mounted (auth + onboarding nav + gate)');
  }, []);

  return (
    <AuthProvider>
      <UserProfileProvider>
        <OnboardingNavProvider>
          <AppearancePreferenceSync />
          <NavigationGate fontsReady={fontsReady} />
        </OnboardingNavProvider>
      </UserProfileProvider>
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
  devBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 1000,
  },
  devBannerText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium' },
});

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    bootStage('shell', 'RootLayout mounted');
  }, []);

  useEffect(() => {
    flowLog('APP_BOOT_START', { scope: 'RootLayout' });
  }, []);

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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      bootLog('app boot: fonts ready', fontError ? 'fontError' : 'ok');
    }
  }, [fontsLoaded, fontError]);

  const fontsReady = fontsLoaded || !!fontError;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BootErrorBoundary>
        <ThemeProvider>
          <RootContent fontsReady={fontsReady} />
        </ThemeProvider>
      </BootErrorBoundary>
    </GestureHandlerRootView>
  );
}
