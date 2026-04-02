import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getWaterLog,
  addWaterGlass,
  removeWaterGlass,
  setWaterLog,
} from '@/services/waterService';

export function useWater(date) {
  const { user } = useAuth();
  const [waterData, setWaterData] = useState({ glasses: 0, totalMl: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !date) return;
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
    const totalMl = glasses * mlPerGlass;
    await setWaterLog(user.uid, date, glasses, totalMl);
    setWaterData({ glasses, totalMl });
  }

  return { waterData, loading, addGlass, removeGlass, setGlasses, reload: load };
}
