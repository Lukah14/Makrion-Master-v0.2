import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getActivitiesByDate,
  addActivity,
  updateActivity,
  deleteActivity,
} from '@/services/activityService2';

/**
 * @param {string} dateKey
 */
export function useActivities(dateKey) {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user || !dateKey) { setActivities([]); setLoading(false); return; }
    setLoading(true);
    try {
      const list = await getActivitiesByDate(user.uid, dateKey);
      setActivities(list);
    } catch (err) {
      setActivities([]);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [user, dateKey]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (data) => {
    if (!user?.uid) throw new Error('You must be signed in to save activities.');
    const id = await addActivity(user.uid, { ...data, dateKey });
    const newAct = { id, ...data, dateKey };
    setActivities((prev) => [...prev, newAct]);
    return id;
  }, [user, dateKey]);

  const edit = useCallback(async (activityId, changes) => {
    if (!user?.uid) throw new Error('You must be signed in to update activities.');
    await updateActivity(user.uid, activityId, changes);
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, ...changes } : a)),
    );
  }, [user]);

  const remove = useCallback(async (activityId) => {
    if (!user?.uid) throw new Error('You must be signed in to delete activities.');
    await deleteActivity(user.uid, activityId);
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
  }, [user]);

  return { activities, loading, error, add, edit, remove, reload: load };
}
