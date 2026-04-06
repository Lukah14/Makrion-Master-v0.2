import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  updateUserProfile,
  updateUserGoals,
  updateUserPreferences,
  patchUserDocument,
  syncProfilesFromUserDoc,
} from '@/services/userService';
import { mergeMainHealthProfile } from '@/services/userHealthProfileService';

export function useUser() {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setUserData(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setUserData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message || String(err));
        setLoading(false);
      },
    );
    return unsub;
  }, [user?.uid]);

  async function saveProfile(profileData) {
    if (!user) return;
    await updateUserProfile(user.uid, profileData);
    setUserData((prev) => ({ ...prev, profile: profileData }));
  }

  async function saveGoals(goals) {
    if (!user) return;
    await updateUserGoals(user.uid, goals);
    setUserData((prev) => ({ ...prev, goals }));
  }

  async function savePreferences(preferences) {
    if (!user) return;
    await updateUserPreferences(user.uid, preferences);
    setUserData((prev) => ({ ...prev, preferences }));
  }

  /**
   * Partial update to users/{uid}, optional profile/main merge, then profiles/{uid} mirror.
   */
  async function patchUser(partial, mainProfileMerge = null) {
    if (!user) return;
    await patchUserDocument(user.uid, partial);
    if (mainProfileMerge && typeof mainProfileMerge === 'object') {
      await mergeMainHealthProfile(user.uid, mainProfileMerge);
    }
    await syncProfilesFromUserDoc(user.uid);
  }

  return { userData, loading, error, saveProfile, saveGoals, savePreferences, patchUser };
}
