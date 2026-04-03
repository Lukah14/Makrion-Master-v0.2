import { getApp, getApps, initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBn-pKYqTyRp0xMcWAk58D6mPqnkwZOrKQ",
  authDomain: "macro-lukica.firebaseapp.com",
  projectId: "macro-lukica",
  storageBucket: "macro-lukica.firebasestorage.app",
  messagingSenderId: "948141985962",
  appId: "1:948141985962:web:264ddc41dc148ff99780d3",
  measurementId: "G-KTHKZNS0RZ"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };