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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, dateKey]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (data) => {
    if (!user) throw new Error('Not authenticated');
    const id = await addActivity(user.uid, { ...data, dateKey });
    const newAct = { id, ...data, dateKey };
    setActivities((prev) => [...prev, newAct]);
    return id;
  }, [user, dateKey]);

  const edit = useCallback(async (activityId, changes) => {
    if (!user) return;
    await updateActivity(user.uid, activityId, changes);
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, ...changes } : a)),
    );
  }, [user]);

  const remove = useCallback(async (activityId) => {
    if (!user) return;
    await deleteActivity(user.uid, activityId);
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
  }, [user]);

  return { activities, loading, error, add, edit, remove, reload: load };
}
