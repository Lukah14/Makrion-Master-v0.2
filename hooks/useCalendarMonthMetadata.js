import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchCalendarMonthMetadata } from '@/services/calendarMetadataService';

/**
 * @param {number} year
 * @param {number} monthIndex 0-11
 * @param {number} refreshKey bump to refetch after user logs data
 */
export function useCalendarMonthMetadata(year, monthIndex, refreshKey = 0) {
  const { user } = useAuth();
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) {
      setMeta({});
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCalendarMonthMetadata(user.uid, year, monthIndex);
      setMeta(data);
    } catch (e) {
      setError(e?.message || 'Calendar data failed to load');
      setMeta({});
    } finally {
      setLoading(false);
    }
  }, [user?.uid, year, monthIndex, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { meta, loading, error, reload: load };
}
