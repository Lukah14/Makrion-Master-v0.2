import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchCalendarMonthMetadata } from '@/services/calendarMetadataService';

const CAL_META_COLD_START_MS = 900;

/**
 * @param {number} year
 * @param {number} monthIndex 0-11
 * @param {number} refreshKey bump to refetch after user logs data
 */
export function useCalendarMonthMetadata(year, monthIndex, refreshKey = 0) {
  const { user } = useAuth();
  const coldStartPendingRef = useRef(true);
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
    if (!user) {
      coldStartPendingRef.current = true;
      void load();
      return undefined;
    }
    if (!coldStartPendingRef.current) {
      void load();
      return undefined;
    }
    const t = setTimeout(() => {
      coldStartPendingRef.current = false;
      void load();
    }, CAL_META_COLD_START_MS);
    return () => clearTimeout(t);
  }, [load, user]);

  return { meta, loading, error, reload: load };
}
