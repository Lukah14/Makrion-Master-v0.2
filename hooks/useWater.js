import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getWaterLog,
  addWaterGlass,
  removeWaterGlass,
  setWaterLog,
  setWaterGoalMl,
} from '@/services/waterService';

export function useWater(date) {
  const { user } = useAuth();
  const [waterData, setWaterData] = useState({
    glasses: 0,
    totalMl: 0,
    consumedMl: 0,
    goalMl: null,
    userId: null,
    date: null,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !date) {
      setWaterData({
        glasses: 0,
        totalMl: 0,
        consumedMl: 0,
        goalMl: null,
        userId: null,
        date: null,
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getWaterLog(user.uid, date);
      setWaterData(data);
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  useEffect(() => {
    load();
  }, [load]);

  async function addGlass(mlPerGlass = 250) {
    if (!user) return;
    const updated = await addWaterGlass(user.uid, date, mlPerGlass);
    setWaterData(updated);
  }

  async function removeGlass(mlPerGlass = 250) {
    if (!user) return;
    const updated = await removeWaterGlass(user.uid, date, mlPerGlass);
    setWaterData(updated);
  }

  async function setGlasses(glasses, mlPerGlass = 250) {
    if (!user) return;
    const totalMl = Math.max(0, Number(glasses) || 0) * mlPerGlass;
    const updated = await setWaterLog(user.uid, date, glasses, totalMl);
    setWaterData(updated);
  }

  async function updateGoalMl(goalMl) {
    if (!user) return;
    const updated = await setWaterGoalMl(user.uid, date, goalMl);
    setWaterData(updated);
  }

  return {
    waterData,
    loading,
    addGlass,
    removeGlass,
    setGlasses,
    updateGoalMl,
    reload: load,
  };
}
