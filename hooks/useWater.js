import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getWaterLog,
  addWaterGlass,
  removeWaterGlass,
  setWaterLog,
  setWaterGoalMl,
  adjustWaterMl,
  subscribeWaterLog,
} from '@/services/waterService';

const emptyWater = {
  glasses: 0,
  totalMl: 0,
  consumedMl: 0,
  goalMl: null,
  userId: null,
  date: null,
};

export function useWater(date) {
  const { user } = useAuth();
  const [waterData, setWaterData] = useState(emptyWater);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !date) {
      setWaterData(emptyWater);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const unsub = subscribeWaterLog(
      user.uid,
      date,
      (data) => {
        setWaterData(data);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user?.uid, date]);

  const addGlass = useCallback(
    async (mlPerGlass = 250) => {
      if (!user) return;
      const updated = await addWaterGlass(user.uid, date, mlPerGlass);
      setWaterData(updated);
    },
    [user, date],
  );

  const removeGlass = useCallback(
    async (mlPerGlass = 250) => {
      if (!user) return;
      const updated = await removeWaterGlass(user.uid, date, mlPerGlass);
      setWaterData(updated);
    },
    [user, date],
  );

  const setGlasses = useCallback(
    async (glasses, mlPerGlass = 250) => {
      if (!user) return;
      const totalMl = Math.max(0, Number(glasses) || 0) * mlPerGlass;
      const updated = await setWaterLog(user.uid, date, glasses, totalMl);
      setWaterData(updated);
    },
    [user, date],
  );

  const updateGoalMl = useCallback(
    async (goalMl) => {
      if (!user) return;
      const updated = await setWaterGoalMl(user.uid, date, goalMl);
      setWaterData(updated);
    },
    [user, date],
  );

  /** Delta in ml (negative allowed; clamped at 0 total). */
  const adjustMl = useCallback(
    async (deltaMl) => {
      if (!user) return;
      const updated = await adjustWaterMl(user.uid, date, deltaMl);
      setWaterData(updated);
    },
    [user, date],
  );

  const reload = useCallback(async () => {
    if (!user || !date) return;
    const data = await getWaterLog(user.uid, date);
    setWaterData(data);
  }, [user, date]);

  return {
    waterData,
    loading,
    addGlass,
    removeGlass,
    setGlasses,
    updateGoalMl,
    adjustMl,
    reload,
  };
}
