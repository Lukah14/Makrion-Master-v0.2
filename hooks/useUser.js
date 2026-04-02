import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getUserDocument,
  updateUserProfile,
  updateUserGoals,
  updateUserPreferences,
} from '@/services/userService';

export function useUser() {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setUserData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    getUserDocument(user.uid)
      .then((data) => {
        setUserData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [user]);

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

  return { userData, loading, error, saveProfile, saveGoals, savePreferences };
}
