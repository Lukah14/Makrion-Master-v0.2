import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Water logs (users/{uid}/waterLogs/{date}) ─────────────────────────────────

function waterRef(uid, date) {
  return doc(db, 'users', uid, 'waterLogs', date);
}

export async function getWaterLog(uid, date) {
  const snap = await getDoc(waterRef(uid, date));
  return snap.exists() ? snap.data() : { glasses: 0, totalMl: 0 };
}

export async function setWaterLog(uid, date, glasses, totalMl) {
  await setDoc(
    waterRef(uid, date),
    { glasses, totalMl, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function addWaterGlass(uid, date, mlPerGlass = 250) {
  const current = await getWaterLog(uid, date);
  const newGlasses = (current.glasses || 0) + 1;
  const newTotal = (current.totalMl || 0) + mlPerGlass;
  await setWaterLog(uid, date, newGlasses, newTotal);
  return { glasses: newGlasses, totalMl: newTotal };
}

export async function removeWaterGlass(uid, date, mlPerGlass = 250) {
  const current = await getWaterLog(uid, date);
  const newGlasses = Math.max(0, (current.glasses || 0) - 1);
  const newTotal = Math.max(0, (current.totalMl || 0) - mlPerGlass);
  await setWaterLog(uid, date, newGlasses, newTotal);
  return { glasses: newGlasses, totalMl: newTotal };
}
