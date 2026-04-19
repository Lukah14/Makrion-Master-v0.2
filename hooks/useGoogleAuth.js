import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ensureGoogleUserDocument } from '@/services/userService';

/**
 * Expo Go has no custom native modules — never `import '@react-native-google-signin/google-signin'`
 * at file scope or Metro loads RNGoogleSignin and crashes before any hook runs.
 */
function isExpoGo() {
  return (
    Constants.appOwnership === 'expo'
    || Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

function getWebClientId() {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? null;
}

/**
 * Native (dev build / release): lazy `import()` → Google Sign-In → id token → Firebase.
 * Web: Firebase `signInWithPopup`.
 *
 * After Firebase sign-in, `ensureGoogleUserDocument` runs; root `AuthContext` routes onboarding vs app.
 */
export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const webClientId = getWebClientId();

  const promptGoogleSignIn = useCallback(async () => {
    if (!webClientId) {
      setError(
        'Google sign-in is not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to .env and rebuild.',
      );
      return;
    }

    setError(null);
    setLoading(true);
    console.log('[GOOGLE_SIGN_IN_START]');

    /** Set only after successful dynamic import of the native module (for catch-time status code checks). */
    let googleMod = null;

    try {
      if (Platform.OS !== 'web' && isExpoGo()) {
        setError(
          'Google Sign-In needs a development build (not Expo Go). Run: eas build --profile development --platform android',
        );
        console.log('[FIREBASE_SIGNIN_FAILED]', 'expo_go_no_native_google_signin');
        return;
      }

      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        console.log('[GOOGLE_SIGN_IN_SUCCESS]');
        const idToken = await result.user.getIdToken();
        console.log('[GOOGLE_ID_TOKEN_EXISTS]', Boolean(idToken));
        const cred = GoogleAuthProvider.credentialFromResult(result);
        console.log('[FIREBASE_CREDENTIAL_CREATED]', Boolean(cred));
        console.log('[FIREBASE_SIGNIN_SUCCESS]', result.user.uid);
        await ensureGoogleUserDocument(result.user);
        return;
      }

      googleMod = await import('@react-native-google-signin/google-signin');
      const { GoogleSignin, statusCodes } = googleMod;

      GoogleSignin.configure({
        webClientId,
        offlineAccess: false,
      });

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (response.type === 'cancelled') {
        console.log('[GOOGLE_SIGN_IN_CANCELLED]');
        return;
      }

      console.log('[GOOGLE_SIGN_IN_SUCCESS]');

      const tokens = await GoogleSignin.getTokens();
      const idToken = tokens?.idToken;
      console.log('[GOOGLE_ID_TOKEN_EXISTS]', Boolean(idToken));

      if (!idToken) {
        throw new Error('No ID token from Google Sign-In. Check Web client ID in Firebase Console.');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      console.log('[FIREBASE_CREDENTIAL_CREATED]', Boolean(credential));

      const firebaseResult = await signInWithCredential(auth, credential);
      console.log('[FIREBASE_SIGNIN_SUCCESS]', firebaseResult.user.uid);

      await ensureGoogleUserDocument(firebaseResult.user);
    } catch (err) {
      const sc = googleMod?.statusCodes;

      if (sc && err?.code === sc.SIGN_IN_CANCELLED) {
        console.log('[GOOGLE_SIGN_IN_CANCELLED]');
        return;
      }
      if (sc && err?.code === sc.IN_PROGRESS) {
        setError('Sign-in already in progress. Try again in a moment.');
        console.log('[FIREBASE_SIGNIN_FAILED]', err?.code, err?.message);
        return;
      }
      if (sc && err?.code === sc.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available or outdated.');
        console.log('[FIREBASE_SIGNIN_FAILED]', err?.code, err?.message);
        return;
      }

      console.log('[FIREBASE_SIGNIN_FAILED]', err?.code || err?.message, err?.message);

      if (err?.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email using a different sign-in method.');
      } else if (err?.code === 'auth/network-request-failed') {
        setError('Network error. Check your internet connection and try again.');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        /* web cancel */
      } else {
        setError(err?.message || 'Something went wrong with Google sign-in.');
      }
    } finally {
      setLoading(false);
    }
  }, [webClientId]);

  return {
    promptGoogleSignIn,
    googleAuthLoading: loading,
    googleAuthError: error,
    isGoogleReady: Boolean(webClientId),
  };
}
