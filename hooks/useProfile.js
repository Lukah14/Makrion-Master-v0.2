import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
} from '@/services/profileService';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    try {
      let p = await getUserProfile(user.uid);
      if (!p) {
        await createUserProfile(user);
        p = await getUserProfile(user.uid);
      }
      setProfile(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const update = useCallback(async (data) => {
    if (!user) return;
    await updateUserProfile(user.uid, data);
    setProfile((prev) => ({ ...prev, ...data }));
  }, [user]);

  return { profile, loading, error, update, reload: load };
}
